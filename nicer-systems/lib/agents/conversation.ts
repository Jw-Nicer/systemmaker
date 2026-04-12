/**
 * Conversation Agent — multi-phase intake conversation with memory.
 *
 * Uses shared LLM client (llm-client.ts) for all model calls, safety module
 * for output guardrails, tracing for observability, and memory for returning
 * visitor context.
 */
import type {
  ConversationPhase,
  ChatMessage,
  ExtractedIntake,
  PlanSectionType,
} from "@/types/chat";
import type { PreviewPlan } from "@/types/preview-plan";
import {
  invokeLLM,
  invokeLLMChatStreaming,
  getFastModel,
  getPrimaryModel,
  isTransientError,
  type ChatTurn,
  type ChatGenerationConfig,
} from "./llm-client";
import { enforceTextSafety } from "./safety";
import { createTrace, startSpan, endSpan } from "./tracing";
import { getCachedIndustryProbings } from "@/lib/firestore/industry-probing";
import { getSharedRulesForPhase } from "./conversation-rules";
// MemoryContext type and buildMemoryPromptSection are inlined here
// to avoid importing memory.ts (which pulls in firebase-admin via
// dynamic import — breaks client component bundling).
// The actual memory operations (recallVisitorContext, storeMemory)
// are imported only in server-side route handlers.

export interface MemoryContext {
  isReturningVisitor: boolean;
  contextSummary: string;
  preFilled: {
    industry?: string;
    bottleneck?: string;
    current_tools?: string;
  };
}

function buildMemoryPromptSection(context: MemoryContext): string {
  if (!context.isReturningVisitor || !context.contextSummary) return "";

  return `
---
## Returning visitor context (from agent memory)
${context.contextSummary}

Use this context to personalize your response:
- Greet them by name if known
- Reference their industry without re-asking
- Acknowledge their previous plan if they generated one
- Pre-fill fields you already know (but confirm they're still accurate)
- Do NOT repeat questions about information you already have
---`;
}

const REQUIRED_FIELDS: (keyof ExtractedIntake)[] = [
  "industry",
  "bottleneck",
  "current_tools",
];

const MAX_CONTEXT_MESSAGES = 20;
const MAX_FIELD_LENGTH = 2000;
const MAX_RESPONSE_LENGTH = 10_000; // Max chars for a single conversational response

// ---------------------------------------------------------------------------
// Industry probing — contextual follow-ups per industry
// ---------------------------------------------------------------------------

interface IndustryProbing {
  common_bottlenecks: string[];
  common_tools: string[];
  probing_angles: string[];
}

/**
 * Hardcoded fallback used when the Firestore `industry_probing` collection
 * is empty, unreachable, or not yet warmed up. The Firestore version
 * (when available) takes precedence — see getIndustryProbing() below.
 */
const INDUSTRY_PROBING_FALLBACK: Record<string, IndustryProbing> = {
  construction: {
    common_bottlenecks: ["field crew scheduling and dispatch", "job costing and change order tracking", "permit and inspection tracking", "subcontractor coordination", "daily log and progress reporting"],
    common_tools: ["Procore", "Buildertrend", "CoConstruct", "QuickBooks", "spreadsheets", "text/WhatsApp groups"],
    probing_angles: ["How do you track jobs from estimate to closeout?", "Where does info get lost between field and office?", "How do change orders flow through your process?"],
  },
  healthcare: {
    common_bottlenecks: ["patient intake and paperwork", "appointment scheduling and no-shows", "insurance verification and prior auth", "referral tracking", "compliance documentation"],
    common_tools: ["Epic", "Athenahealth", "DrChrono", "SimplePractice", "fax machines", "paper forms"],
    probing_angles: ["What happens between a patient calling in and being seen?", "Where does staff spend the most time on admin?", "How do referrals get tracked once they leave your office?"],
  },
  "property management": {
    common_bottlenecks: ["tenant communication and requests", "maintenance work order tracking", "lease renewal management", "rent collection follow-up", "vendor coordination for repairs"],
    common_tools: ["AppFolio", "Buildium", "Rent Manager", "Yardi", "spreadsheets", "email"],
    probing_angles: ["How do maintenance requests flow from tenant to vendor to completion?", "What happens when a lease is approaching renewal?", "Where do work orders get stuck or lost?"],
  },
  staffing: {
    common_bottlenecks: ["candidate sourcing and screening", "timesheet collection and approval", "client job order management", "onboarding documentation", "payroll reconciliation"],
    common_tools: ["Bullhorn", "JobDiva", "Avionté", "spreadsheets", "email"],
    probing_angles: ["What does your process look like from job order to placement?", "How do timesheets get collected, approved, and sent to payroll?", "Where do candidates fall through the cracks?"],
  },
  legal: {
    common_bottlenecks: ["client intake and conflict checks", "document review and drafting", "billing and time tracking", "deadline and statute tracking", "case file organization"],
    common_tools: ["Clio", "MyCase", "PracticePanther", "NetDocuments", "Outlook", "Excel"],
    probing_angles: ["What does new client intake look like end to end?", "How do attorneys track deadlines and key dates?", "Where does time tracking break down?"],
  },
  "home services": {
    common_bottlenecks: ["dispatching and routing", "estimate-to-invoice workflow", "customer follow-up after service", "parts and inventory tracking", "review and referral collection"],
    common_tools: ["ServiceTitan", "Housecall Pro", "Jobber", "QuickBooks", "paper invoices"],
    probing_angles: ["How does a job move from the call to completion?", "What happens between finishing a job and getting paid?", "How do you handle callbacks or warranty work?"],
  },
  logistics: {
    common_bottlenecks: ["dispatch and route optimization", "proof of delivery tracking", "driver communication", "load planning and dock scheduling", "invoice reconciliation"],
    common_tools: ["TMS software", "spreadsheets", "WhatsApp groups", "QuickBooks", "EDI systems"],
    probing_angles: ["How do loads get assigned to drivers today?", "What visibility do you have once a truck leaves the yard?", "Where do billing disputes come from?"],
  },
  dental: {
    common_bottlenecks: ["patient scheduling and recall", "insurance verification", "treatment plan follow-up", "front desk workflow", "new patient onboarding"],
    common_tools: ["Dentrix", "Eaglesoft", "Open Dental", "Weave", "paper charts"],
    probing_angles: ["What does your new patient flow look like from first call to first appointment?", "How do you handle treatment plan acceptance and follow-up?", "Where does insurance verification slow things down?"],
  },
};

const INDUSTRY_ALIASES_FALLBACK: Record<string, string> = {
  plumbing: "home services", hvac: "home services", electrical: "home services",
  landscaping: "home services", roofing: "home services", "pest control": "home services",
  cleaning: "home services", "auto repair": "home services", salon: "home services", spa: "home services",
  trucking: "logistics", distribution: "logistics", wholesale: "logistics",
  moving: "logistics", storage: "logistics",
  "real estate": "property management",
  medical: "healthcare", "senior care": "healthcare", veterinary: "healthcare",
  fitness: "healthcare", childcare: "healthcare",
};

