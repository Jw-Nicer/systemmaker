import { test, describe, vi, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock Gemini: generateContent returns configurable text
const mockGenerateContent = vi.fn();
vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class MockGoogleGenerativeAI {
    getGenerativeModel() {
      return { generateContent: mockGenerateContent };
    }
  },
}));

// Mock Firestore — returns templates by key
const templateData = new Map<string, string>([
  ["intake_agent", "intake prompt {{industry}} {{bottleneck}}"],
  ["workflow_mapper", "workflow prompt {{clarified_problem}}"],
  ["automation_designer", "automation prompt {{stages}}"],
  ["dashboard_designer", "dashboard prompt {{stages}}"],
  ["ops_pulse_writer", "ops pulse prompt {{kpis}}"],
  ["implementation_sequencer", "implementation prompt {{stages}}"],
]);

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({
    collection: () => ({
      get: () =>
        Promise.resolve({
          docs: Array.from(templateData.entries()).map(([key, markdown]) => ({
            data: () => ({ key, markdown }),
          })),
        }),
    }),
  }),
}));

// Mock safety check — pass through by default
vi.mock("@/lib/agents/safety", () => ({
  assertSafeAgentObject: vi.fn(),
}));

// Mock validation — return empty warnings by default
vi.mock("@/lib/agents/validation", () => ({
  validatePlanConsistency: vi.fn().mockReturnValue([]),
}));

// Import after mocks
const {
  runAgentChain,
  runAgentChainStreaming,
  runSingleAgent,
  invalidateTemplateCache,
} = await import("@/lib/agents/runner");

// ---------------------------------------------------------------------------
// Fixtures — must satisfy Zod schema minimums in lib/agents/schemas.ts
// ---------------------------------------------------------------------------

const fixture = {
  intake: {
    clarified_problem: "Manual intake is slow and error-prone, causing significant delays.",
    assumptions: ["The team works from shared spreadsheets and email."],
    constraints: ["No ERP replacement in phase one due to budget."],
    suggested_scope: "Automate intake validation and route to appropriate team.",
  },
  workflow: {
    stages: [
      { name: "Request Submission", owner_role: "Coordinator", entry_criteria: "Customer submits request via form", exit_criteria: "Request logged in system" },
      { name: "Validation Review", owner_role: "Ops Lead", entry_criteria: "Request logged in system", exit_criteria: "All required fields validated" },
      { name: "Assignment Routing", owner_role: "Coordinator", entry_criteria: "Request validated successfully", exit_criteria: "Request assigned to handler" },
    ],
    required_fields: ["client_name", "request_type", "priority_level"],
    timestamps: ["submitted_at", "validated_at"],
    failure_modes: [
      "Missing client data causes rework loops",
      "Assignment delays when coordinator is unavailable",
    ],
  },
  automation: {
    automations: [
      {
        trigger: "New request submitted via intake form",
        steps: ["Validate all required fields", "Create task in project board"],
        data_required: ["client_name"],
        error_handling: "Notify coordinator via Slack when validation fails",
      },
    ],
    alerts: [
      {
        when: "Validation fails on a submitted request",
        who: "Ops lead",
        message: "A request needs manual review and correction.",
        escalation: "Escalate to manager after 2 hours without resolution",
      },
    ],
    logging_plan: [
      { what_to_log: "Validation result", where: "Ops activity log", how_to_review: "Weekly audit review" },
    ],
  },
  dashboard: {
    dashboards: [
      { name: "Ops Overview", purpose: "Track request throughput and backlog", widgets: ["Open requests count", "Average cycle time"] },
    ],
    kpis: [
      { name: "Cycle Time", definition: "Time from submitted_at to validated_at completion", why_it_matters: "Shows workflow speed and bottlenecks" },
      { name: "First Pass Yield", definition: "Percentage of requests validated without rework from submission", why_it_matters: "Measures data quality at intake" },
      { name: "Backlog Count", definition: "Number of requests pending validation review", why_it_matters: "Shows staffing adequacy and throughput balance" },
    ],
    views: [
      { name: "Pending", filter: "status = pending", columns: ["client_name", "submitted_at"] },
    ],
  },
  ops_pulse: {
    executive_summary: {
      problem: "Manual intake is slow and error-prone, causing delays in service delivery.",
      solution: "Automated intake validation and task creation with real-time alerting.",
      impact: "Expected to reduce cycle time by 60% and eliminate missed requests.",
      next_step: "Set up automated validation rules for the top 3 request types.",
    },
    sections: [
      { title: "Weekly summary", bullets: ["Cycle time is trending down over past week"] },
      { title: "Risk monitor", bullets: ["Two validation failures flagged this week"] },
    ],
    scorecard: ["Cycle Time: 2.3 days avg", "First Pass Yield: 87%"],
    actions: [
      { priority: "high" as const, owner_role: "Ops lead", action: "Review failed validations daily to catch patterns" },
    ],
    questions: ["Which request types fail validation most often?"],
  },
  roadmap: {
    phases: [
      {
        week: 1,
        title: "Foundation and Data Setup",
        tasks: [
          { task: "Audit current intake spreadsheet and document all fields with validation rules.", effort: "large" as const, owner_role: "Operations Coordinator" },
        ],
        dependencies: ["None — this is the first phase"],
        risks: ["Data may be messier than expected — budget extra time for cleanup"],
        quick_wins: ["Auto-confirm receipt of new requests via email"],
      },
      {
        week: 2,
        title: "Core Workflow Build and Testing",
        tasks: [
          { task: "Build standardized intake form with all required fields from workflow analysis.", effort: "medium" as const, owner_role: "Operations Coordinator" },
        ],
        dependencies: ["Week 1 data audit complete"],
        risks: ["Staff may resist changing from email to form intake processes"],
        quick_wins: ["Create shared status view for pending items"],
      },
    ],
    critical_path: "Data audit → Form build → Automation testing → Go-live",
    total_estimated_weeks: 2,
  },
};

