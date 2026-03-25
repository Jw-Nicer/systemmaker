/**
 * Agent Evaluation Framework — LLM-as-judge quality assessment.
 *
 * Evaluates agent output quality across multiple dimensions:
 * - Specificity: Are recommendations concrete and actionable?
 * - Completeness: Are all required aspects covered?
 * - Actionability: Can the user act on this immediately?
 * - Coherence: Do sections reference each other consistently?
 *
 * Supports:
 * - Per-section evaluation
 * - Full plan evaluation
 * - Golden test set regression detection
 * - Score tracking for prompt optimization
 */

import { invokeLLM, robustJsonParse } from "./llm-client";
import type { PreviewPlan } from "@/types/preview-plan";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EvalDimension {
  name: string;
  score: number; // 1-5
  feedback: string;
}

export interface EvalResult {
  /** Overall quality score (1-5). */
  overallScore: number;
  /** Per-dimension scores. */
  dimensions: EvalDimension[];
  /** Summary feedback. */
  summary: string;
  /** The model that performed the evaluation. */
  evalModel: string;
  /** Evaluation latency. */
  latencyMs: number;
}

export interface SectionEvalResult extends EvalResult {
  section: string;
}

export interface PlanEvalResult {
  /** Overall plan quality score (1-5). */
  overallScore: number;
  /** Per-section evaluations. */
  sections: SectionEvalResult[];
  /** Cross-section coherence score. */
  coherenceScore: number;
  /** Summary of plan quality. */
  summary: string;
  /** Total evaluation latency. */
  totalLatencyMs: number;
}

export interface GoldenTestCase {
  id: string;
  input: {
    industry: string;
    bottleneck: string;
    current_tools: string;
  };
  /** Minimum acceptable overall score. */
  minScore: number;
  /** Expected characteristics to check for. */
  expectations: string[];
}

export interface GoldenTestResult {
  testCase: GoldenTestCase;
  score: number;
  passed: boolean;
  feedback: string;
}

// ---------------------------------------------------------------------------
// Evaluation prompts
// ---------------------------------------------------------------------------

function buildSectionEvalPrompt(
  section: string,
  sectionData: unknown,
  context: { industry: string; bottleneck: string }
): string {
  return `You are an expert evaluator for operational automation plans.

## Task
Evaluate the quality of the "${section}" section of a preview plan for a ${context.industry} business dealing with: "${context.bottleneck}".

## Section content to evaluate
${JSON.stringify(sectionData, null, 2)}

## Evaluation dimensions
Rate each dimension from 1 (poor) to 5 (excellent):

1. **Specificity**: Are recommendations concrete and specific to this industry/problem? (Not generic)
2. **Completeness**: Are all necessary aspects covered? No obvious gaps?
3. **Actionability**: Can the business owner act on this immediately? Clear next steps?
4. **Realism**: Are timelines, tools, and approaches realistic for a small-to-medium business?

## Instructions
Return ONLY a JSON object with this structure:
{
  "overallScore": <number 1-5>,
  "dimensions": [
    {"name": "specificity", "score": <1-5>, "feedback": "<one sentence>"},
    {"name": "completeness", "score": <1-5>, "feedback": "<one sentence>"},
    {"name": "actionability", "score": <1-5>, "feedback": "<one sentence>"},
    {"name": "realism", "score": <1-5>, "feedback": "<one sentence>"}
  ],
  "summary": "<2-3 sentence overall assessment>"
}`;
}

