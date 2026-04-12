/**
 * Pure unit tests for the chat-evals module.
 *
 * These tests do NOT make any LLM calls. They exercise:
 *  - judge prompt generation (snapshot of structure, not exact text)
 *  - parseChatJudgeResponse (happy path + malformed JSON + missing verdicts)
 *  - computeChatScore (weighting math)
 *  - aggregateChatEvalResults (per-phase + per-criterion roll-up)
 *  - runChatEval / runChatEvalSuite with injected fake generate + judge
 *
 * The opt-in LLM harness lives in tests/chat-evals.test.ts and only runs
 * when RUN_LLM_EVALS=1 is set.
 */
import { describe, test } from "vitest";
import assert from "node:assert/strict";
import {
  buildChatJudgePrompt,
  parseChatJudgeResponse,
  computeChatScore,
  aggregateChatEvalResults,
  runChatEval,
  runChatEvalSuite,
  type ChatEvalCase,
  type ChatEvalCriterion,
  type ChatEvalResult,
} from "@/lib/agents/chat-evals";
import { CHAT_EVAL_CASES } from "@/lib/agents/chat-eval-cases";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseCriteria: ChatEvalCriterion[] = [
  { id: "concise", description: "≤ 4 sentences" },
  { id: "no-filler", description: "no filler" },
  { id: "asks-industry", description: "asks about industry" },
];