/**
 * Resolve a visitor's stated industry into a probing context.
 *
 * Lookup order:
 *  1. Firestore cached snapshot (preferred — admin-managed, can grow without redeploys)
 *  2. Hardcoded fallback constants below (safety net for empty/cold cache)
 *
 * The Firestore cache is warmed asynchronously via
 * getIndustryProbingsFromFirestore() — call it once at the top of the
 * chat route handler so this sync lookup has data on the first turn.
 */
function getIndustryProbing(industry: string): IndustryProbing | undefined {
  const lower = industry.toLowerCase().trim();
  if (!lower) return undefined;

  // Branch 1: Firestore snapshot (preferred)
  const snapshot = getCachedIndustryProbings();
  if (snapshot) {
    const direct = snapshot.byKey.get(lower);
    if (direct) {
      return {
        common_bottlenecks: direct.common_bottlenecks ?? [],
        common_tools: direct.common_tools ?? [],
        probing_angles: direct.probing_angles ?? [],
      };
    }
    const aliased = snapshot.byAlias.get(lower);
    if (aliased) {
      const target = snapshot.byKey.get(aliased);
      if (target) {
        return {
          common_bottlenecks: target.common_bottlenecks ?? [],
          common_tools: target.common_tools ?? [],
          probing_angles: target.probing_angles ?? [],
        };
      }
    }
  }

  // Branch 2: Hardcoded fallback
  if (INDUSTRY_PROBING_FALLBACK[lower]) return INDUSTRY_PROBING_FALLBACK[lower];
  const alias = INDUSTRY_ALIASES_FALLBACK[lower];
  if (alias && INDUSTRY_PROBING_FALLBACK[alias]) return INDUSTRY_PROBING_FALLBACK[alias];

  return undefined;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Trim history to last N messages to keep context manageable. */
function trimHistory(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= MAX_CONTEXT_MESSAGES) return messages;
  return messages.slice(-MAX_CONTEXT_MESSAGES);
}

/**
 * Convert conversation history into Gemini's structured ChatTurn[] format.
 *
 * - Trims to MAX_CONTEXT_MESSAGES sliding window
 * - Drops empty messages (e.g., extraction-update sentinels)
 * - Drops system/role messages — only user + assistant survive
 * - Maps assistant → "model" (Gemini's role name)
 * - Skips any leading model turn (Gemini requires the first turn to be user)
 * - Coalesces consecutive same-role turns into one (Gemini rejects repeats)
 *
 * Exported for unit testing.
 */
export function buildChatTurns(messages: ChatMessage[]): ChatTurn[] {
  const trimmed = trimHistory(messages);
  const turns: ChatTurn[] = [];

  for (const m of trimmed) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const text = m.content?.trim();
    if (!text) continue;
    const role: "user" | "model" = m.role === "user" ? "user" : "model";

    // Skip a leading model turn — Gemini requires first turn = user.
    if (turns.length === 0 && role === "model") continue;

    // Coalesce consecutive same-role turns.
    const last = turns[turns.length - 1];
    if (last && last.role === role) {
      last.text = `${last.text}\n\n${text}`;
      continue;
    }

    turns.push({ role, text });
  }

  return turns;
}

/**
 * Append the latest visitor message as a final user turn.
 *
 * If the previous turn was already user (e.g., the message was already in
 * history), coalesce; otherwise push a new turn.
 *
 * Exported for unit testing.
 */
export function appendUserTurn(turns: ChatTurn[], userMessage: string): ChatTurn[] {
  const text = userMessage?.trim();
  if (!text) return turns;
  const next = [...turns];
  const last = next[next.length - 1];
  if (last && last.role === "user") {
    // The latest message is already the tail of history — replace, don't dup.
    if (last.text === text) return next;
    next[next.length - 1] = { role: "user", text };
  } else {
    next.push({ role: "user", text });
  }
  return next;
}

/** Conversation prompt payload returned by each phase builder. */
interface ConversationPrompt {
  systemInstruction: string;
  contents: ChatTurn[];
  generationConfig: ChatGenerationConfig;
}

// Per-phase generation tuning. Lower temperature on intake to keep the
// agent on-brand and concise; higher token cap on follow-up since plan Q&A
// legitimately needs more room.
const GEN_CONFIG: Record<"gathering" | "confirming" | "follow_up", ChatGenerationConfig> = {
  gathering: {
    temperature: 0.55,
    topP: 0.9,
    maxOutputTokens: 220,
    stopSequences: ["Visitor:", "\nVisitor:", "Agent:", "\nAgent:"],
  },
  confirming: {
    temperature: 0.55,
    topP: 0.9,
    maxOutputTokens: 260,
    stopSequences: ["Visitor:", "\nVisitor:", "Agent:", "\nAgent:"],
  },
  follow_up: {
    temperature: 0.6,
    topP: 0.92,
    maxOutputTokens: 480,
    stopSequences: ["Visitor:", "\nVisitor:", "Agent:", "\nAgent:"],
  },
};

function cleanField(value: string, max = MAX_FIELD_LENGTH): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

/**
 * Compare two ExtractedIntake snapshots and return true if any field differs.
 *
 * Used by the chat route to skip emitting `is_extraction_update` SSE events
 * when extraction produced no actual change. The previous behavior echoed
 * the full extracted state every gathering turn regardless of whether
 * anything changed, which wasted bandwidth and forced an unnecessary
 * dispatch + re-render on the client.
 *
 * Field set is the union of all known ExtractedIntake keys. Empty string
 * and undefined are treated as equivalent.
 */
export function extractedHasChanges(
  before: ExtractedIntake,
  after: ExtractedIntake
): boolean {
  const fields: (keyof ExtractedIntake)[] = [
    "industry",
    "bottleneck",
    "current_tools",
    "urgency",
    "volume",
    "email",
    "name",
  ];
  for (const f of fields) {
    const a = before[f] ?? "";
    const b = after[f] ?? "";
    if (a !== b) return true;
  }
  return false;
}

function mergeExtractedIntake(
  existing: ExtractedIntake,
  incoming: Partial<ExtractedIntake>
): ExtractedIntake {
  return {
    industry: incoming.industry ? cleanField(incoming.industry, 200) : existing.industry,
    bottleneck: incoming.bottleneck ? cleanField(incoming.bottleneck, 2000) : existing.bottleneck,
    current_tools: incoming.current_tools ? cleanField(incoming.current_tools, 500) : existing.current_tools,
    urgency: incoming.urgency ?? existing.urgency,
    volume: incoming.volume ? cleanField(incoming.volume, 200) : existing.volume,
    email: incoming.email ? cleanField(incoming.email, 200) : existing.email,
    name: incoming.name ? cleanField(incoming.name, 100) : existing.name,
  };
}

export function hasRevisionSignal(message: string): boolean {
  return (
    /\b(no|nope|wait|hold on|hold up|stop)\b/i.test(message) ||
    /\b(change|wrong|incorrect|not quite|not exactly)\b/i.test(message) ||
    /\bactually\b.{0,40}\b(we|i)\s+(?:are|run|use|have|work with)\b/i.test(message)
  );
}

