import { test, describe } from "vitest";
import assert from "node:assert/strict";

import {
  detectContradiction,
  buildDetailedPlanContext,
  buildConversationSummary,
} from "@/lib/agents/conversation";
import type { ExtractedIntake, ChatMessage } from "@/types/chat";

// ---------------------------------------------------------------------------
// Fixture — same shape as tests/agent-runner.test.ts
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

// ---------------------------------------------------------------------------
// Helper: create a ChatMessage
// ---------------------------------------------------------------------------

function msg(role: "user" | "assistant", content: string): ChatMessage {
  return { id: `msg-${Math.random().toString(36).slice(2, 8)}`, role, content, timestamp: Date.now() };
}

// ---------------------------------------------------------------------------
// detectContradiction
// ---------------------------------------------------------------------------

describe("detectContradiction", () => {
  test("catches industry change", () => {
    const extracted: ExtractedIntake = { industry: "healthcare" };
    const result = detectContradiction("I run a construction company", extracted);
    assert.ok(result, "should return a contradiction string");
    assert.ok(result!.includes("Industry changed"), `expected 'Industry changed' in: ${result}`);
  });

  test("returns null for same industry", () => {
    const extracted: ExtractedIntake = { industry: "construction" };
    const result = detectContradiction("We're in construction", extracted);
    assert.equal(result, null);
  });

  test("catches tools correction with contrast signal", () => {
    const extracted: ExtractedIntake = { current_tools: "Sheets" };
    const result = detectContradiction("Actually we use HubSpot instead", extracted);
    assert.ok(result, "should return a contradiction string");
    assert.ok(result!.includes("Tools corrected"), `expected 'Tools corrected' in: ${result}`);
  });

  test("returns null when no contrast signal", () => {
    const extracted: ExtractedIntake = { current_tools: "Sheets" };
    const result = detectContradiction("We also use HubSpot", extracted);
    assert.equal(result, null);
  });

  test("catches bottleneck revision", () => {
    const extracted: ExtractedIntake = { bottleneck: "scheduling issues" };
    const result = detectContradiction("no wait, the real problem is invoicing", extracted);
    assert.ok(result, "should return a contradiction string");
    assert.ok(result!.includes("Bottleneck updated"), `expected 'Bottleneck updated' in: ${result}`);
  });
});

// ---------------------------------------------------------------------------
// buildDetailedPlanContext
// ---------------------------------------------------------------------------

describe("buildDetailedPlanContext", () => {
  test("includes all section headers", () => {
    const output = buildDetailedPlanContext(fixture);
    assert.ok(output.includes("### Scope"), "missing '### Scope'");
    assert.ok(output.includes("### Workflow Map"), "missing '### Workflow Map'");
    assert.ok(output.includes("### Automations"), "missing '### Automations'");
    assert.ok(output.includes("### Dashboard"), "missing '### Dashboard'");
    assert.ok(output.includes("### Ops Pulse"), "missing '### Ops Pulse'");
    assert.ok(output.includes("### Implementation Roadmap"), "missing '### Implementation Roadmap'");
  });

  test("handles missing roadmap without error", () => {
    const planWithoutRoadmap = { ...fixture, roadmap: undefined };
    const output = buildDetailedPlanContext(planWithoutRoadmap);
    assert.ok(!output.includes("### Implementation Roadmap"), "should not include roadmap header");
    // Should still have other sections
    assert.ok(output.includes("### Scope"), "missing '### Scope' even without roadmap");
  });

  test("includes specific details from fixture", () => {
    const output = buildDetailedPlanContext(fixture);
    // Stage names from workflow
    assert.ok(output.includes("Request Submission"), "missing stage name 'Request Submission'");
    assert.ok(output.includes("Validation Review"), "missing stage name 'Validation Review'");
    // KPI definitions from dashboard
    assert.ok(output.includes("Cycle Time"), "missing KPI 'Cycle Time'");
    assert.ok(output.includes("First Pass Yield"), "missing KPI 'First Pass Yield'");
    // Automation trigger
    assert.ok(output.includes("New request submitted via intake form"), "missing automation trigger");
  });
});

// ---------------------------------------------------------------------------
// buildConversationSummary
// ---------------------------------------------------------------------------

describe("buildConversationSummary", () => {
  test("includes confirmed facts", () => {
    const extracted: ExtractedIntake = {
      industry: "healthcare",
      bottleneck: "manual intake",
    };
    const history = [msg("user", "hello"), msg("assistant", "hi")];
    const output = buildConversationSummary(extracted, history);
    assert.ok(output.includes("Confirmed facts"), "missing 'Confirmed facts'");
    assert.ok(output.includes("healthcare"), "missing 'healthcare'");
  });

  test("includes corrections", () => {
    const extracted: ExtractedIntake = { industry: "construction" };
    const corrections = ["Industry changed from X to Y"];
    const history = [msg("user", "hello"), msg("assistant", "hi")];
    const output = buildConversationSummary(extracted, history, corrections);
    assert.ok(output.includes("Corrections made"), "missing 'Corrections made'");
    assert.ok(output.includes("Industry changed from X to Y"), "missing correction text");
  });

  test("returns empty string for empty data", () => {
    const extracted: ExtractedIntake = {};
    // Short history (< 20 messages), no corrections
    const history = [msg("user", "hi"), msg("assistant", "hello")];
    const output = buildConversationSummary(extracted, history);
    assert.equal(output, "");
  });
});
