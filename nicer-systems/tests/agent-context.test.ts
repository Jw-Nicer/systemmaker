import { test, describe, vi } from "vitest";
import assert from "node:assert/strict";

import {
  CONTEXT_MAPPINGS,
  assembleStageContext,
  validateDependencies,
  getFallbackOutput,
  type AgentPipelineInput,
} from "@/lib/agents/context";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const baseInput: AgentPipelineInput = {
  industry: "healthcare",
  bottleneck: "manual patient intake",
  current_tools: "Google Sheets, email",
  urgency: "high",
  volume: "200/week",
};

const minimalInput: AgentPipelineInput = {
  industry: "construction",
  bottleneck: "job scheduling",
  current_tools: "pen and paper",
};

// ---------------------------------------------------------------------------
// CONTEXT_MAPPINGS["intake_agent"]
// ---------------------------------------------------------------------------

describe('CONTEXT_MAPPINGS["intake_agent"]', () => {
  test("returns industry, bottleneck, current_tools, urgency, volume from input", () => {
    const ctx = CONTEXT_MAPPINGS["intake_agent"](baseInput, new Map());
    assert.equal(ctx.industry, "healthcare");
    assert.equal(ctx.bottleneck, "manual patient intake");
    assert.equal(ctx.current_tools, "Google Sheets, email");
    assert.equal(ctx.urgency, "high");
    assert.equal(ctx.volume, "200/week");
  });

  test("defaults urgency and volume to 'not specified' when absent", () => {
    const ctx = CONTEXT_MAPPINGS["intake_agent"](minimalInput, new Map());
    assert.equal(ctx.urgency, "not specified");
    assert.equal(ctx.volume, "not specified");
  });
});

// ---------------------------------------------------------------------------
// CONTEXT_MAPPINGS["workflow_mapper"]
// ---------------------------------------------------------------------------

describe('CONTEXT_MAPPINGS["workflow_mapper"]', () => {
  test("uses intake result's clarified_problem when available", () => {
    const results = new Map<string, unknown>([
      [
        "intake",
        {
          clarified_problem: "digitize patient intake forms",
          assumptions: ["HIPAA compliance needed"],
          suggested_scope: "intake automation",
          constraints: [],
        },
      ],
    ]);
    const ctx = CONTEXT_MAPPINGS["workflow_mapper"](baseInput, results);
    assert.equal(ctx.clarified_problem, "digitize patient intake forms");
    assert.deepEqual(ctx.assumptions, ["HIPAA compliance needed"]);
    assert.equal(ctx.suggested_scope, "intake automation");
    assert.equal(ctx.industry, "healthcare");
    assert.equal(ctx.current_tools, "Google Sheets, email");
  });

  test("falls back to input.bottleneck when intake is missing", () => {
    const ctx = CONTEXT_MAPPINGS["workflow_mapper"](baseInput, new Map());
    assert.equal(ctx.clarified_problem, "manual patient intake");
    assert.deepEqual(ctx.assumptions, []);
    assert.equal(ctx.suggested_scope, "");
  });
});

// ---------------------------------------------------------------------------
// CONTEXT_MAPPINGS["automation_designer"]
// ---------------------------------------------------------------------------

describe('CONTEXT_MAPPINGS["automation_designer"]', () => {
  test("uses workflow stages, required_fields, failure_modes", () => {
    const results = new Map<string, unknown>([
      [
        "workflow",
        {
          stages: [{ name: "intake", owner_role: "admin" }],
          required_fields: ["patient_name", "dob"],
          failure_modes: ["missing insurance info"],
          timestamps: [],
        },
      ],
    ]);
    const ctx = CONTEXT_MAPPINGS["automation_designer"](baseInput, results);
    assert.deepEqual(ctx.stages, [{ name: "intake", owner_role: "admin" }]);
    assert.deepEqual(ctx.required_fields, ["patient_name", "dob"]);
    assert.deepEqual(ctx.failure_modes, ["missing insurance info"]);
    assert.equal(ctx.current_tools, "Google Sheets, email");
  });

  test("falls back to empty arrays when workflow is missing", () => {
    const ctx = CONTEXT_MAPPINGS["automation_designer"](baseInput, new Map());
    assert.deepEqual(ctx.stages, []);
    assert.deepEqual(ctx.required_fields, []);
    assert.deepEqual(ctx.failure_modes, []);
  });
});

// ---------------------------------------------------------------------------
// CONTEXT_MAPPINGS["dashboard_designer"]
// ---------------------------------------------------------------------------

describe('CONTEXT_MAPPINGS["dashboard_designer"]', () => {
  test("uses workflow stages, timestamps, industry", () => {
    const results = new Map<string, unknown>([
      [
        "workflow",
        {
          stages: [{ name: "review" }],
          required_fields: [],
          timestamps: ["created_at", "completed_at"],
          failure_modes: [],
        },
      ],
    ]);
    const ctx = CONTEXT_MAPPINGS["dashboard_designer"](baseInput, results);
    assert.deepEqual(ctx.stages, [{ name: "review" }]);
    assert.deepEqual(ctx.timestamps, ["created_at", "completed_at"]);
    assert.equal(ctx.industry, "healthcare");
    assert.deepEqual(ctx.required_fields, []);
  });
});

// ---------------------------------------------------------------------------
// CONTEXT_MAPPINGS["ops_pulse_writer"]
// ---------------------------------------------------------------------------