function inferUrgency(message: string): ExtractedIntake["urgency"] | undefined {
  if (/\b(urgent|asap|immediately|right away|right now)\b/i.test(message)) return "urgent";
  if (/\b(high priority|soon|quickly|this month|blocking us)\b/i.test(message)) return "high";
  if (/\b(this quarter|planning|moderate)\b/i.test(message)) return "medium";
  if (/\b(exploring|eventually|later|low priority)\b/i.test(message)) return "low";
  return undefined;
}

function inferVolume(message: string): string | undefined {
  const match = message.match(
    /\b(\d[\d,]*(?:\s*(?:\+|plus))?\s*(?:orders?|requests?|deliveries?|tickets?|jobs?|patients?|clients?|leads?|tenants?|cases?|invoices?)\s*(?:\/|per)?\s*(?:day|week|month)?)\b/i
  );
  return match ? cleanField(match[1], 200) : undefined;
}

function inferCurrentTools(message: string): string | undefined {
  const match = message.match(
    /\b(?:we use|we currently use|currently use|current tools(?: are| include)?|tools(?: are| include)?|our stack(?: is| includes)?|we work with)\s+([^.!?\n]+)/i
  );
  if (!match) return undefined;
  return cleanField(match[1], 500);
}

// Words that disqualify an industry capture if they appear in the captured
// fragment — e.g., "we're using HubSpot" would otherwise extract "using
// HubSpot" as an "industry".
const INDUSTRY_NEGATIVE_RE =
  /\b(use|using|problem|bottleneck|manual|urgent|currently|tool|stack)\b/i;

function inferIndustry(message: string): string | undefined {
  // Branch 1: Explicit "I run a ..." / "we are in ..." patterns
  const explicitMatch = message.match(
    /\b(?:i run|we run|i own|we own|i'm in|i am in|my company is|our business is|we're in|we are in)\s+(?:a|an)?\s*([^,.!\n]{2,80})/i
  );
  if (explicitMatch) {
    const value = explicitMatch[1]
      .replace(/\b(company|business|firm|team|shop|agency)\b/gi, "")
      .trim();
    if (value && !INDUSTRY_NEGATIVE_RE.test(value)) {
      return cleanField(value, 200);
    }
  }

  // Branch 2: Conversational opener with optional sizing prefix —
  // e.g., "we're a 30-person property management shop", "I'm a small
  // healthcare clinic", "we are a mid-sized construction company".
  // Captures the industry name between an optional size descriptor and a
  // recognizable business-suffix word.
  const sizedMatch = message.match(
    /\b(?:we're|we are|i'm|i am)\s+(?:a|an|the)?\s*(?:(?:\d+[-\s]?(?:person|man|seat|employee|sized?)|small|tiny|large|big|mid[-\s]?sized?|growing|young|new)\s+)?([a-z][a-z\s&-]{2,40}?)\s+(?:shop|company|firm|business|operation|team|agency|practice|clinic|office|outfit|startup|consultancy)\b/i
  );
  if (sizedMatch) {
    const value = sizedMatch[1].trim();
    if (value && !INDUSTRY_NEGATIVE_RE.test(value)) {
      return cleanField(value, 200);
    }
  }

  // Branch 3: Bare industry names (common when the user just types the industry)
  const knownIndustries = /^(construction|healthcare|real estate|legal|logistics|staffing|wholesale|distribution|dental|plumbing|hvac|electrical|property management|home services|landscaping|roofing|accounting|insurance|manufacturing|retail|restaurants?|hospitality|trucking|cleaning|pest control|moving|storage|auto repair|veterinary|childcare|senior care|medical|fitness|salon|spa|consulting)\b/i;
  const bareMatch = message.trim().match(knownIndustries);
  if (bareMatch) return cleanField(bareMatch[0], 200);

  return undefined;
}

function inferBottleneck(message: string): string | undefined {
  // Branch 1: Explicit "bottleneck is X" / "biggest problem is X" patterns
  const explicitMatch = message.match(
    /\b(?:bottleneck|problem|pain point|biggest issue|biggest problem|main issue|main problem|struggle|struggling with)\s*(?:is|:)?\s*([^.!?\n]+(?:[.!?]\s*[^.!?\n]+)*)/i
  );
  if (explicitMatch) {
    return cleanField(explicitMatch[1], 2000);
  }

  // Branch 2: Conversational descriptions of workflow problems.
  // Tightened: requires BOTH a problem-pattern AND a problem-keyword. The
  // previous version fired on (pattern OR (length>50 AND keyword)), which
  // over-fired on long messages that mentioned a keyword in passing
  // (e.g., "I'd love to learn how the manual review process works for new
  // client onboarding"). Demanding both signals dramatically reduces false
  // positives without losing the natural-language descriptions we want.
  const problemPatterns = /\b(?:we're dealing with|we are dealing with|we keep hitting|the process is|our workflow is|things get stuck|we lose time|we get delayed|takes too long|too much time|waste time|drop the ball|fall through the cracks|no visibility|can't track|hard to track)\b/i;
  const problemKeywords = /\b(manual|spreadsheet|slow|delay|rework|double[- ]entry|follow[- ]up|handoff|chasing|bottleneck|stuck|missed|error|backlog|paperwork|disconnected|scattered|chaotic|messy|broken)\b/i;

  if (problemPatterns.test(message) && problemKeywords.test(message)) {
    return cleanField(message, 2000);
  }

  return undefined;
}

function inferEmail(message: string): string | undefined {
  const match = message.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
  return match ? match[1].toLowerCase().trim() : undefined;
}

export function extractHeuristicIntakeData(message: string): Partial<ExtractedIntake> {
  return {
    industry: inferIndustry(message),
    bottleneck: inferBottleneck(message),
    current_tools: inferCurrentTools(message),
    urgency: inferUrgency(message),
    volume: inferVolume(message),
    email: inferEmail(message),
  };
}

// ---------------------------------------------------------------------------
// Extraction confidence (3D)
// ---------------------------------------------------------------------------

/**
 * Score how confident we are in the current extracted intake.
 *
 * Returns 0.0–1.0. A value below 0.7 means the confirming prompt should
 * explicitly invite corrections ("Did I get that right?").
 *
 * Factors:
 * - 0.33 per required field present (industry, bottleneck, current_tools)
 * - Penalty when a field is suspiciously short (< 3 chars industry,
 *   < 10 chars bottleneck) — suggests a vague capture
 * - Small bonus when urgency or volume are also filled
 */
export function computeExtractionConfidence(
  extracted: ExtractedIntake
): number {
  let score = 0;

  // Industry
  if (extracted.industry && extracted.industry.trim().length > 0) {
    score += extracted.industry.trim().length >= 3 ? 0.33 : 0.15;
  }

  // Bottleneck
  if (extracted.bottleneck && extracted.bottleneck.trim().length > 0) {
    score += extracted.bottleneck.trim().length >= 10 ? 0.33 : 0.15;
  }

  // Current tools
  if (extracted.current_tools && extracted.current_tools.trim().length > 0) {
    score += 0.33;
  }

  // Bonus for optional fields (cap total at 1.0)
  if (extracted.urgency) score += 0.01;
  if (extracted.volume) score += 0.01;

  return Math.min(score, 1.0);
}

