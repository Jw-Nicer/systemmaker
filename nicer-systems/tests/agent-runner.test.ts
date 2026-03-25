import { test, describe, vi, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Mocks — mock at module boundaries to test DAG orchestration logic
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
      doc: () => ({
        get: () => Promise.resolve({ exists: false, data: () => undefined }),
        update: () => Promise.resolve(),
      }),
    }),
    runTransaction: (fn: (tx: { get: (docRef: unknown) => Promise<{ exists: boolean; data: () => unknown }>; update: () => void }) => Promise<unknown>) =>
      fn({
        get: () => Promise.resolve({ exists: false, data: () => undefined }),
        update: () => undefined,
      }),
  }),
}));

// Mock safety guardrails — pass through by default
vi.mock("@/lib/agents/safety", () => ({
  enforceOutputSafety: vi.fn(),
  assertSafeAgentObject: vi.fn(), // backward compat
}));

// Mock cross-section guardrails — return empty warnings by default
vi.mock("@/lib/agents/validation", () => ({
  runCrossSectionGuardrails: vi.fn().mockReturnValue([]),
  validatePlanConsistency: vi.fn().mockReturnValue([]),
}));

// Mock tool use — return empty context (no RAG in tests)
vi.mock("@/lib/agents/tools", () => ({
  getToolContextForStage: vi.fn().mockResolvedValue(""),
  getToolsForStage: vi.fn().mockReturnValue([]),
  executeTool: vi.fn().mockResolvedValue({ tool: "", input: {}, output: null, latencyMs: 0 }),
}));

// Mock tracing — no-op in tests
vi.mock("@/lib/agents/tracing", () => ({
  createTrace: vi.fn().mockReturnValue({
    traceId: "test-trace",
    pipelineType: "plan_generation",
    startedAt: Date.now(),
    status: "running",
    spans: [],
    degradedStages: [],
  }),
  startSpan: vi.fn().mockReturnValue({
    spanId: "test-span",
    traceId: "test-trace",
    stage: "",
    model: "",
    startedAt: Date.now(),
    status: "running",
  }),
  endSpan: vi.fn(),
  finalizeTrace: vi.fn(),
  emitTraceLog: vi.fn(),
  bufferTrace: vi.fn(),
}));

// Mock self-correction — calls through to LLM but tracks corrections
const mockExecuteStageWithCorrection = vi.fn();
vi.mock("@/lib/agents/self-correction", () => ({
  executeStageWithCorrection: (...args: unknown[]) =>
    mockExecuteStageWithCorrection(...args),
  executeWithSelfCorrection: vi.fn(),
}));

// Import after mocks
const {
  runAgentChain,
  runAgentChainStreaming,
  orchestrateAgentPipeline,
  orchestrateAgentPipelineStreaming,
  runSingleAgent,
  invalidateTemplateCache,
} = await import("@/lib/agents/runner");

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
let consoleLogSpy: ReturnType<typeof vi.spyOn>;

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

