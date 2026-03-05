import { GoogleGenerativeAI } from "@google/generative-ai";
import type { PlanSectionType } from "@/types/chat";
import type { PreviewPlan } from "@/types/preview-plan";
import { buildPlanSummary } from "./conversation";

function getGeminiClient() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not set");
  return new GoogleGenerativeAI(apiKey);
}

function getModel() {
  return process.env.GOOGLE_GEMINI_MODEL?.trim() || "gemini-2.5-flash";
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

function buildRefinementPrompt(
  section: PlanSectionType,
  currentData: unknown,
  feedback: string,
  fullPlan: PreviewPlan
): string {
  const planContext = buildPlanSummary(fullPlan);
  const label = SECTION_LABELS[section];

  return `You are the Nicer Systems AI consultant. You help American businesses automate admin-heavy workflows.
Your tone is clear, confident, practical, and business-friendly.

## Your task
A visitor has received a Preview Plan and wants to refine the "${label}" section based on their feedback.

## Full plan context
${planContext}

## Current "${label}" section content
${JSON.stringify(currentData, null, 2)}

## Visitor feedback
"${feedback}"

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

  const result = await model.generateContent(prompt);
  const text = result.response.text()?.trim();

  if (!text) {
    throw new Error("Empty response from Gemini");
  }

  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned);

  return {
    refined: parsed,
    summary: `Refined "${SECTION_LABELS[section]}" based on feedback: "${feedback.slice(0, 80)}"`,
  };
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

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
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
