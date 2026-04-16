import { describe, expect, it } from "vitest";
import {
  aggregateTraceDocs,
  type PersistedTraceDoc,
} from "../lib/firestore/traces";

function doc(overrides: Partial<PersistedTraceDoc>): PersistedTraceDoc {
  return {
    status: "completed",
    totalLatencyMs: 10_000,
    started_at: new Date("2026-04-15T12:00:00Z"),
    spans: [],
    ...overrides,
  };
}

describe("pipeline metrics aggregation", () => {
  it("returns empty metrics for an empty trace set", () => {
    const result = aggregateTraceDocs([], 7);
    expect(result.totalPlans).toBe(0);
    expect(result.stageStats).toEqual([]);
    expect(result.failureRate).toBe(0);
    expect(result.windowDays).toBe(7);
  });

  it("computes stage failure rates and sorts most-failing first", () => {
    const docs: PersistedTraceDoc[] = [
      doc({
        spans: [
          { stage: "intake", status: "completed", latencyMs: 2000 },
          { stage: "workflow", status: "failed", latencyMs: 1500 },
        ],
      }),
      doc({
        spans: [
          { stage: "intake", status: "completed", latencyMs: 2200 },
          { stage: "workflow", status: "completed", latencyMs: 1800 },
        ],
      }),
      doc({
        spans: [
          { stage: "intake", status: "completed", latencyMs: 1800 },
          { stage: "workflow", status: "failed", latencyMs: 1600 },
        ],
      }),
    ];

    const result = aggregateTraceDocs(docs, 7);

    expect(result.stageStats.map((s) => s.stage)).toEqual(["workflow", "intake"]);

    const workflow = result.stageStats.find((s) => s.stage === "workflow")!;
    expect(workflow.runs).toBe(3);
    expect(workflow.failures).toBe(2);
    // 2 / 3 = 66.67% (rounded to 2dp)
    expect(workflow.failureRate).toBeCloseTo(66.67, 1);
    expect(workflow.avgLatencyMs).toBe(Math.round((1500 + 1800 + 1600) / 3));

    const intake = result.stageStats.find((s) => s.stage === "intake")!;
    expect(intake.failureRate).toBe(0);
    expect(intake.runs).toBe(3);
  });

  it("separates degraded from failed in per-stage counts", () => {
    const docs: PersistedTraceDoc[] = [
      doc({
        spans: [
          { stage: "automation", status: "degraded", latencyMs: 1000 },
          { stage: "automation", status: "completed", latencyMs: 1200 },
        ],
      }),
      doc({
        spans: [
          { stage: "automation", status: "completed", latencyMs: 900 },
        ],
      }),
    ];

    const result = aggregateTraceDocs(docs, 7);
    const automation = result.stageStats.find((s) => s.stage === "automation")!;
    expect(automation.runs).toBe(3);
    expect(automation.failures).toBe(0);
    expect(automation.degradations).toBe(1);
    expect(automation.failureRate).toBe(0);
    expect(automation.degradationRate).toBeCloseTo(33.33, 1);
  });

  it("computes pipeline-level latency and failure rate", () => {
    const docs: PersistedTraceDoc[] = [
      doc({ totalLatencyMs: 10_000, status: "completed" }),
      doc({ totalLatencyMs: 20_000, status: "completed" }),
      doc({ totalLatencyMs: 30_000, status: "completed" }),
      doc({ totalLatencyMs: 40_000, status: "failed" }),
    ];

    const result = aggregateTraceDocs(docs, 7);
    expect(result.totalPlans).toBe(4);
    expect(result.avgLatencyMs).toBe(25_000);
    expect(result.failureRate).toBe(25);
    // 4 runs over 7 days = 0.6/day (rounded to 1dp)
    expect(result.plansPerDay).toBeCloseTo(0.6, 1);
  });

  it("counts plansToday using the provided `now` override", () => {
    const now = new Date("2026-04-15T15:00:00Z").getTime();
    const docs: PersistedTraceDoc[] = [
      doc({ started_at: new Date("2026-04-15T01:00:00Z") }),
      doc({ started_at: new Date("2026-04-15T10:00:00Z") }),
      doc({ started_at: new Date("2026-04-14T23:59:59Z") }), // yesterday UTC
    ];

    const result = aggregateTraceDocs(docs, 7, now);
    expect(result.plansToday).toBe(2);
  });

  it("tolerates legacy docs with a Firestore Timestamp-like object", () => {
    const docs: PersistedTraceDoc[] = [
      {
        totalLatencyMs: 5_000,
        status: "completed",
        started_at: {
          toDate: () => new Date("2026-04-15T10:00:00Z"),
        },
        spans: [{ stage: "intake", status: "completed", latencyMs: 1000 }],
      },
    ];

    const now = new Date("2026-04-15T15:00:00Z").getTime();
    const result = aggregateTraceDocs(docs, 7, now);
    expect(result.plansToday).toBe(1);
    expect(result.stageStats[0].stage).toBe("intake");
  });

  it("ignores malformed spans without crashing", () => {
    // Cast through unknown because the malformed shapes (null, missing
    // `stage`) are intentionally outside the declared span type.
    const docs: PersistedTraceDoc[] = [
      doc({
        spans: [
          { stage: "intake", status: "completed", latencyMs: 1000 },
          { status: "completed" } as unknown as { stage: string }, // missing stage
          null as unknown as { stage: string },
          { stage: "workflow" }, // missing status + latencyMs
        ],
      }),
    ];

    const result = aggregateTraceDocs(docs, 7);
    const stages = result.stageStats.map((s) => s.stage);
    expect(stages).toContain("intake");
    expect(stages).toContain("workflow");
    // workflow had no latency → avgLatencyMs is 0
    expect(
      result.stageStats.find((s) => s.stage === "workflow")!.avgLatencyMs
    ).toBe(0);
  });
});
