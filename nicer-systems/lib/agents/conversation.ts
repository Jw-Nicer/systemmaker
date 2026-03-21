import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  ConversationPhase,
  ChatMessage,
  ExtractedIntake,
} from "@/types/chat";
import {
  assertSafeAgentText,
  buildSafeConversationFallback,
} from "./safety";

const REQUIRED_FIELDS: (keyof ExtractedIntake)[] = [
  "industry",
  "bottleneck",
  "current_tools",
];

const MAX_CONTEXT_MESSAGES = 20;
const EXTRACTION_TIMEOUT_MS = 15_000;
const MAX_FIELD_LENGTH = 2000;
const MAX_RESPONSE_LENGTH = 10_000; // Max chars for a single conversational response

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGeminiClient() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not set");
  return new GoogleGenerativeAI(apiKey);
}

function getModel() {
  return process.env.GOOGLE_GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

/** Fast model for simple structured tasks (extraction). */
function getFastModel() {
  return "gemini-2.0-flash";
}

/** Trim history to last N messages to keep context manageable. */
function trimHistory(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= MAX_CONTEXT_MESSAGES) return messages;
  return messages.slice(-MAX_CONTEXT_MESSAGES);
}

/** Format chat history for Gemini prompt. */
function formatHistory(messages: ChatMessage[]): string {
  return trimHistory(messages)
    .map((m) => `${m.role === "user" ? "Visitor" : "Agent"}: ${m.content}`)
    .join("\n\n");
}

function cleanField(value: string, max = MAX_FIELD_LENGTH): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
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

