/**
 * Opt-in vitest harness for the chat eval suite.
 *
 * Skipped by default — set RUN_LLM_EVALS=1 to actually invoke Gemini for
 * both the agent under test and the judge. Requires GOOGLE_GEMINI_API_KEY.
 *
 * Use this harness when you want eval results inside your normal test
 * runner; use scripts/run-chat-evals.ts for ad-hoc CLI runs with the
 * pretty colored summary table.
 */
import { describe, test, expect } from "vitest";
import { runChatEvalSuite } from "@/lib/agents/chat-evals";
import { CHAT_EVAL_CASES } from "@/lib/agents/chat-eval-cases";

const ENABLED = process.env.RUN_LLM_EVALS === "1";
const PASS_THRESHOLD = Number.parseFloat(
  process.env.LLM_EVAL_THRESHOLD ?? "0.8"
);

describe.skipIf(!ENABLED)("chat eval suite (LLM)", () => {
  test(
    `pass rate ≥ ${(PASS_THRESHOLD * 100).toFixed(0)}% across ${CHAT_EVAL_CASES.length} cases`,
    async () => {
      const summary = await runChatEvalSuite(CHAT_EVAL_CASES, {
        concurrency: 4,
      });

      // Always log the summary so failures show what regressed
      console.log("\n=== Chat Eval Summary ===");
      console.log(
        `Cases:        ${summary.passedCases}/${summary.totalCases} passed (${(summary.passRate * 100).toFixed(1)}%)`
      );
      console.log(`Latency:      ${(summary.totalLatencyMs / 1000).toFixed(1)}s`);
      console.log("Per phase:");
      for (const [phase, agg] of Object.entries(summary.passRateByPhase)) {
        if (agg.total === 0) continue;
        console.log(
          `  ${phase}: ${agg.passed}/${agg.total} (${(agg.rate * 100).toFixed(1)}%)`
        );
      }
      console.log("Per criterion:");
      const sortedCriteria = Object.entries(summary.passRateByCriterion).sort(
        (a, b) => a[1].rate - b[1].rate
      );
      for (const [id, agg] of sortedCriteria) {
        console.log(
          `  ${id}: ${agg.passed}/${agg.total} (${(agg.rate * 100).toFixed(1)}%)`
        );
      }

      // Failed cases first so the dump is useful
      const failed = summary.results.filter((r) => !r.passed);
      if (failed.length > 0) {
        console.log(`\n${failed.length} failed cases:`);
        for (const r of failed) {
          console.log(`  ✗ ${r.caseId} (${r.phase})`);
          for (const v of r.verdicts.filter((v) => !v.passed)) {
            console.log(`      - ${v.id}: ${v.rationale}`);
          }
        }
      }

      expect(summary.passRate).toBeGreaterThanOrEqual(PASS_THRESHOLD);
    },
    10 * 60 * 1000 // up to 10 minutes for the full suite
  );
});

// When the suite is disabled we still want a single passing test so vitest
// reports a known-good state instead of "no tests".
describe.skipIf(ENABLED)("chat eval suite (disabled)", () => {
  test("LLM eval harness present but disabled — set RUN_LLM_EVALS=1 to enable", () => {
    expect(CHAT_EVAL_CASES.length).toBeGreaterThan(0);
  });
});
