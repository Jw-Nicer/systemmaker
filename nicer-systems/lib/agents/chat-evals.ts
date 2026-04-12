/**
 * Chat-agent evaluation suite — LLM-as-judge for conversational responses.
 *
 * Complements `evals.ts` (which scores generated plans). This module scores
 * the agent's PER-TURN replies during gathering, confirming, and follow_up.
 *
 * Each ChatEvalCase pins a phase, conversation history, extracted state,
 * and a list of criteria the response must satisfy. The judge LLM scores
 * each criterion pass/fail with a one-sentence rationale.
 *
 * Run via:
 *  - `scripts/run-chat-evals.ts` (CLI, dev/CI)
 *  - `tests/chat-evals.test.ts` gated by `RUN_LLM_EVALS=1`
 *
 * Test cases live in `chat-eval-cases.ts`.
 */
import type {
  ChatMessage,
  ConversationPhase,
  ExtractedIntake,
} from "@/types/chat";
import { generateConversationalResponse } from "./conversation";
import { invokeLLM, robustJsonParse } from "./llm-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatEvalCriterion {
  /** Short id used in aggregate reports (e.g. "asks-missing-field"). */
  id: string;
  /** Plain-English description the judge evaluates against. */
  description: string;
  /** Optional weight for the suite-level score (default 1). */
  weight?: number;
}

export interface ChatEvalCase {
  id: string;
  phase: ConversationPhase;
  /** Prior turns in the conversation (excluding the latest user message). */
  history: ChatMessage[];
  extracted: ExtractedIntake;
  /** The visitor's latest message — the agent's response is what we score. */
  userMessage: string;
  /** Criteria the response must satisfy. */
  criteria: ChatEvalCriterion[];
  /** Optional plan summary for follow_up cases. */
  planSummary?: string;
}

export interface ChatCriterionVerdict {
  id: string;
  passed: boolean;
  rationale: string;
}

export interface ChatEvalResult {
  caseId: string;
  phase: ConversationPhase;
  /** The actual response text the agent produced. */
  response: string;
  /** Per-criterion verdicts. */
  verdicts: ChatCriterionVerdict[];
  /** Weighted pass rate (0-1). */
  score: number;
  /** True iff every criterion passed. */
  passed: boolean;
  /** Wall-clock latency. */
  latencyMs: number;
}

export interface PhaseAggregate {
  total: number;
  passed: number;
  rate: number;
}

export interface ChatEvalSuiteSummary {
  totalCases: number;
  passedCases: number;
  failedCases: number;
  passRate: number;
  /** Per-phase pass rate. */
  passRateByPhase: Record<ConversationPhase, PhaseAggregate>;
  /** Per-criterion pass rate across all cases. */
  passRateByCriterion: Record<string, PhaseAggregate>;
  /** All individual results. */
  results: ChatEvalResult[];
  /** Total wall-clock time. */
  totalLatencyMs: number;
}

// ---------------------------------------------------------------------------
// Judge prompt
// ---------------------------------------------------------------------------