// ---------------------------------------------------------------------------
// Refinement intent detection (5C)
// ---------------------------------------------------------------------------

const REFINE_KEYWORDS =
  /\b(change|update|improve|refine|redo|fix|adjust|modify|revise|simplify|more detail|too vague|not quite|not right|different|instead|expand|shorten|rethink)\b/i;

const SECTION_HINTS: [RegExp, PlanSectionType][] = [
  [/\b(workflows?|stages?|handoffs?|process)\b/i, "workflow"],
  [/\b(automat\w*|triggers?|zapier|make\.com|n8n)\b/i, "automation"],
  [/\b(dashboards?|kpis?|metrics?|tracking)\b/i, "dashboard"],
  [/\b(alerts?|notifications?|escalat\w*)\b/i, "automation"],
  [/\b(roadmap|timeline|implementation|phases?|weeks?)\b/i, "implementation_sequencer"],
  [/\b(ops pulse|executive|summary|action items?|next steps?)\b/i, "ops_pulse"],
  [/\b(scope|intake|problem|bottleneck)\b/i, "intake"],
  [/\b(proposal|pitch|roi|engagement|value prop\w*)\b/i, "proposal_writer"],
];

export interface RefinementIntent {
  detected: boolean;
  sectionHint?: PlanSectionType;
  feedback?: string;
}

/**
 * Detect whether a user message in the follow_up phase expresses intent
 * to refine a specific plan section. Pure keyword matching — no LLM.
 */
export function detectRefinementIntent(message: string): RefinementIntent {
  if (!REFINE_KEYWORDS.test(message)) {
    return { detected: false };
  }

  // Try to extract which section the user is referring to
  for (const [pattern, sectionType] of SECTION_HINTS) {
    if (pattern.test(message)) {
      return {
        detected: true,
        sectionHint: sectionType,
        feedback: message,
      };
    }
  }

  // Refinement keyword present but no section hint → generic intent
  return {
    detected: true,
    feedback: message,
  };
}

// ---------------------------------------------------------------------------
// Phase detection
// ---------------------------------------------------------------------------

/** Determine what phase the conversation should be in. */
export function detectPhase(
  currentPhase: ConversationPhase,
  extracted: ExtractedIntake,
  lastUserMessage: string,
  messageCount = 0
): ConversationPhase {
  // Once building starts, it runs to completion — no going back
  if (currentPhase === "building") return "building";

  // After plan is complete, any new message is follow-up
  if (currentPhase === "complete" || currentPhase === "follow_up") {
    return "follow_up";
  }

  // If confirming and user affirms, move to building
  if (currentPhase === "confirming") {
    if (hasRevisionSignal(lastUserMessage)) return "gathering";
    const affirm = /\b(yes|yeah|yep|sure|go|ready|build|do it|let's go|looks good|correct|right|proceed|ok|okay|sounds good|that's right|that works|perfect|awesome|great|good|fine|absolutely|definitely|for sure)\b/i;
    if (affirm.test(lastUserMessage)) return "building";
    // Safety valve: auto-advance to building after 12+ total messages to prevent
    // confirming loops. By message 12 we have had at least 3-4 confirming rounds.
    if (messageCount > 12) return "building";
    // Anything else (clarifying questions, partial answers, hedging) keeps
    // the visitor in confirming so the agent can address it before building.
    return "confirming";
  }

  // Check if all required fields are filled
  const allCollected = REQUIRED_FIELDS.every((f) => {
    const val = extracted[f];
    return val !== undefined && val !== "";
  });

  if (allCollected) return "confirming";

  // Safety valve: if we've exchanged 8+ messages and have at least industry,
  // move to confirming to avoid infinite gathering loop.
  // The agent can fill in reasonable defaults for missing fields.
  const filledCount = REQUIRED_FIELDS.filter((f) => {
    const val = extracted[f];
    return val !== undefined && val !== "";
  }).length;
  if (messageCount >= 8 && filledCount >= 1) return "confirming";

  return "gathering";
}

