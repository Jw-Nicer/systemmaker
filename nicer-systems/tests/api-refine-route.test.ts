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

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/firebase/auth", () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}));

const { POST } = await import("@/app/api/agent/refine/route");
const { createPreviewPlan } = await import("@/tests/fixtures/preview-plan");
const { generateEditToken, hashEditToken } = await import(
  "@/lib/plans/edit-token"
);

function makeRequest(body: unknown) {
  return new Request("https://example.com/api/agent/refine", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.20" },
    body: JSON.stringify(body),
  });
}

const REFINED_ROADMAP = {
  refined: {
    phases: [],
    critical_path: "Cleanup → Build → Launch",
    total_estimated_weeks: 3,
  },
  summary: "Updated roadmap",
};

describe("POST /api/agent/refine", () => {
  beforeEach(() => {
    mockEnforceRateLimit.mockResolvedValue(null);
    mockHasFilledHoneypot.mockReturnValue(false);
    mockGetPlanById.mockReset();
    mockRefinePlanSection.mockReset();
    mockRequireAdmin.mockReset();
    mockRequireAdmin.mockResolvedValue(null);
  });

  test("returns streamed preview data for a valid edit token", async () => {
    const token = generateEditToken();
    mockGetPlanById.mockResolvedValue({
      id: "plan-123",
      preview_plan: createPreviewPlan(),
      version: 3,
      edit_token_hashes: [hashEditToken(token)],
    });
    mockRefinePlanSection.mockResolvedValue(REFINED_ROADMAP);

    const response = await POST(
      makeRequest({
        plan_id: "plan-123",
        section: "roadmap",
        feedback: "Shorten the rollout.",
        edit_token: token,
      })
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "text/event-stream");
    const text = await response.text();
    assert.match(text, /event: message/);
    assert.match(text, /event: done/);
    assert.match(text, /Updated roadmap/);
  });

  test("allows refinement when admin session is present, even without token", async () => {
    mockRequireAdmin.mockResolvedValue({ uid: "admin-uid" });
    mockGetPlanById.mockResolvedValue({
      id: "plan-123",
      preview_plan: createPreviewPlan(),
      version: 3,
      edit_token_hashes: [hashEditToken(generateEditToken())],
    });
    mockRefinePlanSection.mockResolvedValue(REFINED_ROADMAP);

    const response = await POST(
      makeRequest({
        plan_id: "plan-123",
        section: "roadmap",
        feedback: "Shorten the rollout.",
      })
    );

    assert.equal(response.status, 200);
  });

  test("returns 401 when no edit token is supplied and caller is not admin", async () => {
    mockGetPlanById.mockResolvedValue({
      id: "plan-123",
      preview_plan: createPreviewPlan(),
      edit_token_hashes: [hashEditToken(generateEditToken())],
    });

    const response = await POST(
      makeRequest({
        plan_id: "plan-123",
        section: "roadmap",
        feedback: "Shorten the rollout.",
      })
    );

    assert.equal(response.status, 401);
  });

  test("returns 401 when edit token does not match", async () => {
    mockGetPlanById.mockResolvedValue({
      id: "plan-123",
      preview_plan: createPreviewPlan(),
      edit_token_hashes: [hashEditToken(generateEditToken())],
    });

    const response = await POST(
      makeRequest({
        plan_id: "plan-123",
        section: "roadmap",
        feedback: "Shorten the rollout.",
        edit_token: "wrong-token",
      })
    );

    assert.equal(response.status, 401);
  });

  test("returns 401 when the stored plan has no edit_token_hashes (legacy)", async () => {
    mockGetPlanById.mockResolvedValue({
      id: "plan-legacy",
      preview_plan: createPreviewPlan(),
    });

    const response = await POST(
      makeRequest({
        plan_id: "plan-legacy",
        section: "roadmap",
        feedback: "Shorten the rollout.",
        edit_token: "any-token",
      })
    );

    assert.equal(response.status, 401);
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
