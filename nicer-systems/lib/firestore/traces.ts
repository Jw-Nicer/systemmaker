/**
 * Pipeline trace persistence — writes agent traces to Firestore for
 * metrics aggregation. Fire-and-forget writes; never blocks the pipeline.
 */

import { getAdminDb, FieldValue } from "@/lib/firebase/admin";
import type { AgentTrace } from "@/lib/agents/tracing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StageStats {
  /** Stage key (e.g. "intake", "workflow") */
  stage: string;
  /** Total spans observed for this stage */
  runs: number;
  /** Spans that ended with status === "failed" */
  failures: number;
  /** Spans that ended with status === "degraded" */
  degradations: number;
  /** Percentage of runs that failed outright (0–100) */
  failureRate: number;
  /** Percentage of runs that completed but in a degraded state (0–100) */
  degradationRate: number;
  /** Average latency of this stage's spans in ms */
  avgLatencyMs: number;
}

export interface PipelineMetrics {
  /** Total pipeline traces in the window */
  totalPlans: number;
  /** Average end-to-end latency in ms */
  avgLatencyMs: number;
  /** 95th percentile latency in ms */
  p95LatencyMs: number;
  /** Percentage of traces that failed (0–100) */
  failureRate: number;
  /** Average plans per day in the window */
  plansPerDay: number;
  /** Total plans generated today (UTC) */
  plansToday: number;
  /** Per-stage run counts, failure rates, and latency, sorted by failureRate desc */
  stageStats: StageStats[];
  /** Window size in days */
  windowDays: number;
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Persist a finalized agent trace to Firestore.
 *
 * Fire-and-forget — callers should `.catch(() => {})` so pipeline
 * latency is never increased by persistence failures.
 */
export async function storeTrace(trace: AgentTrace): Promise<void> {
  try {
    const db = getAdminDb();

    // Flatten spans for Firestore (strip undefined values via JSON round-trip)
    const cleanSpans = JSON.parse(
      JSON.stringify(
        trace.spans.map((s) => ({
          spanId: s.spanId,
          stage: s.stage,
          model: s.model || "unknown",
          latencyMs: s.latencyMs ?? 0,
          status: s.status,
          corrections: s.corrections ?? 0,
          error: s.error ?? null,
        }))
      )
    );

    await db.collection("pipeline_traces").add({
      traceId: trace.traceId,
      pipelineType: trace.pipelineType,
      status: trace.status,
      totalLatencyMs: trace.totalLatencyMs ?? 0,
      spanCount: trace.spans.length,
      degradedStages: trace.degradedStages,
      spans: cleanSpans,
      created_at: FieldValue.serverTimestamp(),
      // Also store a plain timestamp for range queries (serverTimestamp is
      // only available after the write completes, so we use a JS Date for
      // the filter field).
      started_at: new Date(trace.startedAt),
    });
  } catch (error) {
    // Non-critical — log and swallow.
    console.warn("[traces] Failed to persist pipeline trace:", error);
  }
}

// ---------------------------------------------------------------------------
// Read / aggregation
// ---------------------------------------------------------------------------

/**
 * Shape of a persisted trace as read back from Firestore via `.data()`.
 * Kept as a narrow record so the pure aggregator can be unit-tested
 * without importing firebase-admin types.
 */
export interface PersistedTraceDoc {
  totalLatencyMs?: number;
  status?: string;
  started_at?: { toDate?: () => Date } | Date | null;
  spans?: Array<{
    stage?: string;
    status?: string;
    latencyMs?: number;
  }>;
}

/**
 * Compute pipeline metrics from an array of persisted trace documents.
 *
 * Pure function — no Firestore dependency. Exposed so the aggregation
 * rules can be unit-tested in isolation from the network layer.
 *
 * @param docs  Trace docs as returned from Firestore (`doc.data()`).
 * @param days  Window size in days — used for plansPerDay denominator
 *              and the output's `windowDays` field.
 * @param nowMs Optional override for "today" cutoff — tests pass a
 *              fixed value for deterministic plansToday counts.
 */
export function aggregateTraceDocs(
  docs: PersistedTraceDoc[],
  days: number,
  nowMs: number = Date.now()
): PipelineMetrics {
  const empty: PipelineMetrics = {
    totalPlans: 0,
    avgLatencyMs: 0,
    p95LatencyMs: 0,
    failureRate: 0,
    plansPerDay: 0,
    plansToday: 0,
    stageStats: [],
    windowDays: days,
  };

  if (docs.length === 0) return empty;

  const latencies: number[] = [];
  let failedCount = 0;
  let todayCount = 0;

  const todayStart = new Date(nowMs);
  todayStart.setUTCHours(0, 0, 0, 0);

  const stageRuns = new Map<string, number>();
  const stageFailures = new Map<string, number>();
  const stageDegraded = new Map<string, number>();
  const stageLatencySums = new Map<string, number>();

  for (const data of docs) {
    const latency =
      typeof data.totalLatencyMs === "number" ? data.totalLatencyMs : 0;
    latencies.push(latency);

    if (data.status === "failed") failedCount++;

    const rawStarted = data.started_at;
    const startedAt =
      rawStarted instanceof Date
        ? rawStarted
        : rawStarted && typeof rawStarted.toDate === "function"
          ? rawStarted.toDate()
          : null;
    if (startedAt && startedAt >= todayStart) todayCount++;

    const spans = Array.isArray(data.spans) ? data.spans : [];
    for (const span of spans) {
      if (!span || typeof span.stage !== "string") continue;
      const stage = span.stage;
      stageRuns.set(stage, (stageRuns.get(stage) ?? 0) + 1);
      stageLatencySums.set(
        stage,
        (stageLatencySums.get(stage) ?? 0) +
          (typeof span.latencyMs === "number" ? span.latencyMs : 0)
      );
      if (span.status === "failed") {
        stageFailures.set(stage, (stageFailures.get(stage) ?? 0) + 1);
      } else if (span.status === "degraded") {
        stageDegraded.set(stage, (stageDegraded.get(stage) ?? 0) + 1);
      }
    }
  }

  const total = latencies.length;

  const avgLatencyMs =
    total > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / total)
      : 0;

