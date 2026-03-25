import { test, describe, vi } from "vitest";
import assert from "node:assert/strict";

import {
  createTrace,
  startSpan,
  endSpan,
  finalizeTrace,
  getStructuredLog,
  bufferTrace,
  getRecentTraces,
  getTracesByStatus,
  emitTraceLog,
  type AgentTrace,
  type AgentSpan,
} from "@/lib/agents/tracing";

// ---------------------------------------------------------------------------
// createTrace
// ---------------------------------------------------------------------------

describe("createTrace", () => {
  test("generates a unique traceId", () => {
    const t1 = createTrace("plan_generation");
    const t2 = createTrace("plan_generation");
    assert.ok(t1.traceId, "traceId should be truthy");
    assert.notEqual(t1.traceId, t2.traceId, "each trace should have a unique id");
  });

  test("sets pipelineType, status=running, empty spans and degradedStages", () => {
    const t = createTrace("refinement", { foo: "bar" });
    assert.equal(t.pipelineType, "refinement");
    assert.equal(t.status, "running");
    assert.deepEqual(t.spans, []);
    assert.deepEqual(t.degradedStages, []);
    assert.deepEqual(t.input, { foo: "bar" });
    assert.ok(t.startedAt > 0, "startedAt should be set");
  });
});

// ---------------------------------------------------------------------------
// startSpan
// ---------------------------------------------------------------------------

describe("startSpan", () => {
  test("adds a span to trace.spans with stage, status=running, startedAt", () => {
    const trace = createTrace("plan_generation");
    const span = startSpan(trace, "intake_agent", { custom: true });

    assert.equal(trace.spans.length, 1);
    assert.equal(span.stage, "intake_agent");
    assert.equal(span.status, "running");
    assert.equal(span.traceId, trace.traceId);
    assert.ok(span.spanId, "spanId should be truthy");
    assert.ok(span.startedAt > 0, "startedAt should be set");
    assert.deepEqual(span.metadata, { custom: true });
  });
});

// ---------------------------------------------------------------------------
// endSpan
// ---------------------------------------------------------------------------

describe("endSpan", () => {
  test("sets endedAt, latencyMs, status, error, corrections, and merges metadata", () => {
    const trace = createTrace("plan_generation");
    const span = startSpan(trace, "workflow_mapper", { existing: "value" });

    endSpan(span, {
      status: "completed",
      error: undefined,
      corrections: 2,
      promptTokens: 100,
      completionTokens: 200,
      metadata: { model: "gemini-2.5-flash" },
    });

    assert.ok(span.endedAt !== undefined, "endedAt should be set");
    assert.ok(
      typeof span.latencyMs === "number" && span.latencyMs >= 0,
      "latencyMs should be non-negative"
    );
    assert.equal(span.status, "completed");
    assert.equal(span.error, undefined);
    assert.equal(span.corrections, 2);
    assert.equal(span.promptTokens, 100);
    assert.equal(span.completionTokens, 200);
    // metadata should be merged (existing + new)
    assert.deepEqual(span.metadata, { existing: "value", model: "gemini-2.5-flash" });
  });

  test("does not overwrite metadata when result.metadata is undefined", () => {
    const trace = createTrace("plan_generation");
    const span = startSpan(trace, "automation_designer", { keep: "me" });

    endSpan(span, { status: "failed", error: "boom" });

    assert.deepEqual(span.metadata, { keep: "me" });
  });
});

// ---------------------------------------------------------------------------
// finalizeTrace
// ---------------------------------------------------------------------------

describe("finalizeTrace", () => {
  function makeTrace(statuses: Array<AgentSpan["status"]>): AgentTrace {
    const trace = createTrace("plan_generation");
    for (const s of statuses) {
      const span = startSpan(trace, `stage_${s}`);
      endSpan(span, { status: s });
    }
    return trace;
  }

  test("all completed -> status=completed, empty degradedStages", () => {
    const trace = makeTrace(["completed", "completed", "completed"]);
    finalizeTrace(trace);
    assert.equal(trace.status, "completed");
    assert.deepEqual(trace.degradedStages, []);
    assert.ok(trace.endedAt !== undefined);
    assert.ok(typeof trace.totalLatencyMs === "number");
  });

  test("some failed -> status=partial, degradedStages populated", () => {
    const trace = makeTrace(["completed", "failed", "completed"]);
    finalizeTrace(trace);
    assert.equal(trace.status, "partial");
    assert.ok(trace.degradedStages.includes("stage_failed"));
  });

  test("all failed -> status=failed", () => {
    const trace = makeTrace(["failed", "failed"]);
    finalizeTrace(trace);
    assert.equal(trace.status, "failed");
  });

  test("some degraded -> status=partial, degradedStages includes degraded stage", () => {
    const trace = makeTrace(["completed", "degraded"]);
    finalizeTrace(trace);
    assert.equal(trace.status, "partial");
    assert.ok(trace.degradedStages.includes("stage_degraded"));
  });
});