/** Return the list of fields still missing. */
export function missingFields(extracted: ExtractedIntake): string[] {
  return REQUIRED_FIELDS.filter((f) => {
    const val = extracted[f];
    return val === undefined || val === "";
  });
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

const SYSTEM_IDENTITY = `You are the Nicer Systems AI consultant. You help American businesses automate admin-heavy workflows.
Your tone is clear, confident, practical, and business-friendly. No hype, no jargon. No filler phrases like "Great question" or "That's interesting."
You ask short, specific questions — one at a time. Keep responses to 2-3 sentences max during intake.
When someone gives a one-word or vague answer, ask a brief clarifying follow-up instead of moving on. When someone shares their industry, react with a relevant observation before asking the next question.`;

/**
 * Render a list of instruction strings as a numbered Markdown-style list.
 * Used to assemble phase-specific + shared rules into the prompt's
 * `## Instructions` section without callers having to track numbering.
 */
function renderInstructionList(items: string[]): string {
  return items.map((item, i) => `${i + 1}. ${item}`).join("\n");
}

function buildGatheringPrompt(
  history: ChatMessage[],
  extracted: ExtractedIntake,
  userMessage: string,
  memoryContext?: MemoryContext
): ConversationPrompt {
  const missing = missingFields(extracted);
  const collected = Object.entries(extracted)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  // Inject industry-specific context when available
  let industryContext = "";
  if (extracted.industry) {
    const probing = getIndustryProbing(extracted.industry);
    if (probing) {
      industryContext = `

## Industry context for ${extracted.industry}
Common bottlenecks in this industry: ${probing.common_bottlenecks.join(", ")}
Common tools: ${probing.common_tools.join(", ")}
Good probing questions: ${probing.probing_angles.join(" / ")}
Use this context to ask smarter, more specific follow-ups. Do NOT list these — pick ONE that fits what the visitor has already said.`;
    }
  }

  // Inject memory context for returning visitors
  const memorySection = memoryContext ? buildMemoryPromptSection(memoryContext) : "";

  // Phase-specific instructions stay inline because they reference
  // gathering-only concepts (industry context, field descriptions, etc.).
  // Cross-cutting rules (sentence cap, no filler, no markdown leak) come
  // from the shared rule registry in conversation-rules.ts.
  const phaseInstructions = [
    'When they share their industry, react with a brief observation that shows you understand their world (e.g., "Construction — scheduling across crews and subs is usually where things break down"). Then ask about their specific bottleneck using industry context if available.',
    'When they describe their bottleneck, reflect it back in sharper language and ask what tools they are working with now. If they mention something vague like "everything is manual", ask a clarifying question like "Are we talking about scheduling, invoicing, or something else?"',
    'If they give a one-word or vague answer, do not just move to the next field. Ask a brief clarifying follow-up that shows you are listening (e.g., "When you say scheduling is the issue — is that dispatching crews to jobs, or tracking who is where?").',
    "If they give multiple pieces of info in one message, acknowledge all of them naturally.",
    "Once you have industry, bottleneck, and current_tools, stop asking. The system handles the transition.",
    "If the visitor shares their email or name, acknowledge it naturally without making it the focus.",
  ];
  const allInstructions = [
    ...phaseInstructions,
    ...getSharedRulesForPhase("gathering"),
  ];

  const systemInstruction = `${SYSTEM_IDENTITY}

## Your task
You are gathering information to build a Preview Plan for this visitor. Have a real conversation — not an intake form.

## Already collected
${collected || "(nothing yet)"}

## Still needed
${missing.length > 0 ? missing.map((f) => `- ${f}`).join("\n") : "(all required fields filled)"}
${industryContext}
${memorySection}

## Field descriptions
- industry: What industry or type of business they run (e.g., "property management", "dental clinic", "logistics")
- bottleneck: Their main operational bottleneck or pain point — the specific process that wastes time, causes errors, or blocks throughput
- current_tools: What software/tools they currently use (e.g., "Google Sheets, email, QuickBooks")
- urgency: How urgent this is (low/medium/high/urgent) — optional, only ask if it comes up naturally
- volume: Scale context like "50 tenants" or "200 orders/week" — optional, only ask if it comes up naturally

## Instructions
${renderInstructionList(allInstructions)}`;

  const contents = appendUserTurn(buildChatTurns(history), userMessage);

  return {
    systemInstruction,
    contents,
    generationConfig: GEN_CONFIG.gathering,
  };
}

function buildConfirmingPrompt(
  history: ChatMessage[],
  extracted: ExtractedIntake,
  userMessage: string,
  memoryContext?: MemoryContext
): ConversationPrompt {
  // Build a contextual insight hint based on industry + bottleneck
  let insightHint = "";
  if (extracted.industry && extracted.bottleneck) {
    const probing = getIndustryProbing(extracted.industry);
    if (probing) {
      insightHint = `

## Insight hint
Based on your knowledge of ${extracted.industry} operations and their stated bottleneck ("${extracted.bottleneck}"), offer ONE brief observation about why this problem tends to persist — e.g., "Most ${extracted.industry} teams I see try to solve this with more people instead of fixing the handoff between [X] and [Y]." Keep it to one sentence.`;
    }
  }

  const memorySection = memoryContext ? buildMemoryPromptSection(memoryContext) : "";

  // 3D — when extraction confidence is low, the agent should explicitly
  // invite corrections before offering to build the plan.
  const confidence = computeExtractionConfidence(extracted);
  const lowConfidence = confidence < 0.7;

  const phaseInstructions = [
    'Do NOT just list back what they told you. Instead, restate their situation as a narrative: "So your team is dealing with [bottleneck] across [context], and right now you are managing it with [tools]."',
    "Add one sentence of insight — a brief observation about WHY this kind of problem persists or what you typically see in similar businesses. This builds trust.",
    "If their latest message adds detail or asks a question, address it directly before moving to the confirmation ask.",
    'If their message sounds uncertain or vague, invite corrections: "Does that match what you are dealing with, or should I adjust anything?"',
    ...(lowConfidence
      ? [
          'IMPORTANT: The information gathered may be vague or incomplete. Before offering to build the plan, explicitly ask "Did I get that right?" and invite them to correct or add detail. Do NOT ask if they are ready to build yet — first confirm understanding.',
        ]
      : [
          'If they seem ready, close with: "Want me to build your Preview Plan? It takes about 30 seconds."',
        ]),
    "Never use bullet points or numbered lists. Write in natural paragraphs.",
  ];
  const allInstructions = [
    ...phaseInstructions,
    ...getSharedRulesForPhase("confirming"),
  ];

  const systemInstruction = `${SYSTEM_IDENTITY}

## Your task
You have gathered enough information. Confirm your understanding, demonstrate insight, and ask if they are ready for you to build the Preview Plan.

## Collected information
- Industry: ${extracted.industry ?? "Not specified"}
- Bottleneck: ${extracted.bottleneck ?? "Not specified"}
- Current tools: ${extracted.current_tools ?? "Not specified"}
${extracted.urgency ? `- Urgency: ${extracted.urgency}` : ""}
${extracted.volume ? `- Volume: ${extracted.volume}` : ""}
${insightHint}
${memorySection}

## Instructions
${renderInstructionList(allInstructions)}`;

  const contents = appendUserTurn(buildChatTurns(history), userMessage);

  return {
    systemInstruction,
    contents,
    generationConfig: GEN_CONFIG.confirming,
  };
}

function buildFollowUpPrompt(
  history: ChatMessage[],
  extracted: ExtractedIntake,
  planContext: string,
  userMessage: string,
  conversationSummary?: string,
  memoryContext?: MemoryContext
): ConversationPrompt {
  const hasCapturedEmail = Boolean(extracted.email);
  const visitorLabel = extracted.name ? extracted.name : "the visitor";
  const memorySection = memoryContext ? buildMemoryPromptSection(memoryContext) : "";

  const phaseInstructions = [
    'When answering a question, reference the SPECIFIC plan detail it relates to. Use exact stage names, KPI definitions, automation triggers, and timeline estimates from the plan above. For example: "Stage 3 \'Validation Review\' is where the automation catches missing fields — the trigger fires on form submission and validates against your required fields list."',
    "If they ask about implementation timeline, reference the EXACT weeks and phases from the roadmap section. Mention quick wins they can do in week 1.",
    "If they ask about cost or pricing, do NOT quote prices. Say that scope and pricing are set during the scoping call based on the plan.",
    "If they ask about a specific section (workflow, automations, KPIs, alerts), explain what it recommends using SPECIFIC details from the plan — not generic advice. Reference the actual automation triggers, KPI formulas, stage names, and action items.",
    hasCapturedEmail
      ? `${visitorLabel} has ALREADY shared their email and the Preview Plan has ALREADY been emailed to them. Do NOT ask for their name or email again. Do NOT offer to "send the plan" — it is already in their inbox. If relevant, you may briefly reference that the plan was sent to them, but never re-ask for contact info.`
      : `If they want to share the plan or provide their email, encourage them to do so so you can email the full plan.`,
    'If they ask something outside the plan\'s scope, acknowledge it and redirect: "That is worth covering in the scoping call so we can factor it into the implementation plan."',
    "If they reference something from EARLIER in the conversation (before the plan was built), use the conversation summary to recall it.",
  ];
  const allInstructions = [
    ...phaseInstructions,
    ...getSharedRulesForPhase("follow_up"),
  ];

  const systemInstruction = `${SYSTEM_IDENTITY}

## Your task
The visitor's Preview Plan has been delivered. Answer their follow-up questions with specificity, connecting your answers to their actual plan sections. You have full access to the plan details below — use them to give precise, implementation-specific answers.

## Their situation
- Industry: ${extracted.industry ?? "Unknown"}
- Bottleneck: ${extracted.bottleneck ?? "Not specified"}
- Current tools: ${extracted.current_tools ?? "Not specified"}
${extracted.urgency ? `- Urgency: ${extracted.urgency}` : ""}
${extracted.volume ? `- Scale: ${extracted.volume}` : ""}
${extracted.name ? `- Name: ${extracted.name}` : ""}
${extracted.email ? `- Email: ${extracted.email} (plan already delivered to this address)` : ""}
${conversationSummary || ""}
${memorySection}

## Full plan details
${planContext || "(Plan details not available)"}

## Instructions
${renderInstructionList(allInstructions)}`;

  const contents = appendUserTurn(buildChatTurns(history), userMessage);

  return {
    systemInstruction,
    contents,
    generationConfig: GEN_CONFIG.follow_up,
  };
}

// ---------------------------------------------------------------------------
// Extraction — parse structured data from user messages
// ---------------------------------------------------------------------------

const EXTRACTION_PROMPT = `You extract structured intake data from a visitor's chat messages.

Given the conversation, extract any NEW information the visitor provided. Return ONLY a JSON object.
Only include fields where the visitor clearly provided information. Use null for fields not mentioned.

Fields:
- industry (string | null): Their business type/industry
- bottleneck (string | null): Their main pain point or workflow problem
- current_tools (string | null): Software/tools they currently use
- urgency ("low" | "medium" | "high" | "urgent" | null): How urgent this is
- volume (string | null): Scale/volume context
- email (string | null): Their email address if they shared one
- name (string | null): Their name if they shared it

Respond ONLY with the JSON object. No explanation, no markdown fences.`;

export async function extractIntakeData(
  history: ChatMessage[],
  userMessage: string,
  existing: ExtractedIntake
): Promise<ExtractedIntake> {
  const heuristic = extractHeuristicIntakeData(userMessage);
  const heuristicMerged = mergeExtractedIntake(existing, heuristic);

  // Fast path: if heuristics already filled every required field, skip the
  // LLM extraction call entirely. Saves a serial 500-1500ms round trip on
  // every gathering turn where the user gave structured info.
  const stillMissingAfterHeuristics = REQUIRED_FIELDS.filter((f) => {
    const val = heuristicMerged[f];
    return val === undefined || val === "";
  });
  if (stillMissingAfterHeuristics.length === 0) {
    return heuristicMerged;
  }

  const recentHistory = trimHistory(history)
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Visitor" : "Agent"}: ${m.content}`)
    .join("\n");

  const prompt = `${EXTRACTION_PROMPT}

## Already collected
${JSON.stringify(existing)}

## Recent conversation
${recentHistory}

Visitor: ${userMessage}`;

  try {
    const result = await invokeLLM(prompt, {
      models: [getFastModel()],
      responseMimeType: "application/json",
      label: "conversation:extraction",
    });

    const cleaned = result.text
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const updated = { ...heuristicMerged };

    if (typeof parsed.industry === "string" && parsed.industry.trim()) {
      updated.industry = parsed.industry.trim();
    }
    if (typeof parsed.bottleneck === "string" && parsed.bottleneck.trim()) {
      updated.bottleneck = parsed.bottleneck.trim();
    }
    if (typeof parsed.current_tools === "string" && parsed.current_tools.trim()) {
      updated.current_tools = parsed.current_tools.trim();
    }
    if (
      typeof parsed.urgency === "string" &&
      ["low", "medium", "high", "urgent"].includes(parsed.urgency)
    ) {
      updated.urgency = parsed.urgency as ExtractedIntake["urgency"];
    }
    if (typeof parsed.volume === "string" && parsed.volume.trim()) {
      updated.volume = parsed.volume.trim();
    }
    if (typeof parsed.email === "string" && parsed.email.trim()) {
      updated.email = parsed.email.trim().toLowerCase();
    }
    if (typeof parsed.name === "string" && parsed.name.trim()) {
      updated.name = parsed.name.trim();
    }

    return mergeExtractedIntake(existing, updated);
  } catch {
    console.error("Extraction failed, falling back to heuristics");
    return heuristicMerged;
  }
}

// ---------------------------------------------------------------------------
// Conversational response generation (streaming)
// ---------------------------------------------------------------------------

export interface ConversationContext {
  /** Plan summary (legacy, for backward compat). */
  planSummary?: string;
  /** Detailed plan context (full section details for follow-up accuracy). */
  detailedPlanContext?: string;
  /** Memory context for returning visitors. */
  memoryContext?: MemoryContext;
  /** Running conversation summary (key facts beyond 20-message window). */
  conversationSummary?: string;
  /** Tracked contradictions/corrections. */
  corrections?: string[];
}

// ---------------------------------------------------------------------------
// Contextual recovery fallback
// ---------------------------------------------------------------------------

const FIELD_PROMPTS: Record<string, string> = {
  industry: "what kind of business you run",
  bottleneck: "the main process that's slowing your team down",
  current_tools: "what tools you're using right now",
};

/**
 * Build a graceful recovery message for transient stream failures.
 *
 * Unlike `buildSafeConversationFallback` (which is for safety violations and
 * always includes a "can't access systems" disclaimer), this fires when a
 * Gemini stream blips and we want to keep the conversation alive without
 * starting over. It re-asks the next missing field in gathering, prompts to
 * confirm or revise in confirming, and stays neutral in follow_up.
 *
 * Exported for unit testing.
 */
export function buildContextualConversationFallback(
  phase: ConversationPhase,
  extracted: ExtractedIntake
): string {
  switch (phase) {
    case "gathering": {
      const missing = missingFields(extracted);
      const next = missing[0];
      if (next && FIELD_PROMPTS[next]) {
        return `Sorry, I lost the thread for a second. Could you tell me ${FIELD_PROMPTS[next]}?`;
      }
      return "Sorry, I lost the thread for a second. Could you say a bit more about your situation?";
    }
    case "confirming":
      return "Sorry, I lost the thread for a second. Does the summary I had look right, or should I adjust anything before building the plan?";
    case "follow_up":
      return "Sorry, I lost the thread for a second. Could you ask that again?";
    default:
      return "Sorry, I lost the thread for a second. Could you try again?";
  }
}

export async function* generateConversationalResponse(
  phase: ConversationPhase,
  history: ChatMessage[],
  extracted: ExtractedIntake,
  userMessage: string,
  planSummaryOrContext?: string | ConversationContext,
  memoryContext?: MemoryContext
): AsyncGenerator<string, void, unknown> {
  // Normalize arguments: support both legacy (string planSummary) and new (ConversationContext)
  let ctx: ConversationContext = {};
  if (typeof planSummaryOrContext === "string") {
    ctx.planSummary = planSummaryOrContext;
    ctx.memoryContext = memoryContext;
  } else if (planSummaryOrContext) {
    ctx = planSummaryOrContext;
  }

  // Use fast model for simple intake questions, full model for follow-up reasoning
  const modelName = phase === "follow_up" ? getPrimaryModel() : getFastModel();

  // Build conversation summary for context continuity
  const convSummary = ctx.conversationSummary ||
    buildConversationSummary(extracted, history, ctx.corrections);

  let prompt: ConversationPrompt;

  switch (phase) {
    case "gathering":
      prompt = buildGatheringPrompt(history, extracted, userMessage, ctx.memoryContext);
      break;
    case "confirming":
      prompt = buildConfirmingPrompt(history, extracted, userMessage, ctx.memoryContext);
      break;
    case "follow_up":
      prompt = buildFollowUpPrompt(
        history,
        extracted,
        ctx.detailedPlanContext ?? ctx.planSummary ?? "",
        userMessage,
        convSummary,
        ctx.memoryContext
      );
      break;
    default:
      // building + complete phases don't use conversational responses
      return;
  }

  // Single-retry wrapper. We can only retry if NO chunks have been yielded
  // yet — once any text reaches the client there's no way to "un-yield" it.
  // On the second failure (or any post-first-chunk failure), drop to the
  // contextual fallback so the conversation can continue instead of dying.
  const chunks: string[] = [];
  let totalLength = 0;
  let yieldedAny = false;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const stream = invokeLLMChatStreaming({
        models: [modelName],
        label: `conversation:${phase}${attempt > 0 ? ":retry" : ""}`,
        systemInstruction: prompt.systemInstruction,
        contents: prompt.contents,
        generationConfig: prompt.generationConfig,
      });

      for await (const text of stream) {
        if (!text) continue;

        // Enforce response size limit across all chunks
        if (totalLength + text.length > MAX_RESPONSE_LENGTH) {
          const remaining = MAX_RESPONSE_LENGTH - totalLength;
          if (remaining > 0) {
            const trimmed = text.slice(0, remaining);
            chunks.push(trimmed);
            yieldedAny = true;
            yield trimmed;
          }
          break;
        }

        chunks.push(text);
        totalLength += text.length;
        yieldedAny = true;
        yield text;
      }

      // Run safety check on the full assembled response after streaming
      const fullText = chunks.join("");
      if (fullText) {
        try {
          enforceTextSafety(fullText, `conversation:${phase}`);
        } catch {
          console.error("Post-stream safety check failed — content already sent");
        }
      }

      return; // success
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const transient = isTransientError(message);
      const canRetry = attempt === 0 && !yieldedAny && transient;

      if (canRetry) {
        console.warn(`conversation:${phase} stream failed (transient) — retrying`);
        continue;
      }

      // Either we already started yielding, error is non-transient, or we're
      // out of retries. Yield the contextual fallback only if nothing has
      // been sent yet — otherwise just stop the stream cleanly.
      console.error(
        `conversation:${phase} stream failed${yieldedAny ? " mid-response" : ""}: ${message}`
      );
      if (!yieldedAny) {
        yield buildContextualConversationFallback(phase, extracted);
      }
      return;
    }
  }
}

