import { test, describe, vi, beforeEach } from "vitest";
import assert from "node:assert/strict";

// Mock rate limiting — allow all by default
const mockEnforceRateLimit = vi.fn().mockResolvedValue(null);
vi.mock("@/lib/security/request-guards", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
}));

// Mock plans Firestore module
const mockGetPlanById = vi.fn();
vi.mock("@/lib/firestore/plans", () => ({
  getPlanById: (...args: unknown[]) => mockGetPlanById(...args),
}));

const { GET } = await import("@/app/api/plans/route");

const fakePlan = {
  id: "plan-123",
  is_public: true,
  preview_plan: { intake: {} },
};

function makeRequest(id?: string | null) {
  const url = id
    ? `https://example.com/api/plans?id=${id}`
    : "https://example.com/api/plans";
  return new Request(url, {
    method: "GET",
    headers: { "x-forwarded-for": "198.51.100.1" },
  });
}

describe("GET /api/plans", () => {
  beforeEach(() => {
    mockEnforceRateLimit.mockClear();
    mockGetPlanById.mockClear();
    mockEnforceRateLimit.mockResolvedValue(null);
  });

  test("returns 200 with plan for valid public plan", async () => {
    mockGetPlanById.mockResolvedValue(fakePlan);
    const response = await GET(makeRequest("plan-123"));
    assert.equal(response.status, 200);
    const json = await response.json();
    assert.deepEqual(json.plan, fakePlan);
  });

  test("returns 400 when id is missing", async () => {
    const response = await GET(makeRequest());
    assert.equal(response.status, 400);
    const json = await response.json();
    assert.equal(json.error, "Invalid plan id");
  });

  test("returns 400 when id is too long", async () => {
    const longId = "a".repeat(129);
    const response = await GET(makeRequest(longId));
    assert.equal(response.status, 400);
    const json = await response.json();
    assert.equal(json.error, "Invalid plan id");
  });

  test("returns 400 when id contains invalid characters", async () => {
    const response = await GET(makeRequest("plan/../hack"));
    assert.equal(response.status, 400);
    const json = await response.json();
    assert.equal(json.error, "Invalid plan id");
  });

  test("returns 404 when plan not found", async () => {
    mockGetPlanById.mockResolvedValue(null);
    const response = await GET(makeRequest("nonexistent"));
    assert.equal(response.status, 404);
    const json = await response.json();
    assert.equal(json.error, "Plan not found");
  });

  test("returns 404 when plan is not public", async () => {
    mockGetPlanById.mockResolvedValue({ ...fakePlan, is_public: false });
    const response = await GET(makeRequest("plan-123"));
    assert.equal(response.status, 404);
    const json = await response.json();
    assert.equal(json.error, "Plan not found");
  });

  test("returns rate limit response when limited", async () => {
    const rateLimitResponse = new Response(
      JSON.stringify({ error: "Too many requests" }),
      { status: 429 }
    );
    mockEnforceRateLimit.mockResolvedValue(rateLimitResponse);
    const response = await GET(makeRequest("plan-123"));
    assert.equal(response.status, 429);
  });

  test("returns 500 on Firestore error", async () => {
    mockGetPlanById.mockRejectedValue(new Error("Firestore down"));
    const response = await GET(makeRequest("plan-123"));
    assert.equal(response.status, 500);
    const json = await response.json();
    assert.equal(json.error, "Failed to fetch plan");
  });

  test("accepts valid alphanumeric ids with hyphens and underscores", async () => {
    mockGetPlanById.mockResolvedValue(fakePlan);
    const response = await GET(makeRequest("abc-123_DEF"));
    assert.equal(response.status, 200);
  });
});