/** Map template key → fixture data for self-correction mock */
const fixtureByTemplateKey: Record<string, unknown> = {
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

/**
 * Setup happy path — self-correction mock returns fixture directly.
 * This tests the DAG orchestration logic without actual LLM calls.
 */
function setupHappyPath() {
  mockExecuteStageWithCorrection.mockImplementation(
    (templateKey: string) => {
      const data = fixtureByTemplateKey[templateKey];
      if (!data) throw new Error(`No fixture for ${templateKey}`);
      return Promise.resolve({
        output: data,
        corrections: 0,
        wasAutoFixed: false,
        model: "gemini-2.5-flash",
        totalLatencyMs: 100,
      });
    }
  );
}

/**
 * Setup a failure for a specific stage.
 */
function setupStageFailure(failingTemplateKey: string) {
  mockExecuteStageWithCorrection.mockImplementation(
    (templateKey: string) => {
      if (templateKey === failingTemplateKey) {
        return Promise.reject(new Error(`${failingTemplateKey} failed`));
      }
      const data = fixtureByTemplateKey[templateKey];
      if (!data) throw new Error(`No fixture for ${templateKey}`);
      return Promise.resolve({
        output: data,
        corrections: 0,
        wasAutoFixed: false,
        model: "gemini-2.5-flash",
        totalLatencyMs: 100,
      });
    }
  );
}

// ---------------------------------------------------------------------------
// Tests — DAG orchestration via backward-compatible wrappers
// ---------------------------------------------------------------------------

describe("runAgentChain (backward-compat wrapper)", () => {
  beforeEach(() => {
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";
    invalidateTemplateCache();
    mockExecuteStageWithCorrection.mockReset();
    setupHappyPath();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  test("returns a complete PreviewPlan on happy path", async () => {
    const plan = await runAgentChain(baseInput);
    assert.deepEqual(plan.intake, fixture.intake);
    assert.deepEqual(plan.workflow, fixture.workflow);
    assert.deepEqual(plan.automation, fixture.automation);
    assert.deepEqual(plan.dashboard, fixture.dashboard);
    assert.deepEqual(plan.ops_pulse, fixture.ops_pulse);
  });

  test("executes all 6 pipeline stages", async () => {
    await runAgentChain(baseInput);
    assert.equal(mockExecuteStageWithCorrection.mock.calls.length, 6);
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
    const plan = await runAgentChain({
      industry: "healthcare",
      bottleneck: "manual intake",
      current_tools: "Sheets",
    });
    assert.ok(plan.intake);
  });

  test("throws when intake stage fails (critical)", async () => {
    setupStageFailure("intake_agent");
    await assert.rejects(
      () => runAgentChain(baseInput),
      { message: /intake_agent failed/ }
    );
  });

  test("handles roadmap stage failure gracefully (returns undefined roadmap)", async () => {
    setupStageFailure("implementation_sequencer");
    const plan = await runAgentChain(baseInput);
    assert.equal(plan.roadmap, undefined);
    assert.ok(plan.intake);
  });

  test("provides fallback empty sections when automation fails", async () => {
    setupStageFailure("automation_designer");
    const plan = await runAgentChain(baseInput);
    assert.deepEqual(plan.automation.automations, []);
    assert.deepEqual(plan.automation.alerts, []);
    assert.deepEqual(plan.automation.logging_plan, []);
    assert.ok(plan.ops_pulse);
    assert.ok(plan.warnings?.some((w) => w.section === "automation"));
  });

  test("skips ops_pulse and roadmap when both automation and dashboard fail", async () => {
    mockExecuteStageWithCorrection.mockImplementation(
      (templateKey: string) => {
        if (templateKey === "automation_designer" || templateKey === "dashboard_designer") {
          return Promise.reject(new Error(`${templateKey} failed`));
        }
        const data = fixtureByTemplateKey[templateKey];
        if (!data) throw new Error(`No fixture for ${templateKey}`);
        return Promise.resolve({
          output: data, corrections: 0, wasAutoFixed: false,
          model: "gemini-2.5-flash", totalLatencyMs: 100,
        });
      }
    );

    const plan = await runAgentChain(baseInput);
    assert.equal(plan.ops_pulse.executive_summary.problem, "");
    assert.equal(plan.roadmap, undefined);
    assert.ok(plan.warnings?.some((w) => w.section === "ops_pulse"));
    assert.ok(plan.warnings?.some((w) => w.section === "implementation_sequencer"));
  });
});

// ---------------------------------------------------------------------------
// Tests — DAG orchestration via new API
// ---------------------------------------------------------------------------

describe("orchestrateAgentPipeline", () => {
  beforeEach(() => {
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";
    invalidateTemplateCache();
    mockExecuteStageWithCorrection.mockReset();
    setupHappyPath();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  test("returns plan and trace on happy path", async () => {
    const { plan, trace } = await orchestrateAgentPipeline(baseInput);
    assert.deepEqual(plan.intake, fixture.intake);
    assert.ok(trace.traceId);
  });

  test("executes stages in tier order (intake → workflow → auto+dash → ops+impl)", async () => {
    const stageOrder: string[] = [];
    mockExecuteStageWithCorrection.mockImplementation(
      (templateKey: string) => {
        stageOrder.push(templateKey);
        const data = fixtureByTemplateKey[templateKey];
        return Promise.resolve({
          output: data, corrections: 0, wasAutoFixed: false,
          model: "gemini-2.5-flash", totalLatencyMs: 100,
        });
      }
    );

    await orchestrateAgentPipeline(baseInput);

    // Intake must be first
    assert.equal(stageOrder[0], "intake_agent");
    // Workflow must be second
    assert.equal(stageOrder[1], "workflow_mapper");
    // Automation and dashboard must come after workflow (order between them may vary)
    const autoIdx = stageOrder.indexOf("automation_designer");
    const dashIdx = stageOrder.indexOf("dashboard_designer");
    assert.ok(autoIdx > 1);
    assert.ok(dashIdx > 1);
    // Ops pulse and implementation must come after auto+dash
    const opsIdx = stageOrder.indexOf("ops_pulse_writer");
    const implIdx = stageOrder.indexOf("implementation_sequencer");
    assert.ok(opsIdx > autoIdx || opsIdx > dashIdx);
    assert.ok(implIdx > autoIdx || implIdx > dashIdx);
  });
});

// ---------------------------------------------------------------------------
// Tests — streaming variant
// ---------------------------------------------------------------------------

describe("runAgentChainStreaming (backward-compat wrapper)", () => {
  beforeEach(() => {
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";
    invalidateTemplateCache();
    mockExecuteStageWithCorrection.mockReset();
    setupHappyPath();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
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
    setupStageFailure("intake_agent");
    await assert.rejects(
      () => runAgentChainStreaming(baseInput, () => {}),
      { message: /intake_agent failed/ }
    );
  });

  test("provides fallback empty sections when automation fails", async () => {
    setupStageFailure("automation_designer");
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
    assert.ok(plan.intake.clarified_problem);
  });

  test("skips ops_pulse and roadmap when both automation AND dashboard fail", async () => {
    mockExecuteStageWithCorrection.mockImplementation(
      (templateKey: string) => {
        if (templateKey === "automation_designer" || templateKey === "dashboard_designer") {
          return Promise.reject(new Error(`${templateKey} failed`));
        }
        const data = fixtureByTemplateKey[templateKey];
        return Promise.resolve({
          output: data, corrections: 0, wasAutoFixed: false,
          model: "gemini-2.5-flash", totalLatencyMs: 100,
        });
      }
    );

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
    assert.equal(plan.ops_pulse.executive_summary.problem, "");
    assert.deepEqual(plan.ops_pulse.sections, []);
  });

  test("adds warnings for failed stages", async () => {
    setupStageFailure("automation_designer");
    const plan = await runAgentChainStreaming(baseInput, () => {});
    assert.ok(plan.warnings);
    const automationWarning = plan.warnings!.find(
      (w) => w.section === "automation" && w.message.includes("placeholder")
    );
    assert.ok(automationWarning);
  });
});

// ---------------------------------------------------------------------------
// Tests — single agent runner
// ---------------------------------------------------------------------------

describe("runSingleAgent", () => {
  beforeEach(() => {
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";
    invalidateTemplateCache();
    mockGenerateContent.mockReset();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
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

// ---------------------------------------------------------------------------
// Tests — template cache
// ---------------------------------------------------------------------------

describe("invalidateTemplateCache", () => {
  beforeEach(() => {
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";
    mockExecuteStageWithCorrection.mockReset();
    setupHappyPath();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY;
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  test("forces re-fetch of templates on next run", async () => {
    await runAgentChain(baseInput);
    setupHappyPath();
    invalidateTemplateCache();
    await runAgentChain(baseInput);
    // 12 total calls (6 per run)
    assert.equal(mockExecuteStageWithCorrection.mock.calls.length, 12);
  });

  test("falls back to local templates when Firestore templates are empty", async () => {
    const entries = Array.from(templateData.entries());
    templateData.clear();

    try {
      setupHappyPath();
      invalidateTemplateCache();
      const plan = await runAgentChain(baseInput);
      assert.ok(plan.intake);
      assert.equal(mockExecuteStageWithCorrection.mock.calls.length, 6);
    } finally {
      for (const [key, value] of entries) {
        templateData.set(key, value);
      }
    }
  });
});
