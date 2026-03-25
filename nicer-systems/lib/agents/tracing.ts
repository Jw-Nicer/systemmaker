/**
 * Agent Observability — tracing and structured logging for the agent pipeline.
 *
 * Every pipeline execution gets a unique trace_id. Each stage within the
 * pipeline creates a span. Spans record model, latency, token counts,
 * status, and errors — enabling debugging, performance analysis, and
 * quality tracking.
 *
 * This is the foundation for agent observability. Future integrations
 * with Langfuse, Braintrust, or OpenTelemetry can consume these traces.
 */

import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SpanStatus = "running" | "completed" | "failed" | "degraded" | "skipped";

export interface AgentSpan {
  spanId: string;
  traceId: string;
  stage: string;
  model: string;
  startedAt: number;
  endedAt?: number;
  latencyMs?: number;
  status: SpanStatus;
  promptTokens?: number;
  completionTokens?: number;
  error?: string;
  corrections?: number;
  metadata?: Record<string, unknown>;
}

export interface AgentTrace {
  traceId: string;
  pipelineType: "plan_generation" | "refinement" | "conversation" | "evaluation";
  input?: Record<string, unknown>;
  startedAt: number;
  endedAt?: number;
  totalLatencyMs?: number;
  status: "running" | "completed" | "partial" | "failed";
  spans: AgentSpan[];
  degradedStages: string[];
  metadata?: Record<string, unknown>;
}

export interface SpanResult {
  status: SpanStatus;
  error?: string;
  corrections?: number;
  promptTokens?: number;
  completionTokens?: number;
  metadata?: Record<string, unknown>;
}

export interface StructuredTraceLog {
  traceId: string;
  pipelineType: string;
  status: string;
  totalLatencyMs: number;
  stagesCompleted: number;
  stagesFailed: number;
  stagesDegraded: number;
  spans: Array<{
    stage: string;
    model: string;
    status: string;
    latencyMs: number;
    corrections: number;
    error?: string;
  }>;
}

// ---------------------------------------------------------------------------
// Trace lifecycle
// ---------------------------------------------------------------------------

/**
 * Create a new trace for a pipeline execution.
 * Every agent pipeline run (plan generation, refinement, conversation)
 * should start with createTrace().
 */
export function createTrace(
  pipelineType: AgentTrace["pipelineType"],
  input?: Record<string, unknown>
): AgentTrace {
  return {
    traceId: randomUUID(),
    pipelineType,
    input,
    startedAt: Date.now(),
    status: "running",
    spans: [],
    degradedStages: [],
  };
}

/**
 * Start a span for a pipeline stage.
 * Call this before executing an agent stage.
 */
export function startSpan(
  trace: AgentTrace,
  stage: string,
  metadata?: Record<string, unknown>
): AgentSpan {
  const span: AgentSpan = {
    spanId: randomUUID(),
    traceId: trace.traceId,
    stage,
    model: "",
    startedAt: Date.now(),
    status: "running",
    metadata,
  };
  trace.spans.push(span);
  return span;
}

/**
 * End a span with results.
 * Call this after a stage completes (success or failure).
 */
export function endSpan(span: AgentSpan, result: SpanResult): void {
  span.endedAt = Date.now();
  span.latencyMs = span.endedAt - span.startedAt;
  span.status = result.status;
  span.error = result.error;
  span.corrections = result.corrections;
  span.promptTokens = result.promptTokens;
  span.completionTokens = result.completionTokens;
  if (result.metadata) {
    span.metadata = { ...span.metadata, ...result.metadata };
  }
}

/**
 * Finalize a trace after all stages complete.
 */
export function finalizeTrace(trace: AgentTrace): void {
  trace.endedAt = Date.now();
  trace.totalLatencyMs = trace.endedAt - trace.startedAt;

  const failed = trace.spans.filter((s) => s.status === "failed");
  const degraded = trace.spans.filter((s) => s.status === "degraded");

  trace.degradedStages = [
    ...degraded.map((s) => s.stage),
    ...failed.map((s) => s.stage),
  ];

  if (failed.length === trace.spans.length) {
    trace.status = "failed";
  } else if (degraded.length > 0 || failed.length > 0) {
    trace.status = "partial";
  } else {
    trace.status = "completed";
  }
}

// ---------------------------------------------------------------------------
// Structured logging
// ---------------------------------------------------------------------------

/**
 * Convert a trace into a structured log entry.
 * This format is designed for JSON logging, log aggregation (Cloud Logging),
 * and future integration with observability platforms.
 */
export function getStructuredLog(trace: AgentTrace): StructuredTraceLog {
  return {
    traceId: trace.traceId,
    pipelineType: trace.pipelineType,
    status: trace.status,
    totalLatencyMs: trace.totalLatencyMs ?? Date.now() - trace.startedAt,
    stagesCompleted: trace.spans.filter((s) => s.status === "completed").length,
    stagesFailed: trace.spans.filter((s) => s.status === "failed").length,
    stagesDegraded: trace.spans.filter((s) => s.status === "degraded").length,
    spans: trace.spans.map((s) => ({
      stage: s.stage,
      model: s.model || "unknown",
      status: s.status,
      latencyMs: s.latencyMs ?? 0,
      corrections: s.corrections ?? 0,
      error: s.error,
    })),
  };
}

/**
 * Emit a structured trace log to console.
 * In production, this would go to Cloud Logging or an observability platform.
 */
export function emitTraceLog(trace: AgentTrace): void {
  const log = getStructuredLog(trace);
  console.log(
    `[agent-trace] ${log.pipelineType} trace=${log.traceId} status=${log.status} ` +
      `latency=${log.totalLatencyMs}ms stages=${log.stagesCompleted}ok/${log.stagesFailed}fail/${log.stagesDegraded}degraded`
  );

  // Log individual span details for failed/degraded stages
  for (const span of log.spans) {
    if (span.status === "failed" || span.status === "degraded") {
      console.warn(
        `[agent-trace] ${log.traceId} stage=${span.stage} status=${span.status} ` +
          `model=${span.model} latency=${span.latencyMs}ms corrections=${span.corrections} ` +
          `error=${span.error ?? "none"}`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Trace storage (for analytics / debugging)
// ---------------------------------------------------------------------------

/** In-memory trace buffer for recent traces. Capped at 100 entries. */
const _traceBuffer: AgentTrace[] = [];
const MAX_TRACE_BUFFER = 100;

/**
 * Store a finalized trace in the buffer for later analysis.
 */
export function bufferTrace(trace: AgentTrace): void {
  _traceBuffer.push(trace);
  if (_traceBuffer.length > MAX_TRACE_BUFFER) {
    _traceBuffer.shift();
  }
}

/**
 * Get recent traces from the buffer (most recent first).
 */
export function getRecentTraces(limit = 20): AgentTrace[] {
  return _traceBuffer.slice(-limit).reverse();
}

/**
 * Get traces filtered by status.
 */
export function getTracesByStatus(
  status: AgentTrace["status"],
  limit = 20
): AgentTrace[] {
  return _traceBuffer
    .filter((t) => t.status === status)
    .slice(-limit)
    .reverse();
}
