import { test, describe, vi, beforeEach } from "vitest";
import assert from "node:assert/strict";

// Mock the @google/generative-ai module to prevent import-time errors
// (the module tries to load at import time, but we only test pure functions)
vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class MockGoogleGenerativeAI {
    getGenerativeModel() {
      return { generateContent: vi.fn() };
    }
  },
}));

import {
  stripCodeFences,
  robustJsonParse,
  isTransientError,
  isModelAvailabilityError,
  getLLMUsageStats,
  resetLLMUsageStats,
} from "@/lib/agents/llm-client";

// ---------------------------------------------------------------------------
// stripCodeFences
// ---------------------------------------------------------------------------

describe("stripCodeFences", () => {
  test("removes ```json fences", () => {
    const input = '```json\n{"key": "value"}\n```';
    const result = stripCodeFences(input);
    assert.equal(result, '{"key": "value"}');
  });

  test("removes bare ``` fences", () => {
    const input = '```\n{"key": "value"}\n```';
    const result = stripCodeFences(input);
    assert.equal(result, '{"key": "value"}');
  });

  test("no-op on clean JSON", () => {
    const input = '{"key": "value"}';
    const result = stripCodeFences(input);
    assert.equal(result, '{"key": "value"}');
  });

  test("handles trailing whitespace after closing fence", () => {
    const input = '```json\n{"a":1}\n```   ';
    const result = stripCodeFences(input);
    assert.equal(result, '{"a":1}');
  });
});

// ---------------------------------------------------------------------------
// robustJsonParse
// ---------------------------------------------------------------------------

describe("robustJsonParse", () => {
  test("handles clean JSON", () => {
    const result = robustJsonParse<{ name: string }>('{"name": "test"}');
    assert.deepEqual(result, { name: "test" });
  });

  test("strips code fences before parsing", () => {
    const result = robustJsonParse<{ x: number }>('```json\n{"x": 42}\n```');
    assert.deepEqual(result, { x: 42 });
  });

  test('extracts nested JSON from "text {json} more"', () => {
    const input = 'Here is the result: {"items": [1, 2, 3]} and some trailing text';
    const result = robustJsonParse<{ items: number[] }>(input);
    assert.deepEqual(result, { items: [1, 2, 3] });
  });

  test('throws "Failed to parse" on non-JSON input', () => {
    assert.throws(
      () => robustJsonParse("this is not json at all"),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("Failed to parse"));
        return true;
      }
    );
  });

  test("handles JSON with surrounding whitespace", () => {
    const result = robustJsonParse<{ ok: boolean }>("  \n  {\"ok\": true}  \n  ");
    assert.deepEqual(result, { ok: true });
  });
});

// ---------------------------------------------------------------------------
// isTransientError
// ---------------------------------------------------------------------------

describe("isTransientError", () => {
  test("true for 429", () => {
    assert.equal(isTransientError("Error 429: Too many requests"), true);
  });

  test("true for 503", () => {
    assert.equal(isTransientError("503 Service Unavailable"), true);
  });

  test("true for rate limit", () => {
    assert.equal(isTransientError("Rate limit exceeded"), true);
  });

  test("true for timeout", () => {
    assert.equal(isTransientError("Request timed out"), true);
  });

  test("true for econnreset", () => {
    assert.equal(isTransientError("ECONNRESET: connection reset"), true);
  });

  test("false for 401", () => {
    assert.equal(isTransientError("401 Unauthorized"), false);
  });

  test("false for permission denied (not transient for isTransientError)", () => {
    assert.equal(isTransientError("permission denied for resource"), false);
  });
});

// ---------------------------------------------------------------------------
// isModelAvailabilityError
// ---------------------------------------------------------------------------

describe("isModelAvailabilityError", () => {
  test('true for "not found for api version"', () => {
    assert.equal(
      isModelAvailabilityError("Model not found for API version v1"),
      true
    );
  });

  test('true for "is not supported"', () => {
    assert.equal(
      isModelAvailabilityError("gemini-ultra is not supported in this region"),
      true
    );
  });

  test('false for "429"', () => {
    assert.equal(isModelAvailabilityError("429 rate limited"), false);
  });

  test('false for "timeout"', () => {
    assert.equal(isModelAvailabilityError("Request timeout"), false);
  });

  test('true for "permission denied"', () => {
    assert.equal(
      isModelAvailabilityError("Permission denied for model access"),
      true
    );
  });
});

// ---------------------------------------------------------------------------
// getLLMUsageStats / resetLLMUsageStats
// ---------------------------------------------------------------------------

describe("getLLMUsageStats / resetLLMUsageStats", () => {
  beforeEach(() => {
    resetLLMUsageStats();
  });

  test("stats are zeroed after reset", () => {
    const stats = getLLMUsageStats();
    assert.equal(stats.totalCalls, 0);
    assert.equal(stats.totalRetries, 0);
    assert.equal(stats.totalLatencyMs, 0);
    assert.deepEqual(stats.callsByModel, {});
    assert.deepEqual(stats.failuresByModel, {});
  });

  test("returns a snapshot (not a reference to internal state)", () => {
    const stats1 = getLLMUsageStats();
    const stats2 = getLLMUsageStats();
    assert.notEqual(stats1, stats2, "each call should return a new object");
    assert.deepEqual(stats1, stats2, "but with the same values");
  });
});
