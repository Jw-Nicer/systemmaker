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

// ---------------------------------------------------------------------------
// Phase detection
// ---------------------------------------------------------------------------

/** Determine what phase the conversation should be in. */
export function detectPhase(
  currentPhase: ConversationPhase,
  extracted: ExtractedIntake,
  lastUserMessage: string
): ConversationPhase {
  // Once building starts, it runs to completion — no going back
  if (currentPhase === "building") return "building";

  // After plan is complete, any new message is follow-up
  if (currentPhase === "complete" || currentPhase === "follow_up") {
    return "follow_up";
  }

  // If confirming and user affirms, move to building
  if (currentPhase === "confirming") {
    const negation = /\b(no|not|nope|wait|hold|stop|change|wrong|actually|incorrect|don't|dont)\b/i;
    if (negation.test(lastUserMessage)) return "gathering";
    const affirm = /\b(yes|yeah|yep|sure|go|ready|build|do it|let's go|looks good|correct|right|proceed)\b/i;
    if (affirm.test(lastUserMessage)) return "building";
    // Ambiguous — stay in confirming to ask again
    return "confirming";
  }

  // Check if all required fields are filled
  const allCollected = REQUIRED_FIELDS.every((f) => {
    const val = extracted[f];
    return val !== undefined && val !== "";
  });

  if (allCollected) return "confirming";
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
6. Respond ONLY with your next conversational message. No JSON, no markdown headers.`;
}

function buildConfirmingPrompt(
  history: ChatMessage[],
  extracted: ExtractedIntake
): string {
  return `${SYSTEM_IDENTITY}

## Your task
Summarize what you understand about this visitor's situation and ask if they're ready for you to build their Preview Plan.

## Collected information
- Industry: ${extracted.industry}
- Bottleneck: ${extracted.bottleneck}
- Current tools: ${extracted.current_tools}
${extracted.urgency ? `- Urgency: ${extracted.urgency}` : ""}
${extracted.volume ? `- Volume: ${extracted.volume}` : ""}

## Conversation so far
${formatHistory(history)}

## Instructions
1. Write a brief 2-3 sentence summary of their situation.
2. End with something like "Ready for me to build your Preview Plan?" or "Shall I put together your plan?"
3. Be warm and confident. Make them feel understood.
4. Respond ONLY with your conversational message. No JSON.`;
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

Respond ONLY with the JSON object. No explanation, no markdown fences.`;

export async function extractIntakeData(
  history: ChatMessage[],
  userMessage: string,
  existing: ExtractedIntake
): Promise<ExtractedIntake> {
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
    const updated = { ...existing };

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

    return updated;
  } catch (err) {
    console.error("Extraction failed, keeping existing data:", err);
    return existing;
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
      prompt = buildConfirmingPrompt(history, extracted);
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
    const result = await model.generateContent(prompt);
    const text = result.response.text()?.trim() ?? "";
    if (!text) return;

    assertSafeAgentText(text, `conversation:${phase}`);
    yield text;
  } catch (err) {
    console.error("Conversation safety fallback triggered:", err);
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