function fakeCase(overrides: Partial<ChatEvalCase> = {}): ChatEvalCase {
  return {
    id: "test-case",
    phase: "gathering",
    history: [],
    extracted: {},
    userMessage: "hi",
    criteria: baseCriteria,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// buildChatJudgePrompt
// ---------------------------------------------------------------------------

describe("buildChatJudgePrompt", () => {
  test("includes phase, user message, criteria, and response", () => {
    const out = buildChatJudgePrompt(
      fakeCase({
        phase: "gathering",
        userMessage: "construction",
        criteria: [{ id: "asks-bottleneck", description: "asks bottleneck" }],
      }),
      "Construction — what's the main bottleneck?"
    );
    assert.match(out, /Phase\s*\n\s*gathering/i);
    assert.match(out, /Visitor's latest message\s*\n\s*construction/i);
    assert.match(out, /asks-bottleneck/);
    assert.match(out, /Construction — what's the main bottleneck\?/);
  });

  test("includes plan summary only for cases that provide one", () => {
    const without = buildChatJudgePrompt(fakeCase(), "ok");
    assert.doesNotMatch(without, /Plan summary/i);

    const withSummary = buildChatJudgePrompt(
      fakeCase({ phase: "follow_up", planSummary: "Stages: A, B, C" }),
      "ok"
    );
    assert.match(withSummary, /Plan summary/i);
    assert.match(withSummary, /Stages: A, B, C/);
  });

  test("renders empty history as a placeholder", () => {
    const out = buildChatJudgePrompt(fakeCase({ history: [] }), "ok");
    assert.match(out, /no prior messages/);
  });

  test("renders history with Visitor/Agent prefixes", () => {
    const out = buildChatJudgePrompt(
      fakeCase({
        history: [
          { id: "1", role: "user", content: "hi", timestamp: 1 },
          { id: "2", role: "assistant", content: "hello", timestamp: 2 },
        ],
      }),
      "ok"
    );
    assert.match(out, /Visitor: hi/);
    assert.match(out, /Agent: hello/);
  });

  test("returns ONLY-JSON instruction so the judge response stays parseable", () => {
    const out = buildChatJudgePrompt(fakeCase(), "ok");
    assert.match(out, /Return ONLY a JSON object/);
  });
});

// ---------------------------------------------------------------------------
// parseChatJudgeResponse
// ---------------------------------------------------------------------------

describe("parseChatJudgeResponse", () => {
  test("happy path — all criteria covered", () => {
    const raw = JSON.stringify({
      verdicts: [
        { id: "concise", passed: true, rationale: "two sentences" },
        { id: "no-filler", passed: true, rationale: "no filler" },
        { id: "asks-industry", passed: false, rationale: "did not ask" },
      ],
    });
    const verdicts = parseChatJudgeResponse(raw, baseCriteria);
    assert.equal(verdicts.length, 3);
    assert.equal(verdicts[0].passed, true);
    assert.equal(verdicts[2].passed, false);
    assert.equal(verdicts[2].rationale, "did not ask");
  });

  test("malformed JSON → all criteria fail with parse-error rationale", () => {
    const verdicts = parseChatJudgeResponse("not json at all", baseCriteria);
    assert.equal(verdicts.length, 3);
    for (const v of verdicts) {
      assert.equal(v.passed, false);
      assert.match(v.rationale, /not valid JSON/);
    }
  });

  test("missing criterion in judge response → backfills as failure", () => {
    const raw = JSON.stringify({
      verdicts: [
        { id: "concise", passed: true, rationale: "ok" },
      ],
    });
    const verdicts = parseChatJudgeResponse(raw, baseCriteria);
    assert.equal(verdicts.length, 3);
    assert.equal(verdicts[0].passed, true);
    assert.equal(verdicts[1].passed, false);
    assert.match(verdicts[1].rationale, /did not return a verdict/i);
  });

  test("verdicts arrive in expected criteria order regardless of judge order", () => {
    const raw = JSON.stringify({
      verdicts: [
        { id: "asks-industry", passed: true, rationale: "yes" },
        { id: "concise", passed: true, rationale: "yes" },
        { id: "no-filler", passed: false, rationale: "filler" },
      ],
    });
    const verdicts = parseChatJudgeResponse(raw, baseCriteria);
    assert.deepEqual(
      verdicts.map((v) => v.id),
      ["concise", "no-filler", "asks-industry"]
    );
  });

  test("non-string rationale gets a placeholder", () => {
    const raw = JSON.stringify({
      verdicts: [
        { id: "concise", passed: true, rationale: 123 },
        { id: "no-filler", passed: false },
        { id: "asks-industry", passed: true, rationale: "ok" },
      ],
    });
    const verdicts = parseChatJudgeResponse(raw, baseCriteria);
    assert.equal(verdicts[0].rationale, "(no rationale)");
    assert.equal(verdicts[1].rationale, "(no rationale)");
    assert.equal(verdicts[2].rationale, "ok");
  });

  test("coerces truthy/falsy passed values to boolean", () => {
    const raw = JSON.stringify({
      verdicts: [
        { id: "concise", passed: 1, rationale: "x" },
        { id: "no-filler", passed: 0, rationale: "x" },
        { id: "asks-industry", passed: "true", rationale: "x" },
      ],
    });
    const verdicts = parseChatJudgeResponse(raw, baseCriteria);
    assert.equal(verdicts[0].passed, true);
    assert.equal(verdicts[1].passed, false);
    assert.equal(verdicts[2].passed, true); // any truthy string
  });
});

// ---------------------------------------------------------------------------
// computeChatScore
// ---------------------------------------------------------------------------

describe("computeChatScore", () => {
  test("returns 1.0 when all verdicts pass", () => {
    const verdicts = baseCriteria.map((c) => ({
      id: c.id,
      passed: true,
      rationale: "ok",
    }));
    assert.equal(computeChatScore(baseCriteria, verdicts), 1);
  });

  test("returns 0 when all verdicts fail", () => {
    const verdicts = baseCriteria.map((c) => ({
      id: c.id,
      passed: false,
      rationale: "no",
    }));
    assert.equal(computeChatScore(baseCriteria, verdicts), 0);
  });

  test("computes pass rate proportionally for unweighted criteria", () => {
    const verdicts = [
      { id: "concise", passed: true, rationale: "" },
      { id: "no-filler", passed: false, rationale: "" },
      { id: "asks-industry", passed: true, rationale: "" },
    ];
    // 2 of 3 = 0.667
    assert.equal(computeChatScore(baseCriteria, verdicts), 0.667);
  });

  test("respects weights", () => {
    const weighted: ChatEvalCriterion[] = [
      { id: "important", description: "x", weight: 3 },
      { id: "minor", description: "y", weight: 1 },
    ];
    // important fails, minor passes → 1 of 4 weighted = 0.25
    const verdicts = [
      { id: "important", passed: false, rationale: "" },
      { id: "minor", passed: true, rationale: "" },
    ];
    assert.equal(computeChatScore(weighted, verdicts), 0.25);
  });

  test("returns 0 for empty criteria list", () => {
    assert.equal(computeChatScore([], []), 0);
  });

  test("missing verdict counts as fail (defensive)", () => {
    const verdicts = [{ id: "concise", passed: true, rationale: "" }];
    // Only 1 of 3 verdicts present, the other 2 default to fail
    assert.equal(computeChatScore(baseCriteria, verdicts), 0.333);
  });
});

// ---------------------------------------------------------------------------
// aggregateChatEvalResults
// ---------------------------------------------------------------------------

function fakeResult(
  overrides: Partial<ChatEvalResult> & { caseId: string }
): ChatEvalResult {
  return {
    phase: "gathering",
    response: "...",
    verdicts: [],
    score: 0,
    passed: false,
    latencyMs: 0,
    ...overrides,
  };
}

describe("aggregateChatEvalResults", () => {
  test("computes overall pass rate", () => {
    const agg = aggregateChatEvalResults([
      fakeResult({ caseId: "a", passed: true }),
      fakeResult({ caseId: "b", passed: true }),
      fakeResult({ caseId: "c", passed: false }),
      fakeResult({ caseId: "d", passed: false }),
    ]);
    assert.equal(agg.totalCases, 4);
    assert.equal(agg.passedCases, 2);
    assert.equal(agg.failedCases, 2);
    assert.equal(agg.passRate, 0.5);
  });

  test("buckets by phase", () => {
    const agg = aggregateChatEvalResults([
      fakeResult({ caseId: "g1", phase: "gathering", passed: true }),
      fakeResult({ caseId: "g2", phase: "gathering", passed: false }),
      fakeResult({ caseId: "c1", phase: "confirming", passed: true }),
      fakeResult({ caseId: "f1", phase: "follow_up", passed: true }),
      fakeResult({ caseId: "f2", phase: "follow_up", passed: true }),
    ]);
    assert.equal(agg.passRateByPhase.gathering.total, 2);
    assert.equal(agg.passRateByPhase.gathering.passed, 1);
    assert.equal(agg.passRateByPhase.gathering.rate, 0.5);
    assert.equal(agg.passRateByPhase.confirming.passed, 1);
    assert.equal(agg.passRateByPhase.confirming.rate, 1);
    assert.equal(agg.passRateByPhase.follow_up.passed, 2);
    assert.equal(agg.passRateByPhase.follow_up.rate, 1);
    // Building / complete should be present but empty
    assert.equal(agg.passRateByPhase.building.total, 0);
    assert.equal(agg.passRateByPhase.building.rate, 0);
  });

  test("buckets by criterion across all results", () => {
    const agg = aggregateChatEvalResults([
      fakeResult({
        caseId: "a",
        passed: false,
        verdicts: [
          { id: "concise", passed: true, rationale: "" },
          { id: "no-filler", passed: false, rationale: "" },
        ],
      }),
      fakeResult({
        caseId: "b",
        passed: true,
        verdicts: [
          { id: "concise", passed: true, rationale: "" },
          { id: "no-filler", passed: true, rationale: "" },
        ],
      }),
    ]);
    assert.equal(agg.passRateByCriterion.concise.total, 2);
    assert.equal(agg.passRateByCriterion.concise.passed, 2);
    assert.equal(agg.passRateByCriterion.concise.rate, 1);
    assert.equal(agg.passRateByCriterion["no-filler"].passed, 1);
    assert.equal(agg.passRateByCriterion["no-filler"].rate, 0.5);
  });

  test("handles empty input", () => {
    const agg = aggregateChatEvalResults([]);
    assert.equal(agg.totalCases, 0);
    assert.equal(agg.passRate, 0);
  });
});

// ---------------------------------------------------------------------------
// runChatEval — with injected fake generate + judge
// ---------------------------------------------------------------------------

describe("runChatEval (with injected dependencies)", () => {
  test("end-to-end pass with all-true judge", async () => {
    const result = await runChatEval(fakeCase(), {
      generateResponse: async () => "What kind of business do you run?",
      judge: async () =>
        JSON.stringify({
          verdicts: baseCriteria.map((c) => ({
            id: c.id,
            passed: true,
            rationale: "ok",
          })),
        }),
    });
    assert.equal(result.passed, true);
    assert.equal(result.score, 1);
    assert.equal(result.response, "What kind of business do you run?");
    assert.equal(result.verdicts.length, 3);
  });

  test("end-to-end fail when judge marks one criterion failing", async () => {
    const result = await runChatEval(fakeCase(), {
      generateResponse: async () => "Hi!",
      judge: async () =>
        JSON.stringify({
          verdicts: [
            { id: "concise", passed: true, rationale: "" },
            { id: "no-filler", passed: false, rationale: "filler word" },
            { id: "asks-industry", passed: true, rationale: "" },
          ],
        }),
    });
    assert.equal(result.passed, false);
    assert.equal(result.score, 0.667);
  });

  test("generation failure → all criteria fail with generation error", async () => {
    const result = await runChatEval(fakeCase(), {
      generateResponse: async () => {
        throw new Error("network blip");
      },
      judge: async () => "{}",
    });
    assert.equal(result.passed, false);
    assert.equal(result.score, 0);
    assert.equal(result.response, "");
    assert.match(result.verdicts[0].rationale, /Response generation failed/);
  });

  test("judge failure → all criteria fail with judge error", async () => {
    const result = await runChatEval(fakeCase(), {
      generateResponse: async () => "Hi there",
      judge: async () => {
        throw new Error("judge timeout");
      },
    });
    assert.equal(result.passed, false);
    assert.equal(result.response, "Hi there");
    assert.match(result.verdicts[0].rationale, /Judge call failed/);
  });
});

// ---------------------------------------------------------------------------
// runChatEvalSuite — concurrency + aggregation
// ---------------------------------------------------------------------------

describe("runChatEvalSuite (with injected dependencies)", () => {
  test("runs every case and produces a complete summary", async () => {
    const cases = [
      fakeCase({ id: "a", phase: "gathering" }),
      fakeCase({ id: "b", phase: "gathering" }),
      fakeCase({ id: "c", phase: "confirming" }),
      fakeCase({ id: "d", phase: "follow_up" }),
    ];
    const summary = await runChatEvalSuite(cases, {
      concurrency: 2,
      generateResponse: async (tc) => `response for ${tc.id}`,
      judge: async (tc) =>
        JSON.stringify({
          // "a" fails its first criterion, others pass
          verdicts: tc.criteria.map((c, i) => ({
            id: c.id,
            passed: !(tc.id === "a" && i === 0),
            rationale: "",
          })),
        }),
    });

    assert.equal(summary.totalCases, 4);
    assert.equal(summary.passedCases, 3);
    assert.equal(summary.passRate, 0.75);
    assert.equal(summary.results.length, 4);
    assert.ok(summary.totalLatencyMs >= 0);
  });

  test("handles concurrency=1 (sequential)", async () => {
    const order: string[] = [];
    const cases = [
      fakeCase({ id: "first" }),
      fakeCase({ id: "second" }),
      fakeCase({ id: "third" }),
    ];
    await runChatEvalSuite(cases, {
      concurrency: 1,
      generateResponse: async (tc) => {
        order.push(tc.id);
        return "ok";
      },
      judge: async () =>
        JSON.stringify({
          verdicts: baseCriteria.map((c) => ({
            id: c.id,
            passed: true,
            rationale: "",
          })),
        }),
    });
    assert.deepEqual(order, ["first", "second", "third"]);
  });

  test("handles empty case list", async () => {
    const summary = await runChatEvalSuite([], {
      generateResponse: async () => "x",
      judge: async () => "{}",
    });
    assert.equal(summary.totalCases, 0);
    assert.equal(summary.passRate, 0);
  });
});

// ---------------------------------------------------------------------------
// CHAT_EVAL_CASES — sanity check on the curated suite
// ---------------------------------------------------------------------------

describe("CHAT_EVAL_CASES golden suite", () => {
  test("contains at least 20 cases", () => {
    assert.ok(
      CHAT_EVAL_CASES.length >= 20,
      `expected ≥ 20 cases, got ${CHAT_EVAL_CASES.length}`
    );
  });

  test("covers all three conversational phases", () => {
    const phases = new Set(CHAT_EVAL_CASES.map((c) => c.phase));
    assert.ok(phases.has("gathering"));
    assert.ok(phases.has("confirming"));
    assert.ok(phases.has("follow_up"));
  });

  test("every case id is unique", () => {
    const ids = CHAT_EVAL_CASES.map((c) => c.id);
    const unique = new Set(ids);
    assert.equal(unique.size, ids.length, "duplicate case ids");
  });

  test("every case has at least one criterion", () => {
    for (const c of CHAT_EVAL_CASES) {
      assert.ok(
        c.criteria.length > 0,
        `case ${c.id} has no criteria`
      );
    }
  });

  test("every case has a non-empty userMessage", () => {
    for (const c of CHAT_EVAL_CASES) {
      assert.ok(
        c.userMessage.trim().length > 0,
        `case ${c.id} has empty userMessage`
      );
    }
  });
});