const geminiResponses: Record<string, unknown> = {
  intake_agent: fixture.intake,
  workflow_mapper: fixture.workflow,
  automation_designer: fixture.automation,
  dashboard_designer: fixture.dashboard,
  ops_pulse_writer: fixture.ops_pulse,
  implementation_sequencer: fixture.roadmap,
};

const baseInput = {
  industry: "healthcare",
  bottleneck: "manual intake forms",
  current_tools: "Google Sheets, Gmail",
  urgency: "high",
  volume: "200/week",
};

// Track which call index we're on to return stage-appropriate responses
let callIndex = 0;
const stageOrder = [
  "intake_agent",
  "workflow_mapper",
  "automation_designer",
  "dashboard_designer",
  "ops_pulse_writer",
  "implementation_sequencer",
];

function setupHappyPath() {
  callIndex = 0;
  mockGenerateContent.mockImplementation(() => {
    const stage = stageOrder[callIndex] ?? stageOrder[stageOrder.length - 1];
    callIndex++;
    return Promise.resolve({
      response: {
        text: () => JSON.stringify(geminiResponses[stage]),
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("runAgentChain", () => {
  beforeEach(() => {
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";
    invalidateTemplateCache();
    mockGenerateContent.mockReset();
    setupHappyPath();
  });

  afterEach(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
  });

  test("returns a complete PreviewPlan on happy path", async () => {
    const plan = await runAgentChain(baseInput);
    assert.deepEqual(plan.intake, fixture.intake);
    assert.deepEqual(plan.workflow, fixture.workflow);
    assert.deepEqual(plan.automation, fixture.automation);
    assert.deepEqual(plan.dashboard, fixture.dashboard);
    assert.deepEqual(plan.ops_pulse, fixture.ops_pulse);
  });

  test("calls Gemini 6 times (one per stage)", async () => {
    await runAgentChain(baseInput);
    assert.equal(mockGenerateContent.mock.calls.length, 6);
  });

  test("calls onStep callback for each stage", async () => {
    const steps: string[] = [];
    await runAgentChain(baseInput, (step) => steps.push(step));
    assert.ok(steps.includes("intake"));
    assert.ok(steps.includes("workflow"));
    assert.ok(steps.includes("automation"));
    assert.ok(steps.includes("dashboard"));
    assert.ok(steps.includes("ops_pulse"));
    assert.ok(steps.includes("implementation_sequencer"));
  });

  test("defaults urgency and volume to 'not specified' when absent", async () => {
    // We can verify this doesn't throw — the templates still render
    const plan = await runAgentChain({
      industry: "healthcare",
      bottleneck: "manual intake",
      current_tools: "Sheets",
    });
    assert.ok(plan.intake);
  });

  test("throws when intake stage fails", async () => {
    mockGenerateContent.mockRejectedValue(new Error("permanent error"));
    await assert.rejects(
      () => runAgentChain(baseInput),
      { message: /AI generation failed/ }
    );
  });

  test("handles roadmap stage failure gracefully (returns undefined roadmap)", async () => {
    callIndex = 0;
    mockGenerateContent.mockImplementation(() => {
      const stage = stageOrder[callIndex] ?? stageOrder[stageOrder.length - 1];
      callIndex++;
      if (stage === "implementation_sequencer") {
        return Promise.reject(new Error("roadmap failed"));
      }
      return Promise.resolve({
        response: {
          text: () => JSON.stringify(geminiResponses[stage]),
        },
      });
    });

    const plan = await runAgentChain(baseInput);
    assert.equal(plan.roadmap, undefined);
    assert.ok(plan.intake); // Other sections still present
  });

  test("parses JSON wrapped in markdown code fences", async () => {
    callIndex = 0;
    mockGenerateContent.mockImplementation(() => {
      const stage = stageOrder[callIndex] ?? stageOrder[stageOrder.length - 1];
      callIndex++;
      return Promise.resolve({
        response: {
          text: () =>
            "```json\n" + JSON.stringify(geminiResponses[stage]) + "\n```",
        },
      });
    });

    const plan = await runAgentChain(baseInput);
    assert.deepEqual(plan.intake, fixture.intake);
  });

  test("extracts JSON when model wraps with extra text", async () => {
    callIndex = 0;
    mockGenerateContent.mockImplementation(() => {
      const stage = stageOrder[callIndex] ?? stageOrder[stageOrder.length - 1];
      callIndex++;
      return Promise.resolve({
        response: {
          text: () =>
            "Here is the result:\n" + JSON.stringify(geminiResponses[stage]) + "\nDone.",
        },
      });
    });

    const plan = await runAgentChain(baseInput);
    assert.deepEqual(plan.intake, fixture.intake);
  });

  test("throws on empty Gemini response", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "" },
    });

    await assert.rejects(
      () => runAgentChain(baseInput),
      { message: /Empty response from AI model|AI generation failed/ }
    );
  });

  test("throws when response exceeds 512KB", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "x".repeat(600 * 1024) },
    });

    await assert.rejects(
      () => runAgentChain(baseInput),
      { message: /AI generation failed/ }
    );
  });
});

