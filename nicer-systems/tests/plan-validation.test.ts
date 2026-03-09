import { test, describe } from "vitest";
import assert from "node:assert/strict";
import { validatePlanConsistency } from "@/lib/agents/validation";
import type { PreviewPlan } from "@/types/preview-plan";

// ---------------------------------------------------------------------------
// Helpers — build a well-connected plan where all sections cross-reference
// ---------------------------------------------------------------------------

function makeCleanPlan(): PreviewPlan {
  return {
    intake: {
      clarified_problem: "Manual patient intake is slow",
      assumptions: ["Staff have email", "20+ intakes/day"],
      constraints: ["HIPAA compliance required"],
      suggested_scope: "Automate intake and triage",
    },
    workflow: {
      stages: [
        { name: "Intake Submission", owner_role: "Front Desk", entry_criteria: "Patient arrives", exit_criteria: "Form submitted" },
        { name: "Triage Review", owner_role: "Nurse", entry_criteria: "Form submitted", exit_criteria: "Priority assigned" },
        { name: "Provider Assignment", owner_role: "Coordinator", entry_criteria: "Priority assigned", exit_criteria: "Provider assigned" },
        { name: "Appointment Scheduling", owner_role: "Scheduler", entry_criteria: "Provider assigned", exit_criteria: "Appointment confirmed" },
        { name: "Follow-Up", owner_role: "Nurse", entry_criteria: "Visit complete", exit_criteria: "Notes filed" },
      ],
      required_fields: ["patient_name", "dob", "insurance_id", "priority_level", "assigned_provider"],
      timestamps: ["submitted_at", "triaged_at", "assigned_at", "scheduled_at"],
      failure_modes: ["Missing insurance info", "Triage bottleneck at peak hours", "Provider unavailable"],
    },
    automation: {
      automations: [
        {
          trigger: "New Intake Submission received",
          steps: ["Validate required fields", "Route to Triage Review queue"],
          data_required: ["patient_name", "insurance_id"],
          error_handling: "Notify front desk on validation failure",
        },
        {
          trigger: "Triage Review complete with high priority",
          steps: ["Auto-assign to available provider", "Send notification"],
          data_required: ["priority_level", "assigned_provider"],
          error_handling: "Escalate to coordinator",
        },
      ],
      alerts: [
        { when: "Intake stuck >30min", who: "Coordinator", message: "Intake delayed", escalation: "Manager after 1h" },
      ],
      logging_plan: [
        { what_to_log: "All state transitions", where: "Firestore", how_to_review: "Admin dashboard" },
      ],
    },
    dashboard: {
      dashboards: [{ name: "Ops Overview", purpose: "Track daily throughput", widgets: ["Intake count", "Avg wait time"] }],
      kpis: [
        { name: "Intake Speed", definition: "Average time from submitted_at to triaged_at", why_it_matters: "Patient satisfaction" },
        { name: "Assignment Rate", definition: "Percentage of triaged patients with assigned_provider within 1h", why_it_matters: "Capacity utilization" },
        { name: "Completion Rate", definition: "Percentage of intakes reaching Follow-Up stage", why_it_matters: "Process reliability" },
        { name: "SLA Compliance", definition: "Percentage of Appointment Scheduling within target window", why_it_matters: "Quality of service" },
      ],
      views: [
        { name: "Active Intakes", filter: "status != completed", columns: ["patient_name", "priority_level", "assigned_provider"] },
      ],
    },
    ops_pulse: {
      executive_summary: { problem: "Manual intake", solution: "Automated pipeline", impact: "50% faster", next_step: "Deploy phase 1" },
      sections: [{ title: "Week 1 Focus", bullets: ["Launch intake form", "Train front desk"] }],
      scorecard: ["Intake Speed trending down", "Assignment Rate at 85%", "Completion Rate stable", "SLA Compliance above target"],
      actions: [
        { priority: "high", owner_role: "Ops", action: "Address missing insurance info by adding pre-validation" },
        { priority: "medium", owner_role: "Coordinator", action: "Review triage bottleneck at peak hours staffing" },
        { priority: "low", owner_role: "IT", action: "Set up provider unavailable fallback routing" },
      ],
      questions: ["Should we add SMS notifications?"],
    },
  };
}

// ---------------------------------------------------------------------------
// validatePlanConsistency — clean plan
// ---------------------------------------------------------------------------

