/**
 * Pipeline trace persistence — writes agent traces to Firestore for
 * metrics aggregation. Fire-and-forget writes; never blocks the pipeline.
 */

import { getAdminDb, FieldValue } from "@/lib/firebase/admin";
import type { AgentTrace } from "@/lib/agents/tracing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

    const latencies: number[] = [];
    let failedCount = 0;
    let todayCount = 0;

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    for (const doc of snap.docs) {
      const data = doc.data();
      const latency =
        typeof data.totalLatencyMs === "number" ? data.totalLatencyMs : 0;
      latencies.push(latency);

      if (data.status === "failed") {
        failedCount++;
      }

      // Count plans generated today (UTC)
      const startedAt = data.started_at?.toDate?.() ?? null;
      if (startedAt && startedAt >= todayStart) {
        todayCount++;
      }
    }

    const total = latencies.length;

    // Average latency
    const avgLatencyMs =
      total > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / total)
        : 0;

    // P95 latency
    const sorted = [...latencies].sort((a, b) => a - b);
    const p95Index = Math.max(0, Math.ceil(total * 0.95) - 1);
    const p95LatencyMs = sorted[p95Index] ?? 0;

    // Failure rate as percentage
    const failureRate =
      total > 0 ? Math.round((failedCount / total) * 10000) / 100 : 0;

    // Plans per day
    const plansPerDay =
      days > 0 ? Math.round((total / days) * 10) / 10 : 0;

    return {
      totalPlans: total,
      avgLatencyMs,
      p95LatencyMs,
      failureRate,
      plansPerDay,
      plansToday: todayCount,
      windowDays: days,
    };
  } catch (error) {
    console.warn("[traces] Failed to aggregate pipeline metrics:", error);
    return empty;
  }
}