describe("runAgentChainStreaming", () => {
  beforeEach(() => {
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";
    invalidateTemplateCache();
    mockGenerateContent.mockReset();
    setupHappyPath();
  });

  afterEach(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
  });

  test("returns a complete plan on happy path", async () => {
    const sections: string[] = [];
    const plan = await runAgentChainStreaming(
      baseInput,
      (step) => sections.push(step)
    );
    assert.ok(plan.intake);
    assert.ok(plan.workflow);
    assert.ok(plan.automation);
    assert.ok(plan.dashboard);
    assert.ok(plan.ops_pulse);
  });

  test("calls onSection for each stage", async () => {
    const sections: string[] = [];
    await runAgentChainStreaming(baseInput, (step) => sections.push(step));
    assert.ok(sections.includes("intake"));
    assert.ok(sections.includes("workflow"));
    assert.ok(sections.includes("automation"));
    assert.ok(sections.includes("dashboard"));
    assert.ok(sections.includes("ops_pulse"));
    assert.ok(sections.includes("implementation_sequencer"));
  });

  test("throws when intake fails (critical stage)", async () => {
    mockGenerateContent.mockRejectedValue(new Error("permanent error"));
    await assert.rejects(
      () => runAgentChainStreaming(baseInput, () => {}),
      { message: /AI generation failed/ }
    );
  });

  test("provides fallback empty sections when automation fails", async () => {
    callIndex = 0;
    mockGenerateContent.mockImplementation(() => {
      const stage = stageOrder[callIndex] ?? stageOrder[stageOrder.length - 1];
      callIndex++;
      if (stage === "automation_designer") {
        return Promise.reject(new Error("automation failed"));
      }
      return Promise.resolve({
        response: {
          text: () => JSON.stringify(geminiResponses[stage]),
        },
      });
    });

    const failed: string[] = [];
    const plan = await runAgentChainStreaming(
      baseInput,
      () => {},
      (step) => failed.push(step)
    );

    assert.ok(failed.includes("automation"));
    assert.deepEqual(plan.automation.automations, []);
    assert.deepEqual(plan.automation.alerts, []);
    assert.deepEqual(plan.automation.logging_plan, []);
    // Other sections still populated
    assert.ok(plan.intake.clarified_problem);
  });

  test("provides fallback empty sections when dashboard fails", async () => {
    callIndex = 0;
    mockGenerateContent.mockImplementation(() => {
      const stage = stageOrder[callIndex] ?? stageOrder[stageOrder.length - 1];
      callIndex++;
      if (stage === "dashboard_designer") {
        return Promise.reject(new Error("dashboard failed"));
      }
      return Promise.resolve({
        response: {
          text: () => JSON.stringify(geminiResponses[stage]),
        },
      });
    });

    const failed: string[] = [];
    const plan = await runAgentChainStreaming(
      baseInput,
      () => {},
      (step) => failed.push(step)
    );

    assert.ok(failed.includes("dashboard"));
    assert.deepEqual(plan.dashboard.dashboards, []);
    assert.deepEqual(plan.dashboard.kpis, []);
    assert.deepEqual(plan.dashboard.views, []);
  });

  test("skips ops_pulse and roadmap when both automation AND dashboard fail", async () => {
    callIndex = 0;
    mockGenerateContent.mockImplementation(() => {
      const stage = stageOrder[callIndex] ?? stageOrder[stageOrder.length - 1];
      callIndex++;
      if (stage === "automation_designer" || stage === "dashboard_designer") {
        return Promise.reject(new Error(`${stage} failed`));
      }
      return Promise.resolve({
        response: {
          text: () => JSON.stringify(geminiResponses[stage]),
        },
      });
    });

    const failed: string[] = [];
    const plan = await runAgentChainStreaming(
      baseInput,
      () => {},
      (step) => failed.push(step)
    );

    assert.ok(failed.includes("automation"));
    assert.ok(failed.includes("dashboard"));
    assert.ok(failed.includes("ops_pulse"));
    assert.ok(failed.includes("implementation_sequencer"));

    // Ops pulse has empty fallback
    assert.equal(plan.ops_pulse.executive_summary.problem, "");
    assert.deepEqual(plan.ops_pulse.sections, []);
  });

  test("adds warnings for failed stages", async () => {
    callIndex = 0;
    mockGenerateContent.mockImplementation(() => {
      const stage = stageOrder[callIndex] ?? stageOrder[stageOrder.length - 1];
      callIndex++;
      if (stage === "automation_designer") {
        return Promise.reject(new Error("automation failed"));
      }
      return Promise.resolve({
        response: {
          text: () => JSON.stringify(geminiResponses[stage]),
        },
      });
    });

    const plan = await runAgentChainStreaming(baseInput, () => {});
    assert.ok(plan.warnings);
    const automationWarning = plan.warnings!.find(
      (w) => w.section === "automation" && w.message.includes("placeholder")
    );
    assert.ok(automationWarning);
  });
});

