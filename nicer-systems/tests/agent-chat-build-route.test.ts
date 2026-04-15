import { beforeEach, test, vi } from "vitest";
import assert from "node:assert/strict";

const mockGetAdminDb = vi.fn();
const mockOrchestrateAgentPipelineStreaming = vi.fn();
const mockEnforceRateLimit = vi.fn().mockResolvedValue(null);
const mockHasFilledHoneypot = vi.fn().mockReturnValue(false);

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: (...args: unknown[]) => mockGetAdminDb(...args),
}));

vi.mock("@/lib/security/request-guards", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
  hasFilledHoneypot: (...args: unknown[]) => mockHasFilledHoneypot(...args),
}));

vi.mock("@/lib/agents/runner", () => ({
  orchestrateAgentPipelineStreaming: (...args: unknown[]) =>
    mockOrchestrateAgentPipelineStreaming(...args),
}));

vi.mock("@/lib/agents/input-hash", () => ({
  hashAgentInput: () => "hash-123",
}));

vi.mock("@/lib/firestore/plans", () => ({
  findRecentPlanByHash: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/agents/plan-quality", () => ({
  scorePlanQuality: () => ({ score: 88 }),
}));

vi.mock("@/lib/agents/registry", () => ({
  PIPELINE_DAG: [
    { key: "intake", completeLabel: "Bottleneck analysis complete" },
    { key: "workflow", completeLabel: "Workflow mapped" },
  ],
}));

vi.mock("@/lib/agents/conversation", () => ({
  detectPhase: () => "building",
  extractIntakeData: vi.fn(async (_history: unknown, _message: string, extracted: unknown) => extracted),
  extractedHasChanges: () => false,
  generateConversationalResponse: vi.fn(),
  buildPlanSummary: () => "",
  buildDetailedPlanContext: () => "",
  buildConversationSummary: () => "",
  detectContradiction: () => null,
  detectRefinementIntent: () => ({ detected: false }),
}));

vi.mock("@/lib/firestore/industry-probing", () => ({
  getIndustryProbingsFromFirestore: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/agents/memory", () => ({
  recallVisitorContext: vi.fn().mockResolvedValue(null),
  storeMemory: vi.fn().mockResolvedValue(undefined),
  recordInteraction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/leads/scoring", () => ({
  computeLeadScore: () => 42,
}));

vi.mock("@/lib/leads/dedup", () => ({
  findLeadByEmail: vi.fn().mockResolvedValue(null),
  normalizeEmail: (email: string) => email.trim().toLowerCase(),
}));

vi.mock("@/lib/agents/email-template", () => ({
  renderPreviewPlanHTML: () => "<html>plan</html>",
}));

vi.mock("@/lib/email/admin-notification", () => ({
  sendAdminNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/email/nurture-sequence", () => ({
  enrollInNurture: vi.fn().mockResolvedValue(undefined),
}));

const { POST } = await import("@/app/api/agent/chat/route");

const minimalPlan = {
  intake: {
    clarified_problem: "Dispatch approvals stall",
    assumptions: [],
    constraints: [],
    suggested_scope: "Automate intake routing",
  },
  workflow: {
    stages: [{ name: "Intake", owner_role: "Ops", entry_criteria: "Request received", exit_criteria: "Assigned" }],
    required_fields: [],
    timestamps: [],
    failure_modes: [],
  },
  automation: {
    automations: [],
    alerts: [],
    logging_plan: [],
  },
  dashboard: {
    dashboards: [],
    kpis: [{ name: "Cycle time", definition: "Time to assign", why_it_matters: "Measures routing delay" }],
    views: [],
  },
  ops_pulse: {
    executive_summary: {
      problem: "Manual handoff delays",
      solution: "Route intake automatically",
      impact: "Faster assignments",
      next_step: "Review implementation scope",
    },
    sections: [],
    scorecard: [],
    actions: [],
    questions: [],
  },
  warnings: [],
};

function buildDbStub() {
  return {
    collection: (name: string) => ({
      add: vi.fn(async () => ({
        id:
          name === "plans"
            ? "plan-123"
            : name === "leads"
              ? "lead-123"
              : "event-123",
      })),
      doc: vi.fn(() => ({
        update: vi.fn().mockResolvedValue(undefined),
        collection: vi.fn(() => ({
          add: vi.fn().mockResolvedValue({ id: "activity-123" }),
        })),
      })),
    }),
  };
}

function makeRequest(overrides?: Partial<Record<string, unknown>>) {
  return new Request("https://example.com/api/agent/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "198.51.100.40",
    },
    body: JSON.stringify({
      message: "Yes, build it.",
      history: [],
      phase: "confirming",
      extracted: {
        industry: "Logistics",
        bottleneck: "Dispatch approvals still bounce between inboxes.",
        current_tools: "Excel, Email",
      },
      ...overrides,
    }),
  });
}

beforeEach(() => {
  mockEnforceRateLimit.mockResolvedValue(null);
  mockHasFilledHoneypot.mockReturnValue(false);
  mockGetAdminDb.mockReset().mockReturnValue(buildDbStub());
  mockOrchestrateAgentPipelineStreaming.mockReset().mockImplementation(
    async (_input: unknown, onSection: (step: string, label: string, data: unknown) => void) => {
      onSection("intake", "Bottleneck analysis complete", minimalPlan.intake);
      onSection("workflow", "Workflow mapped", minimalPlan.workflow);
      return { plan: minimalPlan, trace: { id: "trace-1" } };
    }
  );
});

test("still streams and completes the preview plan when Firestore is unavailable", async () => {
  mockGetAdminDb.mockImplementation(() => {
    throw new Error("Firestore unavailable");
  });

  const response = await POST(makeRequest());
  assert.equal(response.status, 200);

  const body = await response.text();
  assert.match(body, /event: plan_section/);
  assert.match(body, /Bottleneck analysis complete/);
  assert.match(body, /event: plan_complete/);
  assert.match(body, /"share_url":""/);
  assert.match(body, /Your Preview Plan is ready!/);
  assert.doesNotMatch(body, /Preview plan generation is temporarily unavailable/);
});

test("emits a recoverable SSE error when plan generation fails", async () => {
  mockOrchestrateAgentPipelineStreaming.mockRejectedValue(
    new Error("Upstream provider returned 502")
  );

  const response = await POST(makeRequest());
  assert.equal(response.status, 200);

  const body = await response.text();
  assert.match(body, /event: error/);
  assert.match(
    body,
    /Preview plan generation is temporarily unavailable\. Please try again in a moment\./
  );
  assert.doesNotMatch(body, /event: plan_complete/);
});