function buildCoherenceEvalPrompt(plan: PreviewPlan): string {
  return `You are an expert evaluator for operational automation plans.

## Task
Evaluate the cross-section coherence of this preview plan. Check whether sections reference each other consistently.

## Plan sections
### Intake
${JSON.stringify(plan.intake, null, 2)}

### Workflow
${JSON.stringify(plan.workflow, null, 2)}

### Automations
${JSON.stringify(plan.automation, null, 2)}

### Dashboard
${JSON.stringify(plan.dashboard, null, 2)}

### Ops Pulse
${JSON.stringify(plan.ops_pulse, null, 2)}

${plan.roadmap ? `### Implementation Roadmap\n${JSON.stringify(plan.roadmap, null, 2)}` : ""}

## Check these coherence criteria
1. Do automation triggers reference actual workflow stages?
2. Do dashboard KPIs measure fields tracked in the workflow?
3. Do ops pulse actions address identified failure modes?
4. Does the roadmap sequence align with stage dependencies?
5. Are tool recommendations consistent across sections?

## Instructions
Return ONLY a JSON object:
{
  "coherenceScore": <number 1-5>,
  "issues": ["<issue 1>", "<issue 2>", ...],
  "summary": "<2-3 sentence coherence assessment>"
}`;
}

// ---------------------------------------------------------------------------
// Core evaluation functions
// ---------------------------------------------------------------------------

/**
 * Evaluate a single plan section using LLM-as-judge.
 */
export async function evaluateSection(
  section: string,
  sectionData: unknown,
  context: { industry: string; bottleneck: string }
): Promise<SectionEvalResult> {
  const start = Date.now();
  const prompt = buildSectionEvalPrompt(section, sectionData, context);

  try {
    const result = await invokeLLM(prompt, {
      label: `eval:${section}`,
      // Use a different model for evaluation to avoid self-bias
      models: ["gemini-2.0-flash"],
      timeoutMs: 30_000,
    });

    const parsed = robustJsonParse<{
      overallScore: number;
      dimensions: EvalDimension[];
      summary: string;
    }>(result.text);

    return {
      section,
      overallScore: Math.min(5, Math.max(1, parsed.overallScore)),
      dimensions: parsed.dimensions,
      summary: parsed.summary,
      evalModel: result.model,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      section,
      overallScore: 0,
      dimensions: [],
      summary: `Evaluation failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      evalModel: "none",
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Evaluate an entire plan including cross-section coherence.
 */
export async function evaluatePlan(
  plan: PreviewPlan,
  context: { industry: string; bottleneck: string }
): Promise<PlanEvalResult> {
  const start = Date.now();

  // Evaluate sections in parallel
  const sectionEntries: Array<[string, unknown]> = [
    ["intake", plan.intake],
    ["workflow", plan.workflow],
    ["automation", plan.automation],
    ["dashboard", plan.dashboard],
    ["ops_pulse", plan.ops_pulse],
  ];
  if (plan.roadmap) {
    sectionEntries.push(["roadmap", plan.roadmap]);
  }

  const [sectionResults, coherenceResult] = await Promise.all([
    Promise.all(
      sectionEntries.map(([section, data]) =>
        evaluateSection(section, data, context)
      )
    ),
    evaluateCoherence(plan),
  ]);

  const validScores = sectionResults
    .map((r) => r.overallScore)
    .filter((s) => s > 0);
  const avgScore =
    validScores.length > 0
      ? validScores.reduce((a, b) => a + b, 0) / validScores.length
      : 0;

  return {
    overallScore: Math.round(avgScore * 10) / 10,
    sections: sectionResults,
    coherenceScore: coherenceResult.coherenceScore,
    summary: `Plan quality: ${avgScore.toFixed(1)}/5. Coherence: ${coherenceResult.coherenceScore}/5. ${coherenceResult.summary}`,
    totalLatencyMs: Date.now() - start,
  };
}

/**
 * Evaluate cross-section coherence.
 */
async function evaluateCoherence(
  plan: PreviewPlan
): Promise<{ coherenceScore: number; issues: string[]; summary: string }> {
  try {
    const prompt = buildCoherenceEvalPrompt(plan);
    const result = await invokeLLM(prompt, {
      label: "eval:coherence",
      models: ["gemini-2.0-flash"],
      timeoutMs: 30_000,
    });

    return robustJsonParse<{
      coherenceScore: number;
      issues: string[];
      summary: string;
    }>(result.text);
  } catch {
    return {
      coherenceScore: 0,
      issues: ["Coherence evaluation failed"],
      summary: "Could not evaluate coherence.",
    };
  }
}

// ---------------------------------------------------------------------------
// Golden test suite
// ---------------------------------------------------------------------------

/**
 * Pre-defined golden test cases covering key industry × bottleneck combos.
 * Used for regression detection when prompts change.
 */
export const GOLDEN_TEST_CASES: GoldenTestCase[] = [
  {
    id: "construction-scheduling",
    input: {
      industry: "construction",
      bottleneck: "field crew scheduling and dispatch across multiple job sites",
      current_tools: "spreadsheets, text messages, whiteboards",
    },
    minScore: 3.5,
    expectations: [
      "mentions job site coordination",
      "references dispatch or scheduling automation",
      "includes field-to-office data flow",
    ],
  },
  {
    id: "healthcare-intake",
    input: {
      industry: "healthcare",
      bottleneck: "patient intake paperwork and insurance verification delays",
      current_tools: "paper forms, fax machines, manual data entry",
    },
    minScore: 3.5,
    expectations: [
      "mentions HIPAA or compliance",
      "references digital intake forms",
      "includes insurance verification automation",
    ],
  },
  {
    id: "property-management-maintenance",
    input: {
      industry: "property management",
      bottleneck: "maintenance work order tracking from tenant request to completion",
      current_tools: "email, phone calls, AppFolio",
    },
    minScore: 3.5,
    expectations: [
      "mentions tenant communication",
      "references work order lifecycle",
      "includes vendor assignment automation",
    ],
  },
  {
    id: "staffing-timesheets",
    input: {
      industry: "staffing",
      bottleneck: "timesheet collection, approval, and payroll reconciliation",
      current_tools: "email, spreadsheets, manual data entry",
    },
    minScore: 3.5,
    expectations: [
      "mentions timesheet automation",
      "references approval workflows",
      "includes payroll reconciliation",
    ],
  },
  {
    id: "legal-client-intake",
    input: {
      industry: "legal",
      bottleneck: "new client intake and conflict checks taking too long",
      current_tools: "Clio, email, manual conflict searches",
    },
    minScore: 3.5,
    expectations: [
      "mentions conflict check automation",
      "references client onboarding workflow",
      "includes deadline tracking",
    ],
  },
];

/**
 * Run a golden test case and evaluate the result.
 * NOTE: This actually runs the agent pipeline, so it costs API credits.
 * Use sparingly — intended for prompt regression testing.
 */
export async function runGoldenTest(
  testCase: GoldenTestCase,
  runPipeline: (input: {
    industry: string;
    bottleneck: string;
    current_tools: string;
  }) => Promise<PreviewPlan>
): Promise<GoldenTestResult> {
  try {
    const plan = await runPipeline(testCase.input);
    const evalResult = await evaluatePlan(plan, {
      industry: testCase.input.industry,
      bottleneck: testCase.input.bottleneck,
    });

    return {
      testCase,
      score: evalResult.overallScore,
      passed: evalResult.overallScore >= testCase.minScore,
      feedback: evalResult.summary,
    };
  } catch (err) {
    return {
      testCase,
      score: 0,
      passed: false,
      feedback: `Pipeline failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}