/** Non-streaming variant for cases where we need the full response at once. */
export async function generateResponse(
  phase: ConversationPhase,
  history: ChatMessage[],
  extracted: ExtractedIntake,
  userMessage: string,
  planSummary?: string
): Promise<string> {
  const chunks: string[] = [];
  for await (const chunk of generateConversationalResponse(
    phase,
    history,
    extracted,
    userMessage,
    planSummary
  )) {
    chunks.push(chunk);
  }
  return chunks.join("");
}

// ---------------------------------------------------------------------------
// Plan summary builder (for follow-up context)
// ---------------------------------------------------------------------------

export function buildPlanSummary(plan: {
  intake?: { clarified_problem?: string; suggested_scope?: string };
  workflow?: { stages?: { name: string }[] };
  automation?: { automations?: { trigger: string }[] };
  dashboard?: { kpis?: { name: string }[] };
  ops_pulse?: { actions?: { action: string }[] };
}): string {
  const parts: string[] = [];

  if (plan.intake) {
    parts.push(`Problem: ${plan.intake.clarified_problem}`);
    parts.push(`Scope: ${plan.intake.suggested_scope}`);
  }
  if (plan.workflow?.stages) {
    parts.push(
      `Workflow stages: ${plan.workflow.stages.map((s) => s.name).join(", ")}`
    );
  }
  if (plan.automation?.automations) {
    parts.push(
      `Automations: ${plan.automation.automations.map((a) => a.trigger).join(", ")}`
    );
  }
  if (plan.dashboard?.kpis) {
    parts.push(
      `KPIs: ${plan.dashboard.kpis.map((k) => k.name).join(", ")}`
    );
  }
  if (plan.ops_pulse?.actions) {
    parts.push(
      `Actions: ${plan.ops_pulse.actions.map((a) => a.action).join(", ")}`
    );
  }

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Detailed plan context (for follow-up accuracy)
// ---------------------------------------------------------------------------

/**
 * Build a detailed plan context for the follow-up phase.
 *
 * Unlike buildPlanSummary() which only includes names/triggers,
 * this includes enough detail for the agent to give specific answers
 * about implementation, timelines, KPI formulas, and automation logic.
 *
 * Truncated to ~8000 chars to fit within context window.
 */
export function buildDetailedPlanContext(plan: Partial<PreviewPlan>): string {
  const MAX_SECTION_CHARS = 1500;
  const parts: string[] = [];

  // Intake — full problem + scope
  if (plan.intake) {
    parts.push(`### Scope & Problem Analysis
- Problem: ${plan.intake.clarified_problem ?? "Not specified"}
- Scope: ${plan.intake.suggested_scope ?? "Not specified"}
- Assumptions: ${(plan.intake.assumptions ?? []).join("; ")}
- Constraints: ${(plan.intake.constraints ?? []).join("; ")}`);
  }

  // Workflow — stages with details
  if (plan.workflow?.stages) {
    const stageDetails = plan.workflow.stages
      .map((s: { name: string; owner_role: string; entry_criteria: string; exit_criteria: string }, i: number) =>
        `  ${i + 1}. ${s.name} (owner: ${s.owner_role}) — entry: ${s.entry_criteria.slice(0, 100)}, exit: ${s.exit_criteria.slice(0, 100)}`
      )
      .join("\n");
    let workflowSection = `### Workflow Map\n${stageDetails}`;
    if (plan.workflow.failure_modes?.length) {
      workflowSection += `\nFailure modes: ${plan.workflow.failure_modes.join("; ")}`;
    }
    parts.push(workflowSection.slice(0, MAX_SECTION_CHARS));
  }

  // Automations — triggers + steps + error handling
  if (plan.automation?.automations) {
    const autoDetails = plan.automation.automations
      .map((a: { trigger: string; steps: string[]; error_handling: string; platform?: string }) =>
        `- Trigger: ${a.trigger}\n    Steps: ${a.steps.join(" → ")}\n    Error handling: ${a.error_handling}${a.platform ? ` (${a.platform})` : ""}`
      )
      .join("\n");
    let autoSection = `### Automations & Alerts\n${autoDetails}`;
    if (plan.automation.alerts?.length) {
      autoSection += `\nAlerts: ${plan.automation.alerts.map((a: { when: string; who: string; escalation: string }) => `${a.when} → notify ${a.who}, escalation: ${a.escalation}`).join("; ")}`;
    }
    parts.push(autoSection.slice(0, MAX_SECTION_CHARS));
  }

  // Dashboard — KPIs with definitions
  if (plan.dashboard?.kpis) {
    const kpiDetails = plan.dashboard.kpis
      .map((k: { name: string; definition: string; why_it_matters: string }) =>
        `- ${k.name}: ${k.definition} — ${k.why_it_matters}`
      )
      .join("\n");
    let dashSection = `### Dashboard & KPIs\n${kpiDetails}`;
    if (plan.dashboard.views?.length) {
      dashSection += `\nViews: ${plan.dashboard.views.map((v: { name: string; filter: string }) => `${v.name} (${v.filter})`).join(", ")}`;
    }
    parts.push(dashSection.slice(0, MAX_SECTION_CHARS));
  }

  // Ops Pulse — executive summary + actions
  if (plan.ops_pulse) {
    let opsSection = `### Ops Pulse`;
    if (plan.ops_pulse.executive_summary) {
      const es = plan.ops_pulse.executive_summary;
      opsSection += `\nSummary: ${es.problem} → ${es.solution} → Impact: ${es.impact}. Next step: ${es.next_step}`;
    }
    if (plan.ops_pulse.actions?.length) {
      opsSection += `\nPriority actions: ${plan.ops_pulse.actions.map((a: { priority: string; action: string; owner_role: string }) => `[${a.priority}] ${a.action} (${a.owner_role})`).join("; ")}`;
    }
    if (plan.ops_pulse.questions?.length) {
      opsSection += `\nOpen questions: ${plan.ops_pulse.questions.join("; ")}`;
    }
    parts.push(opsSection.slice(0, MAX_SECTION_CHARS));
  }

  // Roadmap — phases with tasks
  if (plan.roadmap?.phases) {
    const phaseDetails = plan.roadmap.phases
      .map((p: { week: number; title: string; tasks: { task: string; effort: string }[]; quick_wins: string[] }) =>
        `- Week ${p.week}: ${p.title} — ${p.tasks.map((t: { task: string; effort: string }) => `${t.task} [${t.effort}]`).join("; ")}${p.quick_wins?.length ? ` (Quick wins: ${p.quick_wins.join(", ")})` : ""}`
      )
      .join("\n");
    let roadmapSection = `### Implementation Roadmap\n${phaseDetails}`;
    if (plan.roadmap.critical_path) {
      roadmapSection += `\nCritical path: ${plan.roadmap.critical_path}`;
    }
    if (plan.roadmap.total_estimated_weeks) {
      roadmapSection += `\nTotal estimated: ${plan.roadmap.total_estimated_weeks} weeks`;
    }
    parts.push(roadmapSection.slice(0, MAX_SECTION_CHARS));
  }

  return parts.join("\n\n");
}

// ---------------------------------------------------------------------------
// Conversation context summary (persists beyond 20-message window)
// ---------------------------------------------------------------------------

/**
 * Build a running summary of key conversation facts.
 *
 * This persists information that would otherwise be lost when the
 * 20-message context window slides forward. Injected into all prompts
 * to ensure the agent never "forgets" what was discussed.
 */
export function buildConversationSummary(
  extracted: ExtractedIntake,
  history: ChatMessage[],
  corrections: string[] = []
): string {
  const parts: string[] = [];

  // Collected facts
  const facts = Object.entries(extracted)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `- ${k}: ${v}`);

  if (facts.length > 0) {
    parts.push(`Confirmed facts:\n${facts.join("\n")}`);
  }

  // Corrections made during conversation
  if (corrections.length > 0) {
    parts.push(`Corrections made:\n${corrections.map((c) => `- ${c}`).join("\n")}`);
  }

  // Key topics discussed (extract from older messages if beyond window)
  const messageCount = history.length;
  if (messageCount > MAX_CONTEXT_MESSAGES) {
    const oldMessages = history.slice(0, messageCount - MAX_CONTEXT_MESSAGES);
    const topics = extractTopicsFromMessages(oldMessages);
    if (topics.length > 0) {
      parts.push(`Earlier discussion topics: ${topics.join(", ")}`);
    }
  }

  if (parts.length === 0) return "";

  return `\n## Conversation context (running summary)\n${parts.join("\n")}`;
}