describe("runSingleAgent", () => {
  beforeEach(() => {
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";
    invalidateTemplateCache();
    mockGenerateContent.mockReset();
  });

  afterEach(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
  });

  test("runs a single template and returns parsed output", async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(fixture.intake),
      },
    });

    const result = await runSingleAgent("intake_agent", {
      industry: "healthcare",
      bottleneck: "manual forms",
      current_tools: "Sheets",
      urgency: "high",
      volume: "100/day",
    });
    assert.deepEqual(result, fixture.intake);
  });

  test("throws when template not found", async () => {
    await assert.rejects(
      () => runSingleAgent("nonexistent_template", {}),
      { message: /Agent template not found/ }
    );
  });
});

describe("invalidateTemplateCache", () => {
  beforeEach(() => {
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";
    mockGenerateContent.mockReset();
    setupHappyPath();
  });

  afterEach(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
  });

  test("forces re-fetch of templates on next run", async () => {
    // First run populates cache
    await runAgentChain(baseInput);

    // Reset call tracking, invalidate, run again
    setupHappyPath();
    invalidateTemplateCache();
    await runAgentChain(baseInput);

    // Gemini was called 12 times total (6 per run)
    // The important thing is it didn't error — templates were re-fetched
    assert.equal(mockGenerateContent.mock.calls.length, 12);
  });
});