describe("validatePlanConsistency", () => {
  test("returns no warnings for a well-connected plan", () => {
    const plan = makeCleanPlan();
    const warnings = validatePlanConsistency(plan);
    assert.deepEqual(warnings, []);
  });

  // -------------------------------------------------------------------------
  // Automation → Workflow cross-references
  // -------------------------------------------------------------------------

  describe("automation ↔ workflow", () => {
    test("warns when automation trigger doesn't reference any workflow stage", () => {
      const plan = makeCleanPlan();
      plan.automation.automations = [
        {
          trigger: "Random event with no stage link",
          steps: ["Do something unrelated"],
          data_required: ["patient_name"],
          error_handling: "Retry",
        },
      ];
      const warnings = validatePlanConsistency(plan);
      const automationWarnings = warnings.filter((w) => w.section === "automation");
      assert.ok(automationWarnings.some((w) => w.message.includes("doesn't reference any defined workflow stage")));
    });

    test("no warning when trigger references a stage name", () => {
      const plan = makeCleanPlan();
      plan.automation.automations = [
        {
          trigger: "When Intake Submission is received",
          steps: ["Process it"],
          data_required: ["patient_name"],
          error_handling: "Retry",
        },
      ];
      const warnings = validatePlanConsistency(plan);
      const triggerWarnings = warnings.filter((w) => w.message.includes("doesn't reference any defined workflow stage"));
      assert.equal(triggerWarnings.length, 0);
    });

    test("no warning when a step references a stage name even if trigger doesn't", () => {
      const plan = makeCleanPlan();
      plan.automation.automations = [
        {
          trigger: "Daily at 9am",
          steps: ["Check Triage Review queue", "Send summary"],
          data_required: ["patient_name"],
          error_handling: "Retry",
        },
      ];
      const warnings = validatePlanConsistency(plan);
      const triggerWarnings = warnings.filter((w) => w.message.includes("doesn't reference any defined workflow stage"));
      assert.equal(triggerWarnings.length, 0);
    });

    test("warns when all data_required fields are unrecognized", () => {
      const plan = makeCleanPlan();
      plan.automation.automations = [
        {
          trigger: "New Intake Submission received",
          steps: ["Process"],
          data_required: ["unknown_field_x", "unknown_field_y"],
          error_handling: "Retry",
        },
      ];
      const warnings = validatePlanConsistency(plan);
      assert.ok(warnings.some((w) => w.message.includes("uses data fields not defined in the workflow")));
    });

    test("no warning when at least one data_required field matches", () => {
      const plan = makeCleanPlan();
      plan.automation.automations = [
        {
          trigger: "New Intake Submission received",
          steps: ["Process"],
          data_required: ["patient_name", "unknown_extra"],
          error_handling: "Retry",
        },
      ];
      const warnings = validatePlanConsistency(plan);
      const dataWarnings = warnings.filter((w) => w.message.includes("uses data fields not defined"));
      assert.equal(dataWarnings.length, 0);
    });
  });

  // -------------------------------------------------------------------------
  // Dashboard → Workflow cross-references
  // -------------------------------------------------------------------------

  describe("dashboard ↔ workflow", () => {
    test("warns when KPI definition doesn't reference workflow terms", () => {
      const plan = makeCleanPlan();
      plan.dashboard.kpis = [
        { name: "Mystery Metric", definition: "Something totally unrelated to any field", why_it_matters: "Who knows" },
        { name: "Another", definition: "Also unrelated", why_it_matters: "Unclear" },
        { name: "Third", definition: "Nope", why_it_matters: "N/A" },
      ];
      const warnings = validatePlanConsistency(plan);
      const kpiWarnings = warnings.filter((w) => w.message.includes("doesn't reference any workflow fields"));
      assert.equal(kpiWarnings.length, 3);
    });

    test("no warning when KPI definition references a timestamp", () => {
      const plan = makeCleanPlan();
      plan.dashboard.kpis = [
        { name: "Speed", definition: "Time from submitted_at to triaged_at", why_it_matters: "Speed" },
        { name: "Volume", definition: "Count of Intake Submission per day", why_it_matters: "Capacity" },
        { name: "Quality", definition: "assigned_provider accuracy", why_it_matters: "Correct" },
      ];
      const warnings = validatePlanConsistency(plan);
      const kpiWarnings = warnings.filter((w) => w.message.includes("doesn't reference any workflow fields"));
      assert.equal(kpiWarnings.length, 0);
    });

    test("warns when view columns don't match required_fields (>50%)", () => {
      const plan = makeCleanPlan();
      plan.dashboard.views = [
        { name: "Bad View", filter: "all", columns: ["foo", "bar", "baz", "qux"] },
      ];
      const warnings = validatePlanConsistency(plan);
      assert.ok(warnings.some((w) => w.message.includes("uses columns not tracked in the workflow")));
    });

    test("no warning when most view columns match required_fields", () => {
      const plan = makeCleanPlan();
      plan.dashboard.views = [
        { name: "Good View", filter: "all", columns: ["patient_name", "priority_level", "assigned_provider", "extra_col"] },
      ];
      const warnings = validatePlanConsistency(plan);
      const viewWarnings = warnings.filter((w) => w.message.includes("uses columns not tracked"));
      assert.equal(viewWarnings.length, 0);
    });

    test("warns at exactly 50% unmatched boundary", () => {
      const plan = makeCleanPlan();
      // 2 matched, 2 unmatched = 50% unmatched — should NOT warn (>50% required)
      plan.dashboard.views = [
        { name: "Borderline", filter: "all", columns: ["patient_name", "priority_level", "foo", "bar"] },
      ];
      const warnings = validatePlanConsistency(plan);
      const viewWarnings = warnings.filter((w) => w.message.includes("uses columns not tracked"));
      assert.equal(viewWarnings.length, 0);
    });

    test("warns when more than half are unmatched", () => {
      const plan = makeCleanPlan();
      // 1 matched, 2 unmatched — 2 > 3/2 = 1.5, so warns
      plan.dashboard.views = [
        { name: "Mostly Bad", filter: "all", columns: ["patient_name", "unknown_a", "unknown_b"] },
      ];
      const warnings = validatePlanConsistency(plan);
      const viewWarnings = warnings.filter((w) => w.message.includes("uses columns not tracked"));
      assert.equal(viewWarnings.length, 1);
    });
  });

  // -------------------------------------------------------------------------
  // Ops Pulse coherence
  // -------------------------------------------------------------------------

  describe("ops pulse coherence", () => {
    test("warns when no actions address failure modes (>=3 failure modes)", () => {
      const plan = makeCleanPlan();
      plan.ops_pulse.actions = [
        { priority: "high", owner_role: "Ops", action: "Do something completely irrelevant" },
      ];
      const warnings = validatePlanConsistency(plan);
      assert.ok(warnings.some((w) => w.message.includes("don't address the") || w.message.includes("directly address")));
    });

    test("no failure mode warning when actions reference failure modes", () => {
      const plan = makeCleanPlan();
      // Actions already reference failure modes in makeCleanPlan
      const warnings = validatePlanConsistency(plan);
      const fmWarnings = warnings.filter((w) => w.message.includes("directly address"));
      assert.equal(fmWarnings.length, 0);
    });

    test("no failure mode warning when fewer than 3 failure modes", () => {
      const plan = makeCleanPlan();
      plan.workflow.failure_modes = ["Only one failure mode"];
      plan.ops_pulse.actions = [
        { priority: "high", owner_role: "Ops", action: "Totally unrelated action" },
      ];
      const warnings = validatePlanConsistency(plan);
      const fmWarnings = warnings.filter((w) => w.message.includes("directly address"));
      assert.equal(fmWarnings.length, 0);
    });

    test("no failure mode warning when failure_modes is empty", () => {
      const plan = makeCleanPlan();
      plan.workflow.failure_modes = [];
      const warnings = validatePlanConsistency(plan);
      const fmWarnings = warnings.filter((w) => w.message.includes("directly address"));
      assert.equal(fmWarnings.length, 0);
    });

    test("warns when scorecard doesn't reference enough KPIs", () => {
      const plan = makeCleanPlan();
      plan.ops_pulse.scorecard = ["Something unrelated to any KPI"];
      const warnings = validatePlanConsistency(plan);
      assert.ok(warnings.some((w) => w.message.includes("Scorecard only references")));
    });

    test("no scorecard warning when scorecard references >=2 KPIs", () => {
      const plan = makeCleanPlan();
      // Clean plan scorecard already references all 4 KPIs
      const warnings = validatePlanConsistency(plan);
      const scWarnings = warnings.filter((w) => w.message.includes("Scorecard only references"));
      assert.equal(scWarnings.length, 0);
    });

    test("no scorecard warning when only 1 KPI exists and scorecard references it", () => {
      const plan = makeCleanPlan();
      plan.dashboard.kpis = [
        { name: "Speed", definition: "Average time from submitted_at to triaged_at", why_it_matters: "Fast" },
      ];
      plan.ops_pulse.scorecard = ["Speed is trending well"];
      const warnings = validatePlanConsistency(plan);
      const scWarnings = warnings.filter((w) => w.message.includes("Scorecard only references"));
      assert.equal(scWarnings.length, 0);
    });
  });

  // -------------------------------------------------------------------------
  // Coverage checks
  // -------------------------------------------------------------------------

  describe("coverage checks", () => {
    test("warns when fewer than 4 workflow stages", () => {
      const plan = makeCleanPlan();
      plan.workflow.stages = plan.workflow.stages.slice(0, 3);
      const warnings = validatePlanConsistency(plan);
      assert.ok(warnings.some((w) => w.section === "workflow" && w.message.includes("Only 3 workflow stages")));
    });

    test("no stage warning with 4+ stages", () => {
      const plan = makeCleanPlan();
      const warnings = validatePlanConsistency(plan);
      const stageWarnings = warnings.filter((w) => w.section === "workflow" && w.message.includes("workflow stages"));
      assert.equal(stageWarnings.length, 0);
    });

    test("warns when zero alerts defined", () => {
      const plan = makeCleanPlan();
      plan.automation.alerts = [];
      const warnings = validatePlanConsistency(plan);
      assert.ok(warnings.some((w) => w.section === "automation" && w.message.includes("No alerts defined")));
    });

    test("warns when fewer than 3 KPIs", () => {
      const plan = makeCleanPlan();
      plan.dashboard.kpis = [
        { name: "Speed", definition: "submitted_at to triaged_at", why_it_matters: "Fast" },
        { name: "Volume", definition: "Count of Intake Submission", why_it_matters: "Capacity" },
      ];
      const warnings = validatePlanConsistency(plan);
      assert.ok(warnings.some((w) => w.section === "dashboard" && w.message.includes("Only 2 KPIs")));
    });

    test("warns when no high-priority actions", () => {
      const plan = makeCleanPlan();
      plan.ops_pulse.actions = [
        { priority: "medium", owner_role: "Ops", action: "Review queue" },
        { priority: "low", owner_role: "IT", action: "Update docs" },
      ];
      const warnings = validatePlanConsistency(plan);
      assert.ok(warnings.some((w) => w.section === "ops_pulse" && w.message.includes("No high-priority actions")));
    });

    test("no high-priority warning when at least one exists", () => {
      const plan = makeCleanPlan();
      const warnings = validatePlanConsistency(plan);
      const hpWarnings = warnings.filter((w) => w.message.includes("No high-priority actions"));
      assert.equal(hpWarnings.length, 0);
    });
  });

  // -------------------------------------------------------------------------
  // Fuzzy matching behavior
  // -------------------------------------------------------------------------

  describe("fuzzy matching", () => {
    test("matches case-insensitively", () => {
      const plan = makeCleanPlan();
      plan.automation.automations = [
        {
          trigger: "When INTAKE SUBMISSION arrives",
          steps: ["Process"],
          data_required: ["PATIENT_NAME"],
          error_handling: "Retry",
        },
      ];
      const warnings = validatePlanConsistency(plan);
      const triggerWarnings = warnings.filter((w) => w.message.includes("doesn't reference any defined workflow stage"));
      assert.equal(triggerWarnings.length, 0);
    });

    test("matches ignoring punctuation around words", () => {
      const plan = makeCleanPlan();
      plan.automation.automations = [
        {
          trigger: "When 'Intake Submission' is received!",
          steps: ["Process"],
          data_required: ["patient_name"],
          error_handling: "Retry",
        },
      ];
      const warnings = validatePlanConsistency(plan);
      const triggerWarnings = warnings.filter((w) => w.message.includes("doesn't reference any defined workflow stage"));
      assert.equal(triggerWarnings.length, 0);
    });

    test("hyphen-joined words don't match space-separated (normalize strips punctuation)", () => {
      const plan = makeCleanPlan();
      // "intake-submission" normalizes to "intakesubmission", won't match "intake submission"
      plan.automation.automations = [
        {
          trigger: "intake-submission received",
          steps: ["Process"],
          data_required: ["patient_name"],
          error_handling: "Retry",
        },
      ];
      const warnings = validatePlanConsistency(plan);
      const triggerWarnings = warnings.filter((w) => w.message.includes("doesn't reference any defined workflow stage"));
      assert.equal(triggerWarnings.length, 1);
    });
  });

  // -------------------------------------------------------------------------
  // Multiple warnings accumulate
  // -------------------------------------------------------------------------

  test("accumulates warnings from all validators", () => {
    const plan = makeCleanPlan();
    // Trigger coverage warnings
    plan.workflow.stages = plan.workflow.stages.slice(0, 2); // <4 stages
    plan.automation.alerts = []; // 0 alerts
    plan.dashboard.kpis = [{ name: "One", definition: "Unrelated thing", why_it_matters: "?" }]; // <3 KPIs + unrelated
    plan.ops_pulse.actions = [{ priority: "low", owner_role: "Ops", action: "Nothing relevant" }]; // no high-priority

    const warnings = validatePlanConsistency(plan);
    const sections = new Set(warnings.map((w) => w.section));
    // Should have warnings from workflow, automation, dashboard, and ops_pulse
    assert.ok(sections.has("workflow"));
    assert.ok(sections.has("automation"));
    assert.ok(sections.has("dashboard"));
    assert.ok(sections.has("ops_pulse"));
    assert.ok(warnings.length >= 4);
  });
});
