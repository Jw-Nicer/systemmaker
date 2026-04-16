import { describe, expect, it } from "vitest";
import { interpretScore, scoreDimensions, sumScore } from "../e2e/computer-use/harness";
import type { RunMetrics } from "../e2e/computer-use/types";

function baseMetrics(overrides: Partial<RunMetrics> = {}): RunMetrics {
  return {
    success: true,
    time_to_complete_ms: 12_000,
    actions_taken: 8,
    optimal_action_estimate: [6, 10],
    recovery_attempts: 0,
    wrong_clicks_or_wrong_targets: 0,
    validation_errors_triggered: 0,
    stalls_or_timeouts: 0,
    whether_human_intervention_was_needed: false,
    final_state_correctness: "correct",
    ...overrides,
  };
}

describe("computer-use harness scoring", () => {
  it("scores a clean run as ready (12/12)", () => {
    const dims = scoreDimensions(baseMetrics());
    expect(dims.goal_completion).toBe(2);
    expect(dims.ui_grounding).toBe(2);
    expect(dims.interaction_correctness).toBe(2);
    expect(dims.async_handling).toBe(2);
    expect(dims.recovery).toBe(2);
    expect(dims.efficiency).toBe(2);
    const total = sumScore(dims);
    expect(total).toBe(12);
    expect(interpretScore(total)).toBe("ready");
  });

  it("goal failure vetoes readiness even when other dimensions are clean", () => {
    const dims = scoreDimensions(baseMetrics({ success: false }));
    expect(dims.goal_completion).toBe(0);
    // Without the veto, 10/12 would round up to "ready".
    expect(sumScore(dims)).toBe(10);
    expect(interpretScore(sumScore(dims), dims)).toBe("not_reliable");
  });

  it("human intervention lowers goal_completion to 1", () => {
    const dims = scoreDimensions(
      baseMetrics({ whether_human_intervention_was_needed: true })
    );
    expect(dims.goal_completion).toBe(1);
  });

  it("wrong-target clicks penalize ui_grounding and interaction_correctness", () => {
    const dims = scoreDimensions(baseMetrics({ wrong_clicks_or_wrong_targets: 2 }));
    expect(dims.ui_grounding).toBe(0);
    expect(dims.interaction_correctness).toBe(1);
  });

  it("one validation error is survivable; two tips to 1", () => {
    const oneErr = scoreDimensions(baseMetrics({ validation_errors_triggered: 1 }));
    expect(oneErr.interaction_correctness).toBe(1);

    const manyErr = scoreDimensions(
      baseMetrics({
        validation_errors_triggered: 3,
        wrong_clicks_or_wrong_targets: 0,
      })
    );
    expect(manyErr.interaction_correctness).toBe(0);
  });

  it("stalls penalize async_handling", () => {
    const one = scoreDimensions(baseMetrics({ stalls_or_timeouts: 1 }));
    expect(one.async_handling).toBe(1);
    const two = scoreDimensions(baseMetrics({ stalls_or_timeouts: 2 }));
    expect(two.async_handling).toBe(0);
  });

  it("recovery scoring: 0 attempts = 2, 1 attempt = 1, more = 0", () => {
    expect(scoreDimensions(baseMetrics({ recovery_attempts: 0 })).recovery).toBe(2);
    expect(scoreDimensions(baseMetrics({ recovery_attempts: 1 })).recovery).toBe(1);
    expect(scoreDimensions(baseMetrics({ recovery_attempts: 3 })).recovery).toBe(0);
  });

  it("efficiency: within optimal band scores 2; up to 1.5x upper scores 1; beyond scores 0", () => {
    expect(scoreDimensions(baseMetrics({ actions_taken: 10 })).efficiency).toBe(2);
    expect(scoreDimensions(baseMetrics({ actions_taken: 14 })).efficiency).toBe(1);
    expect(scoreDimensions(baseMetrics({ actions_taken: 25 })).efficiency).toBe(0);
  });

  it("interpretScore follows runbook thresholds: 10+ ready, 7-9 brittle, else not_reliable", () => {
    expect(interpretScore(12)).toBe("ready");
    expect(interpretScore(10)).toBe("ready");
    expect(interpretScore(9)).toBe("brittle");
    expect(interpretScore(7)).toBe("brittle");
    expect(interpretScore(6)).toBe("not_reliable");
    expect(interpretScore(0)).toBe("not_reliable");
  });
});
