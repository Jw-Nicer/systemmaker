import { test, describe } from "vitest";
import assert from "node:assert/strict";
import { scorePlanQuality } from "@/lib/agents/plan-quality";
import type { PreviewPlan } from "@/types/preview-plan";

function makeFullPlan(): PreviewPlan {
  return {
    intake: {
      clarified_problem: "Property management firms lose 30% of lease renewals due to manual follow-up processes",
      assumptions: ["Team of 5-10 property managers", "Using Buildium for basic tracking"],
      constraints: ["Must integrate with existing Buildium instance", "Budget under $5k/month"],
      suggested_scope: "Automate lease renewal reminders, follow-up sequences, and tenant communication tracking with KPI dashboard",
    },
    workflow: {
      stages: [
        { name: "Lease Expiry Detection", owner_role: "System", entry_criteria: "90 days before expiry", exit_criteria: "Renewal notice sent" },
        { name: "Tenant Outreach", owner_role: "Property Manager", entry_criteria: "Notice sent", exit_criteria: "Response received" },
        { name: "Negotiation", owner_role: "Property Manager", entry_criteria: "Response received", exit_criteria: "Terms agreed" },
        { name: "Lease Signing", owner_role: "Admin", entry_criteria: "Terms agreed", exit_criteria: "Signed lease filed" },
      ],
      required_fields: ["tenant_id", "lease_end_date", "property_id", "monthly_rent"],
      timestamps: ["created_at", "noticed_at", "responded_at", "signed_at"],
      failure_modes: ["Tenant unreachable", "Negotiation stalls > 14 days", "Missing contact info"],
    },
    automation: {
      automations: [
        {
          trigger: "Lease expiry in 90 days",
          steps: ["Send email reminder", "Create follow-up task", "Escalate if no response in 7 days"],
          data_required: ["tenant_email", "lease_end_date"],
          error_handling: "Retry 3 times, then escalate to manager",
        },
      ],
      alerts: [
        { when: "Renewal overdue > 30 days", who: "Regional Manager", message: "Lease renewal stalled", escalation: "Auto-escalate to VP after 7 days" },
      ],
      logging_plan: [
        { what_to_log: "All outreach attempts", where: "CRM activity log", how_to_review: "Weekly ops pulse report" },
      ],
    },
    dashboard: {
      dashboards: [{ name: "Renewal Pipeline", purpose: "Track lease renewal progress", widgets: ["Funnel chart", "Overdue list"] }],
      kpis: [
        { name: "Renewal Rate", definition: "Percentage of expiring leases renewed within 30 days of expiry", why_it_matters: "Direct revenue impact" },
        { name: "Average Response Time", definition: "Days between initial outreach and tenant response", why_it_matters: "Indicates engagement effectiveness" },
      ],
      views: [{ name: "Overdue Renewals", filter: "days_overdue > 0", columns: ["tenant", "property", "days_overdue", "last_contact"] }],
    },
    ops_pulse: {
      executive_summary: {
        problem: "Manual lease renewal tracking causes 30% revenue leakage",
        solution: "Automated 4-stage renewal pipeline with escalation alerts",
        impact: "Expected 15% improvement in renewal rate within 60 days",
        next_step: "Deploy automation triggers in Buildium + Zapier",
      },
      sections: [{ title: "Current State", bullets: ["Manual spreadsheet tracking", "No escalation process"] }],
      scorecard: ["Renewal rate: baseline 68%", "Target: 83% within 90 days"],
      actions: [
        { priority: "high", owner_role: "Ops Lead", action: "Configure Zapier triggers for lease expiry detection" },
        { priority: "high", owner_role: "Admin", action: "Set up escalation rules in Buildium" },
        { priority: "medium", owner_role: "IT", action: "Create KPI dashboard in Google Sheets" },
      ],
      questions: ["What CRM fields are currently populated?"],
    },
    roadmap: {
      phases: [
        {
          week: 1,
          title: "Foundation",
          tasks: [
            { task: "Audit current Buildium data quality", effort: "small", owner_role: "Admin" },
            { task: "Configure Zapier account", effort: "small", owner_role: "IT" },
          ],
          dependencies: [],
          risks: ["Buildium API access may need admin approval"],
          quick_wins: ["Set up basic email reminder for next 5 expiring leases"],
        },
        {
          week: 3,
          title: "Automation",
          tasks: [
            { task: "Build renewal pipeline in Zapier", effort: "medium", owner_role: "IT" },
          ],
          dependencies: ["Foundation complete"],
          risks: [],
          quick_wins: [],
        },
      ],
      critical_path: "Foundation → Automation → Dashboard → Go-live",
      total_estimated_weeks: 4,
    },
  };
}

