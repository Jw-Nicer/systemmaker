import { beforeEach, describe, test, vi } from "vitest";
import assert from "node:assert/strict";

const mockEnforceRateLimit = vi.fn().mockResolvedValue(null);
const mockHasFilledHoneypot = vi.fn().mockReturnValue(false);
vi.mock("@/lib/security/request-guards", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
  hasFilledHoneypot: (...args: unknown[]) => mockHasFilledHoneypot(...args),
}));

const mockSavePlanRefinement = vi.fn();
const mockGetPlanById = vi.fn();
vi.mock("@/lib/firestore/plans", () => ({
  savePlanRefinement: (...args: unknown[]) => mockSavePlanRefinement(...args),
  getPlanById: (...args: unknown[]) => mockGetPlanById(...args),
}));

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/firebase/auth", () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}));

const { POST } = await import("@/app/api/agent/refine/apply/route");
const { generateEditToken, hashEditToken } = await import(
  "@/lib/plans/edit-token"
);

function makeRequest(body: unknown) {
  return new Request("https://example.com/api/agent/refine/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.21" },
    body: JSON.stringify(body),
  });
}

const VALID_ROADMAP = {
  phases: [
    {
      week: 1,
      title: "Foundation",
      tasks: [
        {
          task: "Clean the intake spreadsheet and confirm required fields.",
          effort: "medium",
          owner_role: "Operations Coordinator",
        },
      ],
      dependencies: ["None — this is the first phase"],
      risks: ["Source data may need extra cleanup time."],
      quick_wins: ["Add an automated submission confirmation."],
    },
    {
      week: 2,
      title: "Build and test",
      tasks: [
        {
          task: "Launch the form and verify routing with sample requests.",
          effort: "large",
          owner_role: "Operations Lead",
        },
      ],
      dependencies: ["Week 1 foundation complete"],
      risks: ["Routing rules may miss edge cases at first."],
      quick_wins: [],
    },
  ],
  critical_path: "Cleanup → Form launch → Routing validation",
  total_estimated_weeks: 2,
};

describe("POST /api/agent/refine/apply", () => {
  beforeEach(() => {
    mockEnforceRateLimit.mockResolvedValue(null);
    mockHasFilledHoneypot.mockReturnValue(false);
    mockSavePlanRefinement.mockReset();
    mockGetPlanById.mockReset();
    mockRequireAdmin.mockReset();
    mockRequireAdmin.mockResolvedValue(null);
  });

  test("persists accepted roadmap refinements when edit token matches", async () => {
    const token = generateEditToken();
    mockGetPlanById.mockResolvedValue({
      id: "plan-123",
      edit_token_hashes: [hashEditToken(token)],
    });

    const response = await POST(
      makeRequest({
        plan_id: "plan-123",
        section: "roadmap",
        refined_content: VALID_ROADMAP,
        feedback: "Keep it to two weeks.",
        edit_token: token,
      })
    );

    assert.equal(response.status, 200);
    assert.equal(mockSavePlanRefinement.mock.calls.length, 1);
    assert.deepEqual(mockSavePlanRefinement.mock.calls[0]?.[1], {
      section: "implementation_sequencer",
      content: VALID_ROADMAP,
      feedback: "Keep it to two weeks.",
    });
  });

  test("persists refinements for admin session without a token", async () => {
    mockRequireAdmin.mockResolvedValue({ uid: "admin-uid" });

    const response = await POST(
      makeRequest({
        plan_id: "plan-123",
        section: "roadmap",
        refined_content: VALID_ROADMAP,
      })
    );

    assert.equal(response.status, 200);
    assert.equal(mockSavePlanRefinement.mock.calls.length, 1);
    // getPlanById should not be called on admin fast path
    assert.equal(mockGetPlanById.mock.calls.length, 0);
  });

  test("returns 401 when no token is supplied and caller is not admin", async () => {
    mockGetPlanById.mockResolvedValue({
      id: "plan-123",
      edit_token_hashes: [hashEditToken(generateEditToken())],
    });

    const response = await POST(
      makeRequest({
        plan_id: "plan-123",
        section: "roadmap",
        refined_content: VALID_ROADMAP,
      })
    );

    assert.equal(response.status, 401);
    assert.equal(mockSavePlanRefinement.mock.calls.length, 0);
  });

  test("returns 401 when edit token is wrong", async () => {
    mockGetPlanById.mockResolvedValue({
      id: "plan-123",
      edit_token_hashes: [hashEditToken(generateEditToken())],
    });

    const response = await POST(
      makeRequest({
        plan_id: "plan-123",
        section: "roadmap",
        refined_content: VALID_ROADMAP,
        edit_token: "wrong",
      })
    );

    assert.equal(response.status, 401);
    assert.equal(mockSavePlanRefinement.mock.calls.length, 0);
  });

  test("returns 404 when plan is missing and caller is not admin", async () => {
    mockGetPlanById.mockResolvedValue(null);

    const response = await POST(
      makeRequest({
        plan_id: "missing",
        section: "roadmap",
        refined_content: VALID_ROADMAP,
        edit_token: "whatever",
      })
    );

    assert.equal(response.status, 404);
    assert.equal(mockSavePlanRefinement.mock.calls.length, 0);
  });

  test("rejects malformed refined content before auth check", async () => {
    const response = await POST(
      makeRequest({
        plan_id: "plan-123",
        section: "roadmap",
        refined_content: { total_estimated_weeks: 2 },
      })
    );

    assert.equal(response.status, 400);
    assert.equal(mockSavePlanRefinement.mock.calls.length, 0);
  });
});