describe('CONTEXT_MAPPINGS["ops_pulse_writer"]', () => {
  test("uses dashboard kpis, dashboards, workflow failure_modes", () => {
    const results = new Map<string, unknown>([
      [
        "dashboard",
        {
          dashboards: [{ name: "Ops Dashboard" }],
          kpis: [{ name: "Intake Time" }],
          views: [],
        },
      ],
      [
        "workflow",
        {
          stages: [],
          required_fields: [],
          timestamps: [],
          failure_modes: ["duplicate entry"],
        },
      ],
    ]);
    const ctx = CONTEXT_MAPPINGS["ops_pulse_writer"](baseInput, results);
    assert.deepEqual(ctx.kpis, [{ name: "Intake Time" }]);
    assert.deepEqual(ctx.dashboards, [{ name: "Ops Dashboard" }]);
    assert.deepEqual(ctx.failure_modes, ["duplicate entry"]);
  });
});

// ---------------------------------------------------------------------------
// CONTEXT_MAPPINGS["implementation_sequencer"]
// ---------------------------------------------------------------------------

describe('CONTEXT_MAPPINGS["implementation_sequencer"]', () => {
  test("aggregates from all prior stages", () => {
    const results = new Map<string, unknown>([
      [
        "intake",
        {
          clarified_problem: "digitize intake",
          assumptions: ["HIPAA"],
          constraints: ["budget < $5k"],
          suggested_scope: "phase 1",
        },
      ],
      [
        "workflow",
        {
          stages: [{ name: "intake" }],
          required_fields: [],
          timestamps: [],
          failure_modes: [],
        },
      ],
      [
        "automation",
        {
          automations: [{ trigger: "form submit" }],
          alerts: [{ condition: "error" }],
          logging_plan: [],
        },
      ],
      [
        "dashboard",
        {
          dashboards: [{ name: "Main" }],
          kpis: [{ name: "Throughput" }],
          views: [],
        },
      ],
    ]);
    const ctx = CONTEXT_MAPPINGS["implementation_sequencer"](baseInput, results);
    assert.equal(ctx.clarified_problem, "digitize intake");
    assert.deepEqual(ctx.assumptions, ["HIPAA"]);
    assert.deepEqual(ctx.constraints, ["budget < $5k"]);
    assert.equal(ctx.suggested_scope, "phase 1");
    assert.deepEqual(ctx.stages, [{ name: "intake" }]);
    assert.deepEqual(ctx.automations, [{ trigger: "form submit" }]);
    assert.deepEqual(ctx.alerts, [{ condition: "error" }]);
    assert.deepEqual(ctx.dashboards, [{ name: "Main" }]);
    assert.deepEqual(ctx.kpis, [{ name: "Throughput" }]);
  });
});

// ---------------------------------------------------------------------------
// assembleStageContext
// ---------------------------------------------------------------------------

describe("assembleStageContext", () => {
  test("returns {} with console.warn for unknown template key", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const ctx = assembleStageContext("nonexistent_stage", baseInput, new Map());

    assert.deepEqual(ctx, {});
    assert.ok(warnSpy.mock.calls.length >= 1, "console.warn should be called");
    const msg = warnSpy.mock.calls[0][0] as string;
    assert.ok(
      msg.includes("nonexistent_stage"),
      "warning should mention the unknown key"
    );

    warnSpy.mockRestore();
  });

  test("delegates to the correct mapping for a known key", () => {
    const ctx = assembleStageContext("intake_agent", baseInput, new Map());
    assert.equal(ctx.industry, "healthcare");
    assert.equal(ctx.bottleneck, "manual patient intake");
  });
});

// ---------------------------------------------------------------------------
// validateDependencies
// ---------------------------------------------------------------------------

describe("validateDependencies", () => {
  test("returns missing dependency keys", () => {
    const results = new Map<string, unknown>([
      ["intake", { clarified_problem: "test" }],
    ]);
    const missing = validateDependencies(
      ["intake", "workflow", "automation"],
      results
    );
    assert.deepEqual(missing, ["workflow", "automation"]);
  });

  test("returns empty array when all dependencies present", () => {
    const results = new Map<string, unknown>([
      ["intake", {}],
      ["workflow", {}],
    ]);
    const missing = validateDependencies(["intake", "workflow"], results);
    assert.deepEqual(missing, []);
  });

  test("requireAll=true treats null as missing", () => {
    const results = new Map<string, unknown>([
      ["intake", null],
      ["workflow", { stages: [] }],
    ]);
    const missing = validateDependencies(
      ["intake", "workflow"],
      results,
      true
    );
    assert.deepEqual(missing, ["intake"]);
  });
});

// ---------------------------------------------------------------------------
// getFallbackOutput
// ---------------------------------------------------------------------------

describe("getFallbackOutput", () => {
  test('getFallbackOutput("automation") returns {automations:[], alerts:[], logging_plan:[]}', () => {
    const fb = getFallbackOutput("automation") as Record<string, unknown>;
    assert.deepEqual(fb, {
      automations: [],
      alerts: [],
      logging_plan: [],
    });
  });

  test('getFallbackOutput("dashboard") returns {dashboards:[], kpis:[], views:[]}', () => {
    const fb = getFallbackOutput("dashboard") as Record<string, unknown>;
    assert.deepEqual(fb, {
      dashboards: [],
      kpis: [],
      views: [],
    });
  });

  test('getFallbackOutput("implementation_sequencer") returns undefined', () => {
    const fb = getFallbackOutput("implementation_sequencer");
    assert.equal(fb, undefined);
  });

  test("getFallbackOutput for unknown key returns undefined", () => {
    const fb = getFallbackOutput("nonexistent");
    assert.equal(fb, undefined);
  });
});
