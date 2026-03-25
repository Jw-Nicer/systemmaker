import { test, describe, vi, beforeEach } from "vitest";
import assert from "node:assert/strict";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockInvokeLLM = vi.fn();
vi.mock("@/lib/agents/llm-client", () => ({
  invokeLLM: (...args: unknown[]) => mockInvokeLLM(...args),
  robustJsonParse: (text: string) =>
    JSON.parse(
      text
        .replace(/^```json?\n?/i, "")
        .replace(/\n?```$/i, "")
        .trim()
    ),
}));

// ---------------------------------------------------------------------------
// Test schema
// ---------------------------------------------------------------------------

const testSchema = z.object({
  name: z.string().min(3),
  count: z.number().min(1),
});

// Import after mocks are set up
import {
  executeWithSelfCorrection,
  executeStageWithCorrection,
} from "@/lib/agents/self-correction";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function llmResult(text: string, model = "gemini-2.5-flash") {
  return { text, model, promptTokens: 10, completionTokens: 20 };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("executeWithSelfCorrection", () => {
  beforeEach(() => {
    mockInvokeLLM.mockReset();
  });

  // 1. Happy path — first try valid
  test("returns validated output with corrections:0 when first try is valid", async () => {
    mockInvokeLLM.mockResolvedValueOnce(
      llmResult(JSON.stringify({ name: "Alice", count: 5 }))
    );

    const result = await executeWithSelfCorrection("test prompt", testSchema);

    assert.deepStrictEqual(result.output, { name: "Alice", count: 5 });
    assert.equal(result.corrections, 0);
    assert.equal(result.wasAutoFixed, false);
    assert.equal(result.model, "gemini-2.5-flash");
    assert.equal(mockInvokeLLM.mock.calls.length, 1);
  });

  // 2. First try invalid (missing field), second valid → corrections:1
  test("self-corrects when first try fails validation (missing field)", async () => {
    // First call: missing "count"
    mockInvokeLLM.mockResolvedValueOnce(
      llmResult(JSON.stringify({ name: "Bob" }))
    );
    // Second call (correction): valid
    mockInvokeLLM.mockResolvedValueOnce(
      llmResult(JSON.stringify({ name: "Bob", count: 3 }))
    );

    const result = await executeWithSelfCorrection("test prompt", testSchema);

    assert.deepStrictEqual(result.output, { name: "Bob", count: 3 });
    assert.equal(result.corrections, 1);
    assert.equal(result.wasAutoFixed, true);
    assert.equal(mockInvokeLLM.mock.calls.length, 2);
  });

  // 3. All corrections exhausted → throws
  test("throws 'Self-correction exhausted' after maxCorrections failures", async () => {
    // Initial call: invalid
    mockInvokeLLM.mockResolvedValueOnce(
      llmResult(JSON.stringify({ name: "X" }))
    );
    // Correction 1: still invalid
    mockInvokeLLM.mockResolvedValueOnce(
      llmResult(JSON.stringify({ name: "Y" }))
    );
    // Correction 2: still invalid
    mockInvokeLLM.mockResolvedValueOnce(
      llmResult(JSON.stringify({ name: "Z" }))
    );

    await assert.rejects(
      () => executeWithSelfCorrection("test prompt", testSchema),
      (err: Error) => {
        assert.ok(err.message.includes("Self-correction exhausted"));
        return true;
      }
    );

    // 1 initial + 2 corrections
    assert.equal(mockInvokeLLM.mock.calls.length, 3);
  });

  // 4. JSON parse failure on first try, valid on second → recovers
  test("recovers from JSON parse failure on first try", async () => {
    // First call: garbled text
    mockInvokeLLM.mockResolvedValueOnce(
      llmResult("NOT JSON AT ALL {{{broken")
    );
    // Correction 1: valid
    mockInvokeLLM.mockResolvedValueOnce(
      llmResult(JSON.stringify({ name: "Fixed", count: 10 }))
    );

    const result = await executeWithSelfCorrection("test prompt", testSchema);

    assert.deepStrictEqual(result.output, { name: "Fixed", count: 10 });
    assert.equal(result.corrections, 1);
    assert.equal(result.wasAutoFixed, true);
  });

  // 5. Span metadata updated on correction
  test("updates span metadata on successful correction", async () => {
    const mockSpan = {
      spanId: "s1",
      traceId: "t1",
      stage: "test",
      model: "",
      startedAt: Date.now(),
      status: "running" as const,
      corrections: undefined as number | undefined,
      metadata: undefined as Record<string, unknown> | undefined,
    };

    // First call: invalid (name too short)
    mockInvokeLLM.mockResolvedValueOnce(
      llmResult(JSON.stringify({ name: "AB", count: 1 }))
    );
    // Correction: valid
    mockInvokeLLM.mockResolvedValueOnce(
      llmResult(JSON.stringify({ name: "ABC", count: 1 }))
    );

    await executeWithSelfCorrection("test prompt", testSchema, {
      span: mockSpan,
    });

    assert.equal(mockSpan.corrections, 1);
    assert.equal(mockSpan.metadata?.selfCorrected, true);
    assert.equal(mockSpan.metadata?.correctionAttempts, 1);
  });

  // 6. maxCorrections:0 → invalid output throws immediately
  test("throws immediately when maxCorrections is 0 and output is invalid", async () => {
    mockInvokeLLM.mockResolvedValueOnce(
      llmResult(JSON.stringify({ name: "X" }))
    );

    await assert.rejects(
      () =>
        executeWithSelfCorrection("test prompt", testSchema, {
          maxCorrections: 0,
        }),
      (err: Error) => {
        assert.ok(err.message.includes("Self-correction exhausted"));
        assert.ok(err.message.includes("0 attempts"));
        return true;
      }
    );

    // Only the initial call, no corrections
    assert.equal(mockInvokeLLM.mock.calls.length, 1);
  });

  // 7. Timeout forwarded to invokeLLM
  test("forwards timeoutMs to invokeLLM via llmOptions", async () => {
    mockInvokeLLM.mockResolvedValueOnce(
      llmResult(JSON.stringify({ name: "Test", count: 1 }))
    );

    await executeWithSelfCorrection("test prompt", testSchema, {
      llmOptions: { timeoutMs: 5000 },
    });

    const callOptions = mockInvokeLLM.mock.calls[0][1];
    assert.equal(callOptions.timeoutMs, 5000);
  });

  // 8. Span metadata set on exhaustion
  test("sets span metadata with lastErrors on exhaustion", async () => {
    const mockSpan = {
      spanId: "s2",
      traceId: "t2",
      stage: "test",
      model: "",
      startedAt: Date.now(),
      status: "running" as const,
      corrections: undefined as number | undefined,
      metadata: undefined as Record<string, unknown> | undefined,
    };

    // All calls return invalid
    mockInvokeLLM.mockResolvedValue(
      llmResult(JSON.stringify({ name: "X" }))
    );

    try {
      await executeWithSelfCorrection("test prompt", testSchema, {
        span: mockSpan,
      });
    } catch {
      // expected
    }

    assert.equal(mockSpan.corrections, 2);
    assert.equal(mockSpan.metadata?.selfCorrected, false);
    assert.ok(Array.isArray(mockSpan.metadata?.lastErrors));
  });

  // 9. executeStageWithCorrection convenience wrapper
  test("executeStageWithCorrection passes timeoutMs and maxCorrections", async () => {
    mockInvokeLLM.mockResolvedValueOnce(
      llmResult(JSON.stringify({ name: "Hello", count: 7 }))
    );

    const result = await executeStageWithCorrection(
      "test_stage",
      "test prompt",
      testSchema,
      { timeoutMs: 10000, maxCorrections: 1 }
    );

    assert.deepStrictEqual(result.output, { name: "Hello", count: 7 });
    assert.equal(result.corrections, 0);

    // Verify the label includes the templateKey
    const callOptions = mockInvokeLLM.mock.calls[0][1];
    assert.ok(callOptions.label.includes("test_stage"));
  });
});
