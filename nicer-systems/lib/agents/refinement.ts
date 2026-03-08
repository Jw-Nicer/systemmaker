import { GoogleGenerativeAI } from "@google/generative-ai";
import type { PlanSectionType } from "@/types/chat";
import type { PreviewPlan } from "@/types/preview-plan";
import { buildPlanSummary } from "./conversation";
import { assertSafeAgentObject } from "./safety";

const MAX_RETRIES = 2;
const RETRY_BASE_MS = 500;
const TIMEOUT_MS = 60_000;
const MAX_OUTPUT_BYTES = 256 * 1024; // 256KB max refinement output
const MAX_STREAMING_BYTES = 256 * 1024;

function getGeminiClient() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not set");
  return new GoogleGenerativeAI(apiKey);
}

function getModel() {
  return process.env.GOOGLE_GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

function isTransient(msg: string): boolean {
  const m = msg.toLowerCase();
  return /429|500|502|503|504|rate limit|quota|timeout|timed out|unavailable|econnreset/.test(m);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const SECTION_LABELS: Record<PlanSectionType, string> = {
  intake: "Suggested Scope",
  workflow: "Workflow Map",
  automation: "Automations & Alerts",
  dashboard: "Dashboard KPIs",
  ops_pulse: "Ops Pulse & Actions",
};

function getSectionData(plan: PreviewPlan, section: PlanSectionType): unknown {
  return plan[section];
}

/** Sanitize feedback to prevent prompt injection */
function sanitizeFeedback(feedback: string): string {
  return feedback
    .replace(/(system|assistant|instructions?|ignore previous|forget everything|disregard|override)[\s:]/gim, "")
    .replace(/^#{1,6}\s/gm, "")
    .replace(/^[-=*]{3,}$/gm, "—")
    .replace(/---+/g, "—")
    .replace(/```/g, "'''")
    .slice(0, 2000);
}

function buildRefinementPrompt(
  section: PlanSectionType,
  currentData: unknown,
  feedback: string,
  fullPlan: PreviewPlan
): string {
  const planContext = buildPlanSummary(fullPlan);
  const label = SECTION_LABELS[section];
  const safeFeedback = sanitizeFeedback(feedback);

  return `You are the Nicer Systems AI consultant. You help American businesses automate admin-heavy workflows.
Your tone is clear, confident, practical, and business-friendly.

## Your task
A visitor has received a Preview Plan and wants to refine the "${label}" section based on their feedback.

## Full plan context
${planContext}

## Current "${label}" section content
${JSON.stringify(currentData, null, 2)}

## Visitor feedback
"${safeFeedback}"

## Instructions
1. Take the visitor's feedback seriously — they know their business better than you.
2. Regenerate the "${label}" section with improvements based on their feedback.
3. Keep the same JSON structure as the current content.
4. Only change what the feedback asks for — don't rewrite unrelated parts.
5. Be specific and practical in your suggestions.
6. Return ONLY the updated JSON for this section. No explanation, no markdown fences.`;
}

/**
 * Refine a single section of a preview plan based on visitor feedback.
 * Returns the updated section data as a parsed object.
 */
export async function refinePlanSection(
  section: PlanSectionType,
  feedback: string,
  fullPlan: PreviewPlan
): Promise<{ refined: unknown; summary: string }> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: getModel(),
    generationConfig: { responseMimeType: "application/json" },
  });

  const currentData = getSectionData(fullPlan, section);
  const prompt = buildRefinementPrompt(section, currentData, feedback, fullPlan);

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Refinement timed out")), TIMEOUT_MS)
        ),
      ]);
      const text = result.response.text()?.trim();

      if (!text) {
        throw new Error("Empty response from AI model");
      }
      if (new TextEncoder().encode(text).byteLength > MAX_OUTPUT_BYTES) {
        throw new Error("Refinement response exceeded size limit");
      }

      const cleaned = text
        .replace(/^```(?:json)?\s*\n?/i, "")
        .replace(/\n?```\s*$/i, "")
        .trim();

  const parsed = JSON.parse(cleaned);
  assertSafeAgentObject(parsed, `refinement:${section}`);

  return {
        refined: parsed,
        summary: `Refined "${SECTION_LABELS[section]}" based on feedback: "${feedback.slice(0, 80)}"`,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES && isTransient(lastError.message)) {
        await sleep(RETRY_BASE_MS * 2 ** attempt);
        continue;
      }
    }
  }

  throw lastError ?? new Error("Refinement failed");
}

/**
 * Streaming variant — yields text chunks for real-time display,
 * then returns the final parsed section.
 */
export async function* refinePlanSectionStreaming(
  section: PlanSectionType,
  feedback: string,
  fullPlan: PreviewPlan
): AsyncGenerator<string, unknown, unknown> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: getModel() });

  const currentData = getSectionData(fullPlan, section);
  const prompt = buildRefinementPrompt(section, currentData, feedback, fullPlan);

  const result = await model.generateContentStream(prompt);
  const chunks: string[] = [];
  let totalBytes = 0;

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      totalBytes += new TextEncoder().encode(text).byteLength;
      if (totalBytes > MAX_STREAMING_BYTES) break;
      chunks.push(text);
      yield text;
    }
  }

  const fullText = chunks.join("").trim();
  const cleaned = fullText
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return cleaned;
  }
}