// ---------------------------------------------------------------------------
// getStructuredLog
// ---------------------------------------------------------------------------

describe("getStructuredLog", () => {
  test("returns correct shape with all fields", () => {
    const trace = createTrace("conversation");
    const span1 = startSpan(trace, "intake");
    endSpan(span1, { status: "completed", corrections: 1 });
    const span2 = startSpan(trace, "workflow");
    endSpan(span2, { status: "failed", error: "timeout" });
    finalizeTrace(trace);

    const log = getStructuredLog(trace);
    assert.equal(log.traceId, trace.traceId);
    assert.equal(log.pipelineType, "conversation");
    assert.equal(log.status, "partial");
    assert.equal(log.stagesCompleted, 1);
    assert.equal(log.stagesFailed, 1);
    assert.equal(log.stagesDegraded, 0);
    assert.ok(log.totalLatencyMs >= 0);
    assert.equal(log.spans.length, 2);
    assert.equal(log.spans[0].stage, "intake");
    assert.equal(log.spans[0].corrections, 1);
    assert.equal(log.spans[1].stage, "workflow");
    assert.equal(log.spans[1].error, "timeout");
    assert.equal(log.spans[1].model, "unknown"); // model was never set
  });
});

// ---------------------------------------------------------------------------
// bufferTrace / getRecentTraces / getTracesByStatus
// ---------------------------------------------------------------------------

describe("bufferTrace + getRecentTraces + getTracesByStatus", () => {
  test("bufferTrace caps at 100 entries", () => {
    // Push 110 traces — buffer should never exceed 100
    for (let i = 0; i < 110; i++) {
      const t = createTrace("plan_generation");
      t.status = "completed";
      bufferTrace(t);
    }
    const all = getRecentTraces(200);
    assert.ok(all.length <= 100, `expected <= 100 traces, got ${all.length}`);
  });

  test("getRecentTraces returns most recent first and respects limit", () => {
    const t1 = createTrace("plan_generation");
    t1.status = "completed";
    bufferTrace(t1);

    const t2 = createTrace("refinement");
    t2.status = "completed";
    bufferTrace(t2);

    const recent = getRecentTraces(2);
    // Most recent (t2) should be first
    assert.equal(recent[0].traceId, t2.traceId);
    assert.equal(recent[1].traceId, t1.traceId);

    const limited = getRecentTraces(1);
    assert.equal(limited.length, 1);
    assert.equal(limited[0].traceId, t2.traceId);
  });

  test("getTracesByStatus filters correctly", () => {
    const tFailed = createTrace("plan_generation");
    tFailed.status = "failed";
    bufferTrace(tFailed);

    const tCompleted = createTrace("plan_generation");
    tCompleted.status = "completed";
    bufferTrace(tCompleted);

    const failed = getTracesByStatus("failed", 200);
    for (const t of failed) {
      assert.equal(t.status, "failed");
    }

    // Our tFailed should be in the list
    assert.ok(
      failed.some((t) => t.traceId === tFailed.traceId),
      "should include our failed trace"
    );
  });
});

// ---------------------------------------------------------------------------
// emitTraceLog
// ---------------------------------------------------------------------------

describe("emitTraceLog", () => {
  test("calls console.log with structured message format", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const trace = createTrace("plan_generation");
    const span = startSpan(trace, "intake");
    endSpan(span, { status: "completed" });
    finalizeTrace(trace);

    emitTraceLog(trace);

    assert.ok(logSpy.mock.calls.length >= 1, "console.log should be called");
    const msg = logSpy.mock.calls[0][0] as string;
    assert.ok(msg.includes("[agent-trace]"), "message should include [agent-trace] prefix");
    assert.ok(msg.includes("plan_generation"), "message should include pipeline type");
    assert.ok(msg.includes(trace.traceId), "message should include trace id");
    assert.ok(msg.includes("status=completed"), "message should include status");

    // console.warn should NOT be called for a fully completed trace
    assert.equal(warnSpy.mock.calls.length, 0, "no warnings for completed trace");

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  test("calls console.warn for failed/degraded spans", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const trace = createTrace("plan_generation");
    const span = startSpan(trace, "intake");
    endSpan(span, { status: "failed", error: "model timeout" });
    finalizeTrace(trace);

    emitTraceLog(trace);

    assert.ok(warnSpy.mock.calls.length >= 1, "console.warn should be called for failed span");
    const warnMsg = warnSpy.mock.calls[0][0] as string;
    assert.ok(warnMsg.includes("stage=intake"), "warn should include stage name");
    assert.ok(warnMsg.includes("status=failed"), "warn should include status");

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