function makeEmptyPlan(): PreviewPlan {
  return {
    intake: { clarified_problem: "", assumptions: [], constraints: [], suggested_scope: "" },
    workflow: { stages: [], required_fields: [], timestamps: [], failure_modes: [] },
    automation: { automations: [], alerts: [], logging_plan: [] },
    dashboard: { dashboards: [], kpis: [], views: [] },
    ops_pulse: {
      executive_summary: { problem: "", solution: "", impact: "", next_step: "" },
      sections: [],
      scorecard: [],
      actions: [],
      questions: [],
    },
  };
}

describe("scorePlanQuality", () => {
  test("full realistic plan scores high (>= 70)", () => {
    const { score, breakdown } = scorePlanQuality(makeFullPlan());
    assert.ok(score >= 70, `Expected >= 70, got ${score}`);
    assert.ok(breakdown.completeness > 0);
    assert.ok(breakdown.specificity > 0);
    assert.ok(breakdown.actionability > 0);
  });

  test("empty fallback plan scores near 0", () => {
    const { score } = scorePlanQuality(makeEmptyPlan());
    assert.ok(score <= 5, `Expected <= 5, got ${score}`);
  });

  test("score is between 0 and 100", () => {
    const { score: full } = scorePlanQuality(makeFullPlan());
    const { score: empty } = scorePlanQuality(makeEmptyPlan());
    assert.ok(full >= 0 && full <= 100);
    assert.ok(empty >= 0 && empty <= 100);
  });

  test("plan without roadmap scores lower than with roadmap", () => {
    const withRoadmap = makeFullPlan();
    const withoutRoadmap = { ...makeFullPlan(), roadmap: undefined };
    const a = scorePlanQuality(withRoadmap).score;
    const b = scorePlanQuality(withoutRoadmap).score;
    assert.ok(a > b, `With roadmap (${a}) should be > without (${b})`);
  });

  test("completeness dimension: each section contributes", () => {
    const full = scorePlanQuality(makeFullPlan()).breakdown.completeness;
    const empty = scorePlanQuality(makeEmptyPlan()).breakdown.completeness;
    assert.ok(full > empty);
  });

  test("specificity dimension: detailed stages score higher", () => {
    const detailed = makeFullPlan();
    const vague = makeFullPlan();
    vague.workflow.stages = [{ name: "A", owner_role: "B", entry_criteria: "", exit_criteria: "" }];
    vague.workflow.failure_modes = [];
    const a = scorePlanQuality(detailed).breakdown.specificity;
    const b = scorePlanQuality(vague).breakdown.specificity;
    assert.ok(a > b, `Detailed (${a}) should be > vague (${b})`);
  });

  test("actionability dimension: high-priority actions and roadmap boost score", () => {
    const actionable = makeFullPlan();
    const passive = makeFullPlan();
    passive.ops_pulse.actions = [];
    passive.roadmap = undefined;
    const a = scorePlanQuality(actionable).breakdown.actionability;
    const b = scorePlanQuality(passive).breakdown.actionability;
    assert.ok(a > b, `Actionable (${a}) should be > passive (${b})`);
  });

  test("partially degraded plan scores in the middle range", () => {
    const partial = makeFullPlan();
    partial.automation = { automations: [], alerts: [], logging_plan: [] };
    partial.dashboard = { dashboards: [], kpis: [], views: [] };
    const { score } = scorePlanQuality(partial);
    assert.ok(score > 20 && score < 80, `Expected 20-80, got ${score}`);
  });

  test("breakdown dimensions sum to the total score", () => {
    const { score, breakdown } = scorePlanQuality(makeFullPlan());
    const sum = Math.round(breakdown.completeness + breakdown.specificity + breakdown.actionability);
    assert.equal(score, sum);
  });

  test("returns integer score", () => {
    const { score } = scorePlanQuality(makeFullPlan());
    assert.equal(score, Math.round(score));
  });
});