function looksLikeQuestion(message: string): boolean {
  return /\?/.test(message) || /^(what|how|why|when|where|which|can|could|would|should|do|does|is|are)\b/i.test(message.trim());
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

function inferIndustry(message: string): string | undefined {
  // Match explicit "I run a ..." patterns
  const match = message.match(
    /\b(?:i run|we run|i own|we own|i'm in|i am in|my company is|our business is|we're in|we are in)\s+(?:a|an)?\s*([^,.!\n]{2,80})/i
  );
  if (match) {
    const value = match[1]
      .replace(/\b(company|business|firm|team|shop|agency)\b/gi, "")
      .trim();
    if (
      value &&
      !/\b(use|using|problem|bottleneck|manual|urgent|currently|tool|stack)\b/i.test(value)
    ) {
      return cleanField(value, 200);
    }
  }

  // Match bare industry names (common when user just types the industry)
  const knownIndustries = /^(construction|healthcare|real estate|legal|logistics|staffing|wholesale|distribution|dental|plumbing|hvac|electrical|property management|home services|landscaping|roofing|accounting|insurance|manufacturing|retail|restaurants?|hospitality|trucking|cleaning|pest control|moving|storage|auto repair|veterinary|childcare|senior care|medical|fitness|salon|spa|consulting)\b/i;
  const bareMatch = message.trim().match(knownIndustries);
  if (bareMatch) return cleanField(bareMatch[0], 200);

  return undefined;
}

function inferBottleneck(message: string): string | undefined {
  const explicitMatch = message.match(
    /\b(?:bottleneck|problem|pain point|biggest issue|biggest problem|main issue|main problem|struggle|struggling with)\s*(?:is|:)?\s*([^.!?\n]+(?:[.!?]\s*[^.!?\n]+)*)/i
  );
  if (explicitMatch) {
    return cleanField(explicitMatch[1], 2000);
  }

  // Match conversational descriptions of workflow problems
  const problemPatterns = /\b(?:we're dealing with|we are dealing with|we keep hitting|the process is|our workflow is|things get stuck|we lose time|we get delayed|takes too long|too much time|waste time|drop the ball|fall through the cracks|no visibility|can't track|hard to track)\b/i;
  const problemKeywords = /\b(manual|spreadsheet|slow|delay|rework|double[- ]entry|follow[- ]up|handoff|chasing|bottleneck|stuck|missed|error|backlog|paperwork|disconnected|scattered|chaotic|messy|broken)\b/i;

  if (problemPatterns.test(message) || (message.length > 50 && problemKeywords.test(message))) {
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
    if (looksLikeQuestion(lastUserMessage)) return "confirming";
    // If not clearly a question or revision, treat as affirmation after 2+ confirming rounds
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
Your tone is clear, confident, practical, and business-friendly. No hype, no jargon.
You ask short, specific questions — one at a time. Keep responses to 2-3 sentences max during intake.`;

function buildGatheringPrompt(
  history: ChatMessage[],
  extracted: ExtractedIntake,
  userMessage: string
): string {
  const missing = missingFields(extracted);
  const collected = Object.entries(extracted)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  return `${SYSTEM_IDENTITY}

## Your task
You are gathering information to build a Preview Plan for this visitor. Ask questions conversationally — one at a time.

## Already collected
${collected || "(nothing yet)"}

## Still needed
${missing.map((f) => `- ${f}`).join("\n")}

## Field descriptions
- industry: What industry or type of business they run (e.g., "property management", "dental clinic", "logistics")
- bottleneck: Their main operational bottleneck or pain point — the specific process that wastes time
- current_tools: What software/tools they currently use (e.g., "Google Sheets, email, QuickBooks")
- urgency: How urgent this is (low/medium/high/urgent) — optional, ask if natural
- volume: Scale context like "50 tenants" or "200 orders/week" — optional, ask if natural

## Conversation so far
${formatHistory(history)}

Visitor: ${userMessage}

## Instructions
1. If this is the first message, greet them warmly and ask about their industry.
2. If they provided info, acknowledge it briefly and ask for the NEXT missing field.
3. Be conversational — don't list all questions at once.
4. If they give multiple pieces of info in one message, acknowledge all of them.
5. Once you have industry, bottleneck, and current_tools, DON'T ask more — the system will handle the transition.
6. If the visitor shares their email or name at any point, acknowledge it naturally.
7. Respond ONLY with your next conversational message. No JSON, no markdown headers.`;
}

function buildConfirmingPrompt(
  history: ChatMessage[],
  extracted: ExtractedIntake,
  userMessage: string
): string {
  return `${SYSTEM_IDENTITY}

## Your task
Summarize what you understand about this visitor's situation, respond to any clarification in their latest message, and ask if they're ready for you to build their Preview Plan.

## Collected information
- Industry: ${extracted.industry}
- Bottleneck: ${extracted.bottleneck}
- Current tools: ${extracted.current_tools}
${extracted.urgency ? `- Urgency: ${extracted.urgency}` : ""}
${extracted.volume ? `- Volume: ${extracted.volume}` : ""}

## Conversation so far
${formatHistory(history)}

## Latest visitor message
${userMessage}

## Instructions
1. Write a brief summary of their situation.
2. If their latest message adds detail or asks a clarification question, address it directly before asking to proceed.
3. If their latest message sounds uncertain, invite corrections instead of pushing straight to build.
4. End with a clear next step like "Ready for me to build your Preview Plan?" when appropriate.
5. Be warm and confident. Make them feel understood.
6. Respond ONLY with your conversational message. No JSON.`;
}

function buildFollowUpPrompt(
  history: ChatMessage[],
  extracted: ExtractedIntake,
  planSummary: string,
  userMessage: string
): string {
  return `${SYSTEM_IDENTITY}

## Your task
The visitor's Preview Plan has been delivered. Answer their follow-up questions about it.

## Their situation
- Industry: ${extracted.industry}
- Bottleneck: ${extracted.bottleneck}
- Current tools: ${extracted.current_tools}

## Plan summary
${planSummary}

## Conversation so far
${formatHistory(history)}

Visitor: ${userMessage}

## Instructions
1. Answer their question helpfully and specifically, referencing their plan.
2. Keep responses concise but thorough (3-5 sentences).
3. If they ask about implementation, mention that booking a scoping call is the best next step.
4. If they want to provide their email to receive the plan, encourage them to do so.
5. Respond ONLY with your conversational message. No JSON.`;
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
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: getFastModel(),
    generationConfig: { responseMimeType: "application/json" },
  });

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
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Extraction timed out")), EXTRACTION_TIMEOUT_MS)
      ),
    ]);
    const text = result.response.text()?.trim();
    if (!text) return existing;

    const cleaned = text
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

export async function* generateConversationalResponse(
  phase: ConversationPhase,
  history: ChatMessage[],
  extracted: ExtractedIntake,
  userMessage: string,
  planSummary?: string
): AsyncGenerator<string, void, unknown> {
  const client = getGeminiClient();
  // Use fast model for simple intake questions, full model for follow-up reasoning
  const modelName = phase === "follow_up" ? getModel() : getFastModel();
  const model = client.getGenerativeModel({ model: modelName });

  let prompt: string;

  switch (phase) {
    case "gathering":
      prompt = buildGatheringPrompt(history, extracted, userMessage);
      break;
    case "confirming":
      prompt = buildConfirmingPrompt(history, extracted, userMessage);
      break;
    case "follow_up":
      prompt = buildFollowUpPrompt(
        history,
        extracted,
        planSummary ?? "",
        userMessage
      );
      break;
    default:
      // building + complete phases don't use conversational responses
      return;
  }

  try {
    const result = await model.generateContentStream(prompt);
    const chunks: string[] = [];
    let totalLength = 0;

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (!text) continue;

      // Enforce response size limit across all chunks
      if (totalLength + text.length > MAX_RESPONSE_LENGTH) {
        const remaining = MAX_RESPONSE_LENGTH - totalLength;
        if (remaining > 0) {
          const trimmed = text.slice(0, remaining);
          chunks.push(trimmed);
          yield trimmed;
        }
        break;
      }

      chunks.push(text);
      totalLength += text.length;
      yield text;
    }

    // Run safety check on the full assembled response after streaming
    const fullText = chunks.join("");
    if (fullText) {
      try {
        assertSafeAgentText(fullText, `conversation:${phase}`);
      } catch {
        console.error("Post-stream safety check failed — content already sent");
      }
    }
  } catch {
    console.error("Conversation safety fallback triggered");
    yield buildSafeConversationFallback(phase);
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
