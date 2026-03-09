import { GoogleGenerativeAI } from "@google/generative-ai";
import type { PlanSectionType } from "@/types/chat";
import type { PreviewPlan, PlanWarning } from "@/types/preview-plan";
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

// ---------------------------------------------------------------------------
// Smart refinement suggestions — context-aware chips per section
// ---------------------------------------------------------------------------

export interface RefinementSuggestion {
  label: string;
  feedback: string;
}

/**
 * Generate contextual refinement suggestions for a plan section.
 * These are deterministic (no LLM call) — based on plan content analysis.
 */
export function getSectionSuggestions(
  plan: PreviewPlan,
  section: PlanSectionType
): RefinementSuggestion[] {
  const suggestions: RefinementSuggestion[] = [];

  switch (section) {
    case "intake": {
      if (plan.intake.assumptions.length < 3) {
        suggestions.push({
          label: "Add more assumptions",
          feedback: "Add more specific assumptions about our team size, tech comfort level, and current pain points.",
        });
      }
      if (plan.intake.constraints.length < 2) {
        suggestions.push({
          label: "Clarify constraints",
          feedback: "Add constraints around budget, timeline, team availability, and any compliance requirements.",
        });
      }
      if (!plan.intake.suggested_scope.toLowerCase().includes("→")) {
        suggestions.push({
          label: "Sharpen the scope",
          feedback: "Make the suggested scope more specific — include the exact start and end points of the workflow.",
        });
      }
      break;
    }

    case "workflow": {
      if (plan.workflow.stages.length > 8) {
        suggestions.push({
          label: "Simplify stages",
          feedback: `This workflow has ${plan.workflow.stages.length} stages. Can any be consolidated? Look for stages that could be merged without losing clarity.`,
        });
      }
      if (plan.workflow.stages.length < 5) {
        suggestions.push({
          label: "Add missing stages",
          feedback: "Are there any steps between these stages that were skipped? Consider handoffs, approvals, or quality checks.",
        });
      }
      const genericRoles = plan.workflow.stages.filter(
        (s) => /^(admin|manager|user|staff|team)$/i.test(s.owner_role.trim())
      );
      if (genericRoles.length > 0) {
        suggestions.push({
          label: "Specify role titles",
          feedback: `Some stages have generic owners like "${genericRoles[0].owner_role}". Use specific job titles (e.g., "Property Manager", "Billing Coordinator").`,
        });
      }
      if (plan.workflow.failure_modes.length < 3) {
        suggestions.push({
          label: "Add failure modes",
          feedback: "What commonly goes wrong? Think about: missed deadlines, incomplete data, approval bottlenecks, and communication gaps.",
        });
      }
      break;
    }

    case "automation": {
      const hasNoAlerts = plan.automation.alerts.length === 0;
      if (hasNoAlerts) {
        suggestions.push({
          label: "Add escalation alerts",
          feedback: "Add alerts for when items are stuck: missed SLAs, unacknowledged assignments, and repeated failures.",
        });
      }
      const hasNoEscalation = plan.automation.alerts.every(
        (a) => a.escalation.length < 20
      );
      if (!hasNoAlerts && hasNoEscalation) {
        suggestions.push({
          label: "Define escalation paths",
          feedback: "Each alert needs a clear escalation path: who gets notified if the first person doesn't act? What's the time limit?",
        });
      }
      if (plan.automation.logging_plan.length < 2) {
        suggestions.push({
          label: "Improve logging",
          feedback: "Add logging for: key decisions made, data changes, errors encountered, and SLA timestamps.",
        });
      }
      suggestions.push({
        label: "Add error recovery",
        feedback: "For each automation, what happens when it partially fails? Define rollback steps and manual fallback procedures.",
      });
      break;
    }

    case "dashboard": {
      const hasTimingKpi = plan.dashboard.kpis.some(
        (k) => /time|duration|hours|days|sla/i.test(k.name + " " + k.definition)
      );
      if (!hasTimingKpi) {
        suggestions.push({
          label: "Add timing metrics",
          feedback: "Add at least one time-based KPI (e.g., average processing time, SLA compliance rate, time-to-first-response).",
        });
      }
      const hasQualityKpi = plan.dashboard.kpis.some(
        (k) => /error|quality|accuracy|rework|fix/i.test(k.name + " " + k.definition)
      );
      if (!hasQualityKpi) {
        suggestions.push({
          label: "Add quality metrics",
          feedback: "Add a quality KPI like first-time fix rate, error rate, or rework percentage to track output quality.",
        });
      }
      if (plan.dashboard.views.length < 2) {
        suggestions.push({
          label: "Add exception views",
          feedback: "Add a view for items needing attention: stuck items, overdue tasks, missing data, or approaching SLA deadlines.",
        });
      }
      if (plan.dashboard.kpis.some((k) => k.definition.length < 50)) {
        suggestions.push({
          label: "Define KPI formulas",
          feedback: "Each KPI needs a precise definition: formula, unit, time window, target value, and data source field.",
        });
      }
      break;
    }

    case "ops_pulse": {
      const highActions = plan.ops_pulse.actions.filter((a) => a.priority === "high");
      if (highActions.length === 0) {
        suggestions.push({
          label: "Prioritize actions",
          feedback: "Mark the most critical first steps as high priority. What must happen this week for the project to succeed?",
        });
      }
      if (highActions.length > 3) {
        suggestions.push({
          label: "Focus priorities",
          feedback: `${highActions.length} items are marked high priority. Narrow it to the top 2-3 most critical. Not everything can be urgent.`,
        });
      }
      if (plan.ops_pulse.questions.length < 2) {
        suggestions.push({
          label: "Surface unknowns",
          feedback: "What decisions still need human input? Think: budget approvals, tool selection, team assignments, and vendor contracts.",
        });
      }
      if (!plan.ops_pulse.executive_summary) {
        suggestions.push({
          label: "Add executive summary",
          feedback: "Add a 4-sentence executive summary: problem statement, proposed solution, expected impact (with numbers), and immediate next step.",
        });
      }
      break;
    }
  }

  // Always offer these as fallbacks if we have fewer than 2 suggestions
  if (suggestions.length < 2) {
    suggestions.push({
      label: "Add industry specifics",
      feedback: "Make this more specific to our industry. What terminology, tools, and workflows are standard in our field?",
    });
  }
  if (suggestions.length < 3) {
    suggestions.push({
      label: "Consider edge cases",
      feedback: "What happens when things go wrong? Add handling for: late arrivals, incomplete data, system outages, and staff unavailability.",
    });
  }

  // Also include relevant cross-section warnings as suggestions
  if (plan.warnings) {
    const sectionWarnings = plan.warnings.filter((w: PlanWarning) => w.section === section);
    for (const warning of sectionWarnings.slice(0, 2)) {
      suggestions.push({
        label: "Fix consistency issue",
        feedback: warning.message,
      });
    }
  }

  return suggestions.slice(0, 4);
}