/**
 * Extract key topics from messages outside the context window.
 * These are keywords/phrases that help the agent recall older context.
 */
function extractTopicsFromMessages(messages: ChatMessage[]): string[] {
  const topics = new Set<string>();
  const keywordPatterns = [
    /\b(schedule|scheduling|dispatch)\b/i,
    /\b(invoice|invoicing|billing|payment)\b/i,
    /\b(hire|hiring|onboard|onboarding)\b/i,
    /\b(maintain|maintenance|work order)\b/i,
    /\b(compliance|HIPAA|regulation)\b/i,
    /\b(CRM|ERP|accounting)\b/i,
    /\b(automate|automation|workflow)\b/i,
    /\b(report|reporting|dashboard)\b/i,
    /\b(customer|client|patient|tenant)\b/i,
    /\b(deadline|SLA|turnaround)\b/i,
  ];

  for (const msg of messages) {
    if (msg.role !== "user") continue;
    for (const pattern of keywordPatterns) {
      const match = msg.content.match(pattern);
      if (match) topics.add(match[0].toLowerCase());
    }
  }

  return Array.from(topics).slice(0, 8);
}

// ---------------------------------------------------------------------------
// Contradiction detection (across all phases)
// ---------------------------------------------------------------------------

/**
 * Detect if the user is correcting previously extracted data.
 * Returns a description of the contradiction if found.
 */
