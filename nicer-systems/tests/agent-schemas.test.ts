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
    clarified_problem: "Slow tenant onboarding caused by manual data entry and missing documents.",
    assumptions: ["Manual process using spreadsheets", "No CRM system in place currently"],
    constraints: ["Budget under $5k per month for tooling"],
    suggested_scope: "Automate intake → approval → move-in workflow",
  };
  const result = intakeOutputSchema.safeParse(valid);
  assert.ok(result.success);
});

test("intakeOutputSchema rejects missing required fields", () => {
  const invalid = {
    clarified_problem: "Slow process — needs improvement across the board.",
    // missing assumptions, constraints, suggested_scope
  };
  const result = intakeOutputSchema.safeParse(invalid);
  assert.equal(result.success, false);
});

test("workflowMapperOutputSchema accepts valid output", () => {
  const valid = {
    stages: [
      {
        name: "Receive application",
        owner_role: "Front desk coordinator",
        entry_criteria: "New tenant application received via portal or email",
        exit_criteria: "Application logged with all required documents attached",
      },
      {
        name: "Verify documents",
        owner_role: "Property manager",
        entry_criteria: "Application is logged with documents",
        exit_criteria: "All documents verified and background check initiated",
      },
      {
        name: "Approve or reject",
        owner_role: "Senior property manager",
        entry_criteria: "Background check complete and documents verified",
        exit_criteria: "Decision recorded and tenant notified of outcome",
      },
    ],
    required_fields: ["applicant_name", "email_address", "phone_number"],
    timestamps: ["application_received_at", "documents_verified_at"],
    failure_modes: [
      "Missing documents delay verification by 2-3 days",
      "Background check returns incomplete results requiring manual follow-up",
    ],
  };
  const result = workflowMapperOutputSchema.safeParse(valid);
  assert.ok(result.success);
});

test("automationDesignerOutputSchema accepts valid output", () => {
  const valid = {
    automations: [
      {
        trigger: "New application submitted via tenant portal form",
        steps: ["Validate all required fields are filled", "Send confirmation email to applicant"],
        data_required: ["email_address", "phone_number"],
        error_handling: "Retry 3 times then alert admin via Slack notification",
      },
    ],
    alerts: [
      {
        when: "Application status = pending for more than 48 hours",
        who: "Property manager",
        message: "Application from {applicant_name} has been pending for 48+ hours",
        escalation: "If unresolved after 72 hours, notify regional manager via email",
      },
    ],
    logging_plan: [
      {
        what_to_log: "Application status changes",
        where: "Firestore events collection",
        how_to_review: "Admin dashboard timeline view",
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
        purpose: "Track key operational metrics and identify bottlenecks",
        widgets: ["Number card: Pending applications count", "Bar chart: Applications by status"],
      },
    ],
    kpis: [
      {
        name: "Time to Approval",
        definition: "Formula: AVG(approved_at - application_received_at). Unit: days. Window: rolling 30 days. Target: < 3 days.",
        why_it_matters: "Longer approval times increase vacancy loss and applicant drop-off",
      },
      {
        name: "Document Completion Rate",
        definition: "Formula: COUNT(complete applications) / COUNT(total applications) × 100. Unit: percentage. Window: monthly.",
        why_it_matters: "Incomplete applications cause delays and rework for the team",
      },
      {
        name: "Application Volume",
        definition: "Formula: COUNT(new applications). Unit: count. Window: weekly. Target: tracking trend only.",
        why_it_matters: "Helps with staffing and capacity planning for the review team",
      },
    ],
    views: [
      {
        name: "Pending applications",
        filter: "status = pending",
        columns: ["applicant_name", "application_received_at", "status"],
      },
    ],
  };
  const result = dashboardDesignerOutputSchema.safeParse(valid);
  assert.ok(result.success);
});

test("opsPulseOutputSchema accepts valid output", () => {
  const valid = {
    executive_summary: {
      problem: "Tenant onboarding takes an average of 8 days, causing vacancy loss and applicant drop-off.",
      solution: "Automated intake validation and document tracking with escalation alerts for stalled applications.",
      impact: "Expected to reduce onboarding time from 8 days to under 3 days and eliminate 90% of document chase emails.",
      next_step: "Set up the document checklist template and automated reminder emails for incomplete applications.",
    },
    sections: [
      { title: "This Week's Performance", bullets: ["Onboarded 5 tenants this week", "2 applications still pending review"] },
      { title: "What Needs Attention", bullets: ["Document completion rate dropped to 70%"] },
    ],
    scorecard: ["Onboarding time: 6 days (target: 3)", "Vacancy rate: 3% (target: 2%)"],
    actions: [
      {
        priority: "high",
        owner_role: "Property manager",
        action: "Clear the 2 pending applications by end of day — both have complete documents.",
      },
    ],
    questions: ["Should we add a second reviewer for peak application season?"],
  };
  const result = opsPulseOutputSchema.safeParse(valid);
  assert.ok(result.success);
});

test("schemas reject arrays exceeding max limits", () => {
  const oversize = {
    clarified_problem: "Test problem description that is long enough to pass the minimum length requirement.",
    assumptions: Array.from({ length: 11 }, (_, i) => `Assumption number ${i} with enough detail`),
    constraints: ["Budget constraint that is specific enough"],
    suggested_scope: "Test scope description for automation",
  };
  const result = intakeOutputSchema.safeParse(oversize);
  assert.equal(result.success, false);
});

test("opsPulseOutputSchema rejects invalid priority values", () => {
  const invalid = {
    executive_summary: {
      problem: "Some problem description for testing.",
      solution: "Some solution description for testing.",
      impact: "Some impact statement.",
      next_step: "Some next step action.",
    },
    sections: [
      { title: "Summary section", bullets: ["Point one for the summary"] },
      { title: "Attention items", bullets: ["Something needs attention here"] },
    ],
    scorecard: ["Metric one: value here", "Metric two: value here"],
    actions: [
      {
        priority: "URGENT",
        owner_role: "Property manager",
        action: "This should fail because URGENT is not a valid priority enum.",
      },
    ],
    questions: ["Is this a valid question for the test?"],
  };
  const result = opsPulseOutputSchema.safeParse(invalid);
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
