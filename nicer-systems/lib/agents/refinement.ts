/**
 * Refinement Agent — section-level plan refinement via LLM.
 *
 * Uses the shared LLM client for unified retry, model fallback, and
 * observability. All outputs pass through safety guardrails and
 * schema validation before returning to the caller.
 */
import type { PlanSectionType } from "@/types/chat";
import type { PreviewPlan } from "@/types/preview-plan";
import { buildPlanSummary } from "./conversation";
export {
  getSectionSuggestions,
  type RefinementSuggestion,
} from "./refinement-suggestions";
import { invokeLLM, invokeLLMStreaming, robustJsonParse } from "./llm-client";
import { enforceOutputSafety } from "./safety";
import { stageOutputGuardrails } from "./schemas";
import { createTrace, startSpan, endSpan, finalizeTrace, emitTraceLog } from "./tracing";

/** Map PlanSectionType → template key for schema lookup */
const SECTION_TO_TEMPLATE: Record<PlanSectionType, string> = {
  intake: "intake_agent",
  workflow: "workflow_mapper",
  automation: "automation_designer",
  dashboard: "dashboard_designer",
  ops_pulse: "ops_pulse_writer",
  implementation_sequencer: "implementation_sequencer",
};

const SECTION_LABELS: Record<PlanSectionType, string> = {
  intake: "Suggested Scope",
  workflow: "Workflow Map",
  automation: "Automations & Alerts",
  dashboard: "Dashboard KPIs",
  ops_pulse: "Ops Pulse & Actions",
  implementation_sequencer: "Implementation Roadmap",
};

function getSectionData(plan: PreviewPlan, section: PlanSectionType): unknown {
  if (section === "implementation_sequencer") return plan.roadmap;
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
  const trace = createTrace("refinement", {
    section,
    feedbackLength: feedback.length,
  });
  const span = startSpan(trace, `refine:${section}`);

  const currentData = getSectionData(fullPlan, section);
  const prompt = buildRefinementPrompt(section, currentData, feedback, fullPlan);

  try {
    const result = await invokeLLM(prompt, {
      span,
      label: `refine:${section}`,
      responseMimeType: "application/json",
    });

    const parsed = robustJsonParse(result.text);
    enforceOutputSafety(parsed, `refinement:${section}`);

    endSpan(span, { status: "completed" });
    finalizeTrace(trace);
    emitTraceLog(trace);

    return {
      refined: parsed,
      summary: `Refined "${SECTION_LABELS[section]}" based on feedback: "${feedback.slice(0, 80)}"`,
    };
  } catch (err) {
    endSpan(span, {
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    });
    finalizeTrace(trace);
    emitTraceLog(trace);
    throw err;
  }
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
  const trace = createTrace("refinement", {
    section,
    feedbackLength: feedback.length,
    streaming: true,
  });
  const span = startSpan(trace, `refine-stream:${section}`);

  const currentData = getSectionData(fullPlan, section);
  const prompt = buildRefinementPrompt(section, currentData, feedback, fullPlan);

  const chunks: string[] = [];
  const stream = invokeLLMStreaming(prompt, {
    span,
    label: `refine-stream:${section}`,
  });

  for (;;) {
    const { value, done } = await stream.next();
    if (done) break;
    chunks.push(value);
    yield value;
  }

  const fullText = chunks.join("").trim();

  try {
    const parsed = robustJsonParse(fullText);
    enforceOutputSafety(parsed, `refinement:${section}`);

    // Validate against the section's schema if available
    const schema = stageOutputGuardrails[SECTION_TO_TEMPLATE[section]];
    if (schema) {
      const result = schema.safeParse(parsed);
      if (!result.success) {
        console.warn(
          `[refinement] Streamed output failed schema validation for ${section}:`,
          result.error.issues.slice(0, 3)
        );
        throw new Error(`Refined "${SECTION_LABELS[section]}" failed validation`);
      }
      endSpan(span, { status: "completed" });
      finalizeTrace(trace);
      emitTraceLog(trace);
      return result.data;
    }

    endSpan(span, { status: "completed" });
    finalizeTrace(trace);
    emitTraceLog(trace);
    return parsed;
  } catch (err) {
    if (err instanceof SyntaxError) {
      endSpan(span, { status: "degraded", error: "JSON parse failed on streamed output" });
      finalizeTrace(trace);
      emitTraceLog(trace);
      return fullText;
    }
    endSpan(span, {
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    });
    finalizeTrace(trace);
    emitTraceLog(trace);
    throw err;
  }
}