export function detectContradiction(
  message: string,
  extracted: ExtractedIntake
): string | null {
  // Check if user is overriding industry
  if (extracted.industry) {
    const newIndustry = inferIndustry(message);
    if (
      newIndustry &&
      newIndustry.toLowerCase() !== extracted.industry.toLowerCase() &&
      !newIndustry.toLowerCase().includes(extracted.industry.toLowerCase())
    ) {
      return `Industry changed from "${extracted.industry}" to "${newIndustry}"`;
    }
  }

  // Check if user is overriding tools
  if (extracted.current_tools) {
    const newTools = inferCurrentTools(message);
    if (newTools && !newTools.toLowerCase().includes(extracted.current_tools.toLowerCase().slice(0, 20))) {
      const hasContrast = /\b(actually|not|instead|switched|moved to|no longer|replaced|ditched)\b/i.test(message);
      if (hasContrast) {
        return `Tools corrected from "${extracted.current_tools}" to "${newTools}"`;
      }
    }
  }

  // Check for explicit contradiction signals
  if (hasRevisionSignal(message) && extracted.bottleneck) {
    const newBottleneck = inferBottleneck(message);
    if (newBottleneck && newBottleneck !== extracted.bottleneck) {
      return `Bottleneck updated from "${extracted.bottleneck.slice(0, 60)}" to "${newBottleneck.slice(0, 60)}"`;
    }
  }

  return null;
}
