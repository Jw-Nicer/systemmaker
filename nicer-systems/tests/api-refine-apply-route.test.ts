import { beforeEach, describe, test, vi } from "vitest";
import assert from "node:assert/strict";

const mockEnforceRateLimit = vi.fn().mockResolvedValue(null);
const mockHasFilledHoneypot = vi.fn().mockReturnValue(false);
vi.mock("@/lib/security/request-guards", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
  hasFilledHoneypot: (...args: unknown[]) => mockHasFilledHoneypot(...args),
}));

const mockSavePlanRefinement = vi.fn();
vi.mock("@/lib/firestore/plans", () => ({
  savePlanRefinement: (...args: unknown[]) => mockSavePlanRefinement(...args),
}));

const { POST } = await import("@/app/api/agent/refine/apply/route");

function makeRequest(body: unknown) {
  return new Request("https://example.com/api/agent/refine/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.21" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/agent/refine/apply", () => {
  beforeEach(() => {
    mockEnforceRateLimit.mockResolvedValue(null);
    mockHasFilledHoneypot.mockReturnValue(false);
    mockSavePlanRefinement.mockReset();
  });

  test("persists accepted roadmap refinements", async () => {
    const refinedRoadmap = {
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

    const response = await POST(
      makeRequest({
        plan_id: "plan-123",
        section: "roadmap",
        refined_content: refinedRoadmap,
        feedback: "Keep it to two weeks.",
      })
    );

    assert.equal(response.status, 200);
    assert.equal(mockSavePlanRefinement.mock.calls.length, 1);
    assert.deepEqual(mockSavePlanRefinement.mock.calls[0]?.[1], {
      section: "implementation_sequencer",
      content: refinedRoadmap,
      feedback: "Keep it to two weeks.",
    });
  });

  test("rejects malformed refined content", async () => {
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
