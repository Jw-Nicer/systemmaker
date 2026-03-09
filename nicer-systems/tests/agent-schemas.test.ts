import { test } from "vitest";
import assert from "node:assert/strict";

import {
  intakeOutputSchema,
  workflowMapperOutputSchema,
  automationDesignerOutputSchema,
  dashboardDesignerOutputSchema,
  opsPulseOutputSchema,
  templateOutputSchemas,
} from "../lib/agents/schemas";

test("intakeOutputSchema accepts valid output", () => {
  const valid = {
    clarified_problem: "Slow tenant onboarding",
    assumptions: ["Manual process", "No CRM"],
    constraints: ["Budget under $5k"],
    suggested_scope: "Automate intake → approval → move-in",
  };
  const result = intakeOutputSchema.safeParse(valid);
  assert.ok(result.success);
});

test("intakeOutputSchema rejects missing required fields", () => {
  const invalid = {
    clarified_problem: "Slow process",
    // missing assumptions, constraints, suggested_scope
  };
  const result = intakeOutputSchema.safeParse(invalid);
  assert.equal(result.success, false);
});

test("workflowMapperOutputSchema accepts valid output", () => {
  const valid = {
    stages: [
      {
        name: "Intake",
        owner_role: "Front desk",
        entry_criteria: "New tenant application received",
        exit_criteria: "Application verified",
      },
    ],
    required_fields: ["name", "email"],
    timestamps: ["application_date"],
    failure_modes: ["Missing documents"],
  };
  const result = workflowMapperOutputSchema.safeParse(valid);
  assert.ok(result.success);
});

test("automationDesignerOutputSchema accepts valid output", () => {
  const valid = {
    automations: [
      {
        trigger: "New application submitted",
        steps: ["Validate fields", "Send confirmation"],
        data_required: ["email", "phone"],
        error_handling: "Retry 3 times then alert admin",
      },
    ],
    alerts: [
      {
        when: "Application pending > 48h",
        who: "Property manager",
        message: "Application stuck",
        escalation: "Notify regional manager",
      },
    ],
    logging_plan: [
      {
        what_to_log: "Application status changes",
        where: "Firestore events collection",
        how_to_review: "Admin dashboard timeline",
      },
    ],
  };
  const result = automationDesignerOutputSchema.safeParse(valid);
  assert.ok(result.success);
});

test("dashboardDesignerOutputSchema accepts valid output", () => {
  const valid = {
    dashboards: [
      {
        name: "Operations Overview",
        purpose: "Track key metrics",
        widgets: ["Pending count", "Avg processing time"],
      },
    ],
    kpis: [
      {
        name: "Time to approval",
        definition: "Days from application to approval",
        why_it_matters: "Reduces vacancy loss",
      },
    ],
    views: [
      {
        name: "Pending applications",
        filter: "status = pending",
        columns: ["name", "date", "status"],
      },
    ],
  };
  const result = dashboardDesignerOutputSchema.safeParse(valid);
  assert.ok(result.success);
});

test("opsPulseOutputSchema accepts valid output", () => {
  const valid = {
    sections: [
      { title: "This Week", bullets: ["Onboarded 5 tenants", "2 pending"] },
    ],
    scorecard: ["Onboarding: 85%", "Vacancy: 3%"],
    actions: [
      {
        priority: "High",
        owner_role: "Property manager",
        action: "Clear pending backlog",
      },
    ],
    questions: ["Should we add a second reviewer?"],
  };
  const result = opsPulseOutputSchema.safeParse(valid);
  assert.ok(result.success);
});

test("schemas reject arrays exceeding MAX_ARRAY_ITEMS (50)", () => {
  const oversize = {
    clarified_problem: "Test",
    assumptions: Array.from({ length: 51 }, (_, i) => `item ${i}`),
    constraints: [],
    suggested_scope: "Test",
  };
  const result = intakeOutputSchema.safeParse(oversize);
  assert.equal(result.success, false);
});

test("templateOutputSchemas maps all 5 template keys", () => {
  const expected = [
    "intake_agent",
    "workflow_mapper",
    "automation_designer",
    "dashboard_designer",
    "ops_pulse_writer",
  ];
  for (const key of expected) {
    assert.ok(templateOutputSchemas[key], `Missing schema for: ${key}`);
  }
});