export function buildChatJudgePrompt(
  testCase: ChatEvalCase,
  response: string
): string {
  const historyText =
    testCase.history.length > 0
      ? testCase.history
          .map((m) => `${m.role === "user" ? "Visitor" : "Agent"}: ${m.content}`)
          .join("\n")
      : "(no prior messages)";

  const extractedJson = JSON.stringify(testCase.extracted, null, 2);

  const criteriaList = testCase.criteria
    .map((c, i) => `${i + 1}. **${c.id}** — ${c.description}`)
    .join("\n");

  return `You are an expert evaluator for a conversational sales-intake AI. Score the agent's response against each listed criterion.

## Phase
${testCase.phase}

## Conversation history
${historyText}

## Visitor's latest message
${testCase.userMessage}

## Already-extracted intake state
${extractedJson}
${testCase.planSummary ? `\n## Plan summary (for follow_up only)\n${testCase.planSummary}\n` : ""}
## Agent response under evaluation
${response}

## Criteria to score
${criteriaList}

## Instructions
For each criterion, decide if the agent response satisfies it (pass) or not (fail). Return ONLY a JSON object with this shape:
{
  "verdicts": [
    {"id": "<criterion id>", "passed": <true|false>, "rationale": "<one short sentence>"}
  ]
}
Be strict but fair. A response that PARTIALLY satisfies a criterion should fail that criterion. No markdown, no commentary outside the JSON.`;
}

// ---------------------------------------------------------------------------
// Judge response parsing
// ---------------------------------------------------------------------------

interface RawJudgeResponse {
  verdicts?: Array<{
    id?: unknown;
    passed?: unknown;
    rationale?: unknown;
  }>;
}

export function parseChatJudgeResponse(
  raw: string,
  expectedCriteria: ChatEvalCriterion[]
): ChatCriterionVerdict[] {
  let parsed: RawJudgeResponse;
  try {
    parsed = robustJsonParse<RawJudgeResponse>(raw);
  } catch {
    // Malformed judge output → fail every criterion with a parse-error rationale.
    return expectedCriteria.map((c) => ({
      id: c.id,
      passed: false,
      rationale: "Judge response was not valid JSON",
    }));
  }

  const verdictMap = new Map<string, { passed: boolean; rationale: string }>();
  for (const v of parsed.verdicts ?? []) {
    if (!v || typeof v.id !== "string") continue;
    verdictMap.set(v.id, {
      passed: Boolean(v.passed),
      rationale:
        typeof v.rationale === "string" ? v.rationale : "(no rationale)",
    });
  }

  // Return verdicts in the same order as expectedCriteria; missing criteria
  // get a fail with a placeholder rationale so the report is complete.
  return expectedCriteria.map((c) => {
    const v = verdictMap.get(c.id);
    if (v) return { id: c.id, ...v };
    return {
      id: c.id,
      passed: false,
      rationale: "Judge did not return a verdict for this criterion",
    };
  });
}

// ---------------------------------------------------------------------------
// Single-case scoring
// ---------------------------------------------------------------------------

/**
 * Compute the weighted pass rate from a list of verdicts. Each criterion's
 * weight defaults to 1. Returns a value in [0, 1] rounded to 3 decimals.
 */
export function computeChatScore(
  criteria: ChatEvalCriterion[],
  verdicts: ChatCriterionVerdict[]
): number {
  let totalWeight = 0;
  let passedWeight = 0;
  for (const c of criteria) {
    const w = c.weight ?? 1;
    totalWeight += w;
    const v = verdicts.find((x) => x.id === c.id);
    if (v?.passed) passedWeight += w;
  }
  if (totalWeight === 0) return 0;
  return Math.round((passedWeight / totalWeight) * 1000) / 1000;
}

// ---------------------------------------------------------------------------
// End-to-end runner
// ---------------------------------------------------------------------------

export interface RunChatEvalOptions {
  /** Override the response generator (for unit tests / dry runs). */
  generateResponse?: (testCase: ChatEvalCase) => Promise<string>;
  /** Override the judge call (for unit tests / dry runs). */
  judge?: (testCase: ChatEvalCase, response: string) => Promise<string>;
}

const DEFAULT_GENERATE: NonNullable<RunChatEvalOptions["generateResponse"]> =
  async (testCase) => {
    const chunks: string[] = [];
    for await (const chunk of generateConversationalResponse(
      testCase.phase,
      testCase.history,
      testCase.extracted,
      testCase.userMessage,
      testCase.planSummary ? { planSummary: testCase.planSummary } : undefined
    )) {
      chunks.push(chunk);
    }
    return chunks.join("");
  };

const DEFAULT_JUDGE: NonNullable<RunChatEvalOptions["judge"]> = async (
  testCase,
  response
) => {
  const prompt = buildChatJudgePrompt(testCase, response);
  const result = await invokeLLM(prompt, {
    label: `chat-eval:${testCase.id}`,
    // Different model from the agent under test → reduces self-bias.
    models: ["gemini-2.5-flash-lite"],
    timeoutMs: 30_000,
  });
  return result.text;
};

export async function runChatEval(
  testCase: ChatEvalCase,
  options: RunChatEvalOptions = {}
): Promise<ChatEvalResult> {
  const start = Date.now();
  const generate = options.generateResponse ?? DEFAULT_GENERATE;
  const judge = options.judge ?? DEFAULT_JUDGE;

  let response: string;
  try {
    response = await generate(testCase);
  } catch (err) {
    return {
      caseId: testCase.id,
      phase: testCase.phase,
      response: "",
      verdicts: testCase.criteria.map((c) => ({
        id: c.id,
        passed: false,
        rationale: `Response generation failed: ${err instanceof Error ? err.message : "unknown"}`,
      })),
      score: 0,
      passed: false,
      latencyMs: Date.now() - start,
    };
  }

  let rawJudge: string;
  try {
    rawJudge = await judge(testCase, response);
  } catch (err) {
    return {
      caseId: testCase.id,
      phase: testCase.phase,
      response,
      verdicts: testCase.criteria.map((c) => ({
        id: c.id,
        passed: false,
        rationale: `Judge call failed: ${err instanceof Error ? err.message : "unknown"}`,
      })),
      score: 0,
      passed: false,
      latencyMs: Date.now() - start,
    };
  }

  const verdicts = parseChatJudgeResponse(rawJudge, testCase.criteria);
  const score = computeChatScore(testCase.criteria, verdicts);
  const passed = verdicts.every((v) => v.passed);

  return {
    caseId: testCase.id,
    phase: testCase.phase,
    response,
    verdicts,
    score,
    passed,
    latencyMs: Date.now() - start,
  };
}

// ---------------------------------------------------------------------------
// Suite runner + aggregation
// ---------------------------------------------------------------------------

const ALL_PHASES: ConversationPhase[] = [
  "gathering",
  "confirming",
  "building",
  "complete",
  "follow_up",
];

function emptyPhaseAggregate(): PhaseAggregate {
  return { total: 0, passed: 0, rate: 0 };
}

export function aggregateChatEvalResults(
  results: ChatEvalResult[]
): Omit<ChatEvalSuiteSummary, "totalLatencyMs"> {
  const total = results.length;
  const passedCases = results.filter((r) => r.passed).length;

  // Per-phase
  const passRateByPhase = ALL_PHASES.reduce(
    (acc, phase) => {
      acc[phase] = emptyPhaseAggregate();
      return acc;
    },
    {} as Record<ConversationPhase, PhaseAggregate>
  );
  for (const r of results) {
    const bucket = passRateByPhase[r.phase];
    if (!bucket) continue;
    bucket.total++;
    if (r.passed) bucket.passed++;
  }
  for (const phase of ALL_PHASES) {
    const bucket = passRateByPhase[phase];
    bucket.rate =
      bucket.total === 0
        ? 0
        : Math.round((bucket.passed / bucket.total) * 1000) / 1000;
  }

  // Per-criterion
  const passRateByCriterion: Record<string, PhaseAggregate> = {};
  for (const r of results) {
    for (const v of r.verdicts) {
      if (!passRateByCriterion[v.id]) {
        passRateByCriterion[v.id] = emptyPhaseAggregate();
      }
      passRateByCriterion[v.id].total++;
      if (v.passed) passRateByCriterion[v.id].passed++;
    }
  }
  for (const id of Object.keys(passRateByCriterion)) {
    const bucket = passRateByCriterion[id];
    bucket.rate =
      bucket.total === 0
        ? 0
        : Math.round((bucket.passed / bucket.total) * 1000) / 1000;
  }

  return {
    totalCases: total,
    passedCases,
    failedCases: total - passedCases,
    passRate:
      total === 0 ? 0 : Math.round((passedCases / total) * 1000) / 1000,
    passRateByPhase,
    passRateByCriterion,
    results,
  };
}

const DEFAULT_CONCURRENCY = 4;

export async function runChatEvalSuite(
  cases: ChatEvalCase[],
  options: RunChatEvalOptions & { concurrency?: number } = {}
): Promise<ChatEvalSuiteSummary> {
  const start = Date.now();
  const concurrency = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY);

  const results: ChatEvalResult[] = [];
  for (let i = 0; i < cases.length; i += concurrency) {
    const batch = cases.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((tc) => runChatEval(tc, options))
    );
    results.push(...batchResults);
  }

  const aggregate = aggregateChatEvalResults(results);
  return {
    ...aggregate,
    totalLatencyMs: Date.now() - start,
  };
}
