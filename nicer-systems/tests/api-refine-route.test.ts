import { beforeEach, describe, test, vi } from "vitest";
import assert from "node:assert/strict";

const mockEnforceRateLimit = vi.fn().mockResolvedValue(null);
const mockHasFilledHoneypot = vi.fn().mockReturnValue(false);
vi.mock("@/lib/security/request-guards", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
  hasFilledHoneypot: (...args: unknown[]) => mockHasFilledHoneypot(...args),
}));

const mockGetPlanById = vi.fn();
vi.mock("@/lib/firestore/plans", () => ({
  getPlanById: (...args: unknown[]) => mockGetPlanById(...args),
}));

const mockRefinePlanSection = vi.fn();
vi.mock("@/lib/agents/refinement", () => ({
  refinePlanSection: (...args: unknown[]) => mockRefinePlanSection(...args),
}));

const { POST } = await import("@/app/api/agent/refine/route");
const { createPreviewPlan } = await import("@/tests/fixtures/preview-plan");

function makeRequest(body: unknown) {
  return new Request("https://example.com/api/agent/refine", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.20" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/agent/refine", () => {
  beforeEach(() => {
    mockEnforceRateLimit.mockResolvedValue(null);
    mockHasFilledHoneypot.mockReturnValue(false);
    mockGetPlanById.mockReset();
    mockRefinePlanSection.mockReset();
  });

  test("returns streamed preview data for roadmap refinements without persisting", async () => {
    mockGetPlanById.mockResolvedValue({
      id: "plan-123",
      preview_plan: createPreviewPlan(),
      version: 3,
    });
    mockRefinePlanSection.mockResolvedValue({
      refined: {
        phases: [],
        critical_path: "Cleanup → Build → Launch",
        total_estimated_weeks: 3,
      },
      summary: "Updated roadmap",
    });

    const response = await POST(
      makeRequest({
        plan_id: "plan-123",
        section: "roadmap",
        feedback: "Shorten the rollout.",
      })
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "text/event-stream");
    const text = await response.text();
    assert.match(text, /event: message/);
    assert.match(text, /event: done/);
    assert.match(text, /Updated roadmap/);
  });

  test("returns 404 when plan does not exist", async () => {
    mockGetPlanById.mockResolvedValue(null);

    const response = await POST(
      makeRequest({
        plan_id: "missing",
        section: "workflow",
        feedback: "Make it clearer.",
      })
    );

    assert.equal(response.status, 404);
  });

  test("returns 400 for invalid section payload", async () => {
    const response = await POST(
      makeRequest({
        plan_id: "plan-123",
        section: "invalid",
        feedback: "Test",
      })
    );

    assert.equal(response.status, 400);
  });
});