  const sorted = [...latencies].sort((a, b) => a - b);
  const p95Index = Math.max(0, Math.ceil(total * 0.95) - 1);
  const p95LatencyMs = sorted[p95Index] ?? 0;

  const failureRate =
    total > 0 ? Math.round((failedCount / total) * 10000) / 100 : 0;

  const plansPerDay =
    days > 0 ? Math.round((total / days) * 10) / 10 : 0;

  const stageStats: StageStats[] = [...stageRuns.keys()]
    .map((stage) => {
      const runs = stageRuns.get(stage) ?? 0;
      const failures = stageFailures.get(stage) ?? 0;
      const degradations = stageDegraded.get(stage) ?? 0;
      const latencySum = stageLatencySums.get(stage) ?? 0;
      return {
        stage,
        runs,
        failures,
        degradations,
        failureRate:
          runs > 0 ? Math.round((failures / runs) * 10000) / 100 : 0,
        degradationRate:
          runs > 0 ? Math.round((degradations / runs) * 10000) / 100 : 0,
        avgLatencyMs: runs > 0 ? Math.round(latencySum / runs) : 0,
      };
    })
    .sort((a, b) => {
      if (b.failureRate !== a.failureRate) return b.failureRate - a.failureRate;
      if (b.degradationRate !== a.degradationRate) {
        return b.degradationRate - a.degradationRate;
      }
      return b.runs - a.runs;
    });

  return {
    totalPlans: total,
    avgLatencyMs,
    p95LatencyMs,
    failureRate,
    plansPerDay,
    plansToday: todayCount,
    stageStats,
    windowDays: days,
  };
}

/**
 * Query recent pipeline traces and compute aggregated metrics.
 *
 * @param days  Look-back window in days. Defaults to 7.
 */
export async function getAggregatedMetrics(
  days = 7
): Promise<PipelineMetrics> {
  const empty: PipelineMetrics = {
    totalPlans: 0,
    avgLatencyMs: 0,
    p95LatencyMs: 0,
    failureRate: 0,
    plansPerDay: 0,
    plansToday: 0,
    stageStats: [],
    windowDays: days,
  };

  try {
    const db = getAdminDb();
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const snap = await db
      .collection("pipeline_traces")
      .where("started_at", ">=", cutoff)
      .orderBy("started_at", "desc")
      .limit(1000)
      .get();

    if (snap.empty) return empty;

    const docs = snap.docs.map((doc) => doc.data() as PersistedTraceDoc);
    return aggregateTraceDocs(docs, days);
  } catch (error) {
    console.warn("[traces] Failed to aggregate pipeline metrics:", error);
    return empty;
  }
}
