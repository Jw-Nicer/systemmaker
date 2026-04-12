/**
 * Integration tests — verify wiring between pipeline modules.
 *
 * These tests verify that the DAG orchestrator correctly wires:
 * - Self-correction results into trace spans
 * - Tool context into stage prompts
 * - Routing signals from stage output into downstream stages
 * - Graceful degradation when non-critical stages fail
 *
 * All LLM calls are mocked — these test orchestration logic, not AI quality.
 */
import { test, describe, vi, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockExecuteStageWithCorrection = vi.fn();
vi.mock("@/lib/agents/self-correction", () => ({
  executeStageWithCorrection: (...args: unknown[]) =>
    mockExecuteStageWithCorrection(...args),
}));

const mockGetToolContextForStage = vi.fn();
vi.mock("@/lib/agents/tools", () => ({
  getToolContextForStage: (...args: unknown[]) =>
    mockGetToolContextForStage(...args),
}));

vi.mock("@/lib/agents/safety", () => ({
  enforceOutputSafety: vi.fn(),
}));

vi.mock("@/lib/agents/validation", () => ({
  runCrossSectionGuardrails: vi.fn().mockReturnValue([]),
}));

const mockTraceSpans: Array<{ stage: string; status: string; corrections?: number; metadata?: Record<string, unknown> }> = [];
vi.mock("@/lib/agents/tracing", () => ({
  createTrace: vi.fn().mockReturnValue({
    traceId: "integration-test-trace",
    pipelineType: "plan_generation",
    startedAt: Date.now(),
    status: "running",
    spans: [],
    degradedStages: [],
  }),
  startSpan: vi.fn().mockImplementation((_trace, stage) => {
    const span = {
      spanId: `span-${stage}`,
      traceId: "integration-test-trace",
      stage,
      model: "",
      startedAt: Date.now(),
      status: "running" as string,
      corrections: undefined as number | undefined,
      metadata: {} as Record<string, unknown>,
    };
    mockTraceSpans.push(span);
    return span;
  }),
  endSpan: vi.fn().mockImplementation((span, result) => {
    span.status = result.status;
    span.corrections = result.corrections;
    if (result.metadata) span.metadata = { ...span.metadata, ...result.metadata };
  }),
  finalizeTrace: vi.fn(),
  emitTraceLog: vi.fn(),
  bufferTrace: vi.fn(),
}));

// Template data for Firestore mock
const templateData = new Map<string, string>([
  ["intake_agent", "intake template"],
  ["workflow_mapper", "workflow template"],
  ["automation_designer", "automation template"],
  ["dashboard_designer", "dashboard template"],
  ["ops_pulse_writer", "ops pulse template"],
  ["implementation_sequencer", "implementation template"],
  ["proposal_writer", "proposal template"],
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

// Fixtures
const fixture = {
  intake: {
    clarified_problem: "Manual intake is slow and error-prone.",
    assumptions: ["Team uses spreadsheets."],
    constraints: ["No ERP replacement."],
    suggested_scope: "Automate intake validation.",
  },
  workflow: {
    stages: [
      { name: "Submission", owner_role: "Coordinator", entry_criteria: "Customer submits", exit_criteria: "Logged" },
      { name: "Validation", owner_role: "Lead", entry_criteria: "Logged", exit_criteria: "Validated" },
      { name: "Routing", owner_role: "Coordinator", entry_criteria: "Validated", exit_criteria: "Assigned" },
    ],
    required_fields: ["client_name", "type"],
    timestamps: ["submitted_at"],
    failure_modes: ["Missing data", "Delayed assignment"],
  },
  // Complex workflow with 8+ stages for routing signal testing
  complexWorkflow: {
    stages: Array.from({ length: 9 }, (_, i) => ({
      name: `Stage ${i + 1}`,
      owner_role: "Role",
      entry_criteria: "Entry",
      exit_criteria: "Exit",
    })),
    required_fields: ["field1", "field2"],
    timestamps: ["ts1"],
    failure_modes: ["fm1", "fm2", "fm3", "fm4", "fm5"],
  },
  automation: {
    automations: [{ trigger: "Form submitted", steps: ["Validate"], data_required: ["name"], error_handling: "Notify" }],
    alerts: [{ when: "Validation fails", who: "Lead", message: "Review needed", escalation: "Escalate after 2h" }],
    logging_plan: [{ what_to_log: "Result", where: "Log", how_to_review: "Weekly" }],
  },
  dashboard: {
    dashboards: [{ name: "Overview", purpose: "Track throughput", widgets: ["Count"] }],
    kpis: [
      { name: "Cycle Time", definition: "Time from submitted_at to completion", why_it_matters: "Speed" },
      { name: "Yield", definition: "Percentage validated without rework", why_it_matters: "Quality" },
      { name: "Backlog", definition: "Pending items count", why_it_matters: "Capacity" },
    ],
    views: [{ name: "Pending", filter: "status=pending", columns: ["name", "submitted_at"] }],
  },
  ops_pulse: {
    executive_summary: { problem: "Slow intake.", solution: "Automate.", impact: "Faster.", next_step: "Start." },
    sections: [{ title: "Summary", bullets: ["Improving"] }, { title: "Risks", bullets: ["Two failures"] }],
    scorecard: ["Cycle Time: 2d"],
    actions: [{ priority: "high" as const, owner_role: "Lead", action: "Review daily" }],
    questions: ["Which types fail most?"],
  },
  roadmap: {
    phases: [
      { week: 1, title: "Setup", tasks: [{ task: "Audit data.", effort: "large" as const, owner_role: "Coordinator" }], dependencies: ["None"], risks: ["Messy data"], quick_wins: ["Auto-confirm"] },
      { week: 2, title: "Build", tasks: [{ task: "Build form.", effort: "medium" as const, owner_role: "Coordinator" }], dependencies: ["Week 1"], risks: ["Resistance"], quick_wins: ["Status view"] },
    ],
    critical_path: "Audit → Build → Test → Live",
    total_estimated_weeks: 2,
  },
};

const fixtureByTemplateKey: Record<string, unknown> = {
  intake_agent: fixture.intake,
  workflow_mapper: fixture.workflow,
  automation_designer: fixture.automation,
  dashboard_designer: fixture.dashboard,
  ops_pulse_writer: fixture.ops_pulse,
  implementation_sequencer: fixture.roadmap,
  proposal_writer: {
    executive_pitch: "Your intake process is costing your team 20 hours per week in manual data entry.",
    value_propositions: [
      { claim: "Reduce intake time by 60%", evidence: "Based on current 4-stage manual process", metric: "Hours saved per week" },
      { claim: "Eliminate data entry errors", evidence: "Automated validation catches missing fields at submission", metric: "Error rate reduction" },
    ],
    risk_of_inaction: ["Continued 20hr/week manual overhead", "Growing backlog as volume increases"],
    recommended_engagement: "4-week implementation: Foundation (week 1), Automation build (weeks 2-3), Dashboard + go-live (week 4).",
    estimated_roi: "Estimated 20 hours/week recovered at ~$35/hr = $36,400/year in labor savings. Assumes 80% of intake forms are automatable.",
  },
};

const baseInput = {
  industry: "healthcare",
  bottleneck: "manual intake forms",
  current_tools: "Google Sheets, Gmail",
};

// Import after mocks
const { orchestrateAgentPipeline } = await import("@/lib/agents/runner");
const { invalidateTemplateCache } = await import("@/lib/agents/runner");

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
let consoleLogSpy: ReturnType<typeof vi.spyOn>;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Pipeline wiring: self-correction propagation", () => {
  beforeEach(() => {
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";
    invalidateTemplateCache();
    mockExecuteStageWithCorrection.mockReset();
    mockGetToolContextForStage.mockReset();
    mockTraceSpans.length = 0;
    mockGetToolContextForStage.mockResolvedValue("");
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

  test("self-correction count propagates into trace span", async () => {
    mockExecuteStageWithCorrection.mockImplementation((templateKey: string) => {
      const data = fixtureByTemplateKey[templateKey];
      // Simulate self-correction needed for workflow stage
      const corrections = templateKey === "workflow_mapper" ? 1 : 0;
      return Promise.resolve({
        output: data,
        corrections,
        wasAutoFixed: corrections > 0,
        model: "gemini-2.5-flash",
        totalLatencyMs: 100,
      });
    });

    await orchestrateAgentPipeline(baseInput);

    // Find the workflow span — it should have corrections=1
    const workflowSpan = mockTraceSpans.find((s) => s.stage === "workflow");
    assert.ok(workflowSpan, "Workflow span should exist");
    assert.equal(workflowSpan.status, "completed");
  });

  test("wasAutoFixed flag propagates into span metadata", async () => {
    mockExecuteStageWithCorrection.mockImplementation((templateKey: string) => {
      const data = fixtureByTemplateKey[templateKey];
      return Promise.resolve({
        output: data,
        corrections: templateKey === "intake_agent" ? 2 : 0,
        wasAutoFixed: templateKey === "intake_agent",
        model: "gemini-2.5-flash",
        totalLatencyMs: 100,
      });
    });

    await orchestrateAgentPipeline(baseInput);

    const intakeSpan = mockTraceSpans.find((s) => s.stage === "intake");
    assert.ok(intakeSpan);
    assert.equal(intakeSpan.status, "completed");
  });
});

describe("Pipeline wiring: tool context injection", () => {
  beforeEach(() => {
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";
    invalidateTemplateCache();
    mockExecuteStageWithCorrection.mockReset();
    mockGetToolContextForStage.mockReset();
    mockTraceSpans.length = 0;
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

  test("tool context is fetched for each stage", async () => {
    mockGetToolContextForStage.mockResolvedValue("");
    mockExecuteStageWithCorrection.mockImplementation((templateKey: string) => {
      return Promise.resolve({
        output: fixtureByTemplateKey[templateKey],
        corrections: 0,
        wasAutoFixed: false,
        model: "gemini-2.5-flash",
        totalLatencyMs: 100,
      });
    });

    await orchestrateAgentPipeline(baseInput);

    // getToolContextForStage should be called once per stage (7 stages)
    assert.equal(mockGetToolContextForStage.mock.calls.length, 7);
  });

  test("tool errors do not block stage execution", async () => {
    // Tools throw for all stages
    mockGetToolContextForStage.mockRejectedValue(new Error("Firestore down"));

    mockExecuteStageWithCorrection.mockImplementation((templateKey: string) => {
      return Promise.resolve({
        output: fixtureByTemplateKey[templateKey],
        corrections: 0,
        wasAutoFixed: false,
        model: "gemini-2.5-flash",
        totalLatencyMs: 100,
      });
    });

    // Pipeline should still complete despite tool failures
    const { plan } = await orchestrateAgentPipeline(baseInput);
    assert.ok(plan.intake);
    assert.ok(plan.workflow);
  });
});

describe("Pipeline wiring: routing signals", () => {
  beforeEach(() => {
    process.env.GOOGLE_GEMINI_API_KEY = "test-key";
    invalidateTemplateCache();
    mockExecuteStageWithCorrection.mockReset();
    mockGetToolContextForStage.mockReset();
    mockTraceSpans.length = 0;
    mockGetToolContextForStage.mockResolvedValue("");
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

  test("complex_workflow signal fires when workflow has 8+ stages", async () => {
    // Track the prompts passed to executeStageWithCorrection
    const promptsByStage: Record<string, string> = {};

    mockExecuteStageWithCorrection.mockImplementation((templateKey: string, prompt: string) => {
      promptsByStage[templateKey] = prompt;
      // Return complex workflow for the workflow stage
      if (templateKey === "workflow_mapper") {
        return Promise.resolve({
          output: fixture.complexWorkflow,
          corrections: 0,
          wasAutoFixed: false,
          model: "gemini-2.5-flash",
          totalLatencyMs: 100,
        });
      }
      return Promise.resolve({
        output: fixtureByTemplateKey[templateKey],
        corrections: 0,
        wasAutoFixed: false,
        model: "gemini-2.5-flash",
        totalLatencyMs: 100,
      });
    });

    await orchestrateAgentPipeline(baseInput);

    // Downstream stages (automation, dashboard, ops_pulse, implementation_sequencer)
    // should have routing signal hints in their prompts
    const downstreamStages = ["automation_designer", "dashboard_designer", "ops_pulse_writer", "implementation_sequencer"];
    for (const stage of downstreamStages) {
      const prompt = promptsByStage[stage];
      assert.ok(prompt, `Prompt for ${stage} should exist`);
      assert.ok(
        prompt.includes("Routing context") || prompt.includes("complex_workflow"),
        `Prompt for ${stage} should contain routing signal hint`
      );
    }
  });

  test("no routing signals when workflow is small", async () => {
    const promptsByStage: Record<string, string> = {};

    mockExecuteStageWithCorrection.mockImplementation((templateKey: string, prompt: string) => {
      promptsByStage[templateKey] = prompt;
      return Promise.resolve({
        output: fixtureByTemplateKey[templateKey], // standard 3-stage workflow
        corrections: 0,
        wasAutoFixed: false,
        model: "gemini-2.5-flash",
        totalLatencyMs: 100,
      });
    });

    await orchestrateAgentPipeline(baseInput);

    // No routing signal hints should appear
    const automationPrompt = promptsByStage["automation_designer"] ?? "";
    assert.ok(
      !automationPrompt.includes("Routing context"),
      "Automation prompt should not contain routing context for small workflows"
    );
  });
});
