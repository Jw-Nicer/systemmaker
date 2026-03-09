import { test, describe } from "vitest";
import assert from "node:assert/strict";
import {
  buildAuditBottleneckSummary,
  buildAuditLeadSummary,
  buildAuditAgentInput,
} from "@/lib/guided-audit";
import type { GuidedAuditResponses } from "@/types/audit";

function makeAuditInput(
  overrides: Partial<GuidedAuditResponses> = {}
): GuidedAuditResponses {
  return {
    industry: "healthcare",
    workflow_type: "Lead intake",
    bottleneck: "manual data entry",
    current_tools: ["Google Sheets", "Gmail"],
    team_size: "4-10",
    stack_maturity: "Mostly manual",
    manual_steps: "copying data between systems",
    handoff_breaks: "emails get lost between departments",
    visibility_gap: "no one knows request status",
    desired_outcome: "auto-route requests to the right team",
    ...overrides,
  };
}

describe("buildAuditBottleneckSummary", () => {
  test("includes all 6 required fields", () => {
    const result = buildAuditBottleneckSummary(makeAuditInput());
    assert.ok(result.includes("Primary workflow: Lead intake."));
    assert.ok(result.includes("Core bottleneck: manual data entry."));
    assert.ok(result.includes("Manual steps: copying data between systems."));
    assert.ok(
      result.includes("Broken handoffs: emails get lost between departments.")
    );
    assert.ok(
      result.includes("Visibility gap: no one knows request status.")
    );
    assert.ok(
      result.includes("Desired outcome: auto-route requests to the right team.")
    );
  });

  test("includes time_lost_per_week when provided", () => {
    const result = buildAuditBottleneckSummary(
      makeAuditInput({ time_lost_per_week: "10 hours" })
    );
    assert.ok(result.includes("Estimated time lost: 10 hours per week."));
  });

  test("excludes time_lost_per_week when absent", () => {
    const result = buildAuditBottleneckSummary(makeAuditInput());
    assert.ok(!result.includes("Estimated time lost"));
  });

  test("includes compliance_notes when provided", () => {
    const result = buildAuditBottleneckSummary(
      makeAuditInput({ compliance_notes: "HIPAA requirements" })
    );
    assert.ok(
      result.includes("Risk or accuracy concerns: HIPAA requirements.")
    );
  });

  test("excludes compliance_notes when absent", () => {
    const result = buildAuditBottleneckSummary(makeAuditInput());
    assert.ok(!result.includes("Risk or accuracy concerns"));
  });

  test("includes both optional fields when both provided", () => {
    const result = buildAuditBottleneckSummary(
      makeAuditInput({
        time_lost_per_week: "5 hours",
        compliance_notes: "SOC2",
      })
    );
    assert.ok(result.includes("Estimated time lost: 5 hours per week."));
    assert.ok(result.includes("Risk or accuracy concerns: SOC2."));
  });
});

describe("buildAuditLeadSummary", () => {
  test("produces pipe-delimited summary with required fields", () => {
    const result = buildAuditLeadSummary(makeAuditInput());
    assert.ok(result.includes("Lead intake workflow in healthcare"));
    assert.ok(result.includes("Team size: 4-10"));
    assert.ok(result.includes("Stack maturity: Mostly manual"));
    assert.ok(result.includes("Tools: Google Sheets, Gmail"));
  });

  test("includes volume when provided", () => {
    const result = buildAuditLeadSummary(
      makeAuditInput({ volume: "200 requests/week" })
    );
    assert.ok(result.includes("Volume: 200 requests/week"));
  });

  test("excludes volume when absent", () => {
    const result = buildAuditLeadSummary(makeAuditInput());
    assert.ok(!result.includes("Volume:"));
  });

  test("includes urgency when provided", () => {
    const result = buildAuditLeadSummary(
      makeAuditInput({ urgency: "high" })
    );
    assert.ok(result.includes("Urgency: high"));
  });

  test("excludes urgency when absent", () => {
    const result = buildAuditLeadSummary(makeAuditInput());
    assert.ok(!result.includes("Urgency:"));
  });

  test("handles empty current_tools array", () => {
    const result = buildAuditLeadSummary(
      makeAuditInput({ current_tools: [] })
    );
    assert.ok(result.includes("Tools: "));
  });
});

describe("buildAuditAgentInput", () => {
  test("maps industry from input", () => {
    const result = buildAuditAgentInput(makeAuditInput());
    assert.equal(result.industry, "healthcare");
  });

  test("joins current_tools with comma separator", () => {
    const result = buildAuditAgentInput(makeAuditInput());
    assert.equal(result.current_tools, "Google Sheets, Gmail");
  });

  test("uses bottleneck summary as bottleneck field", () => {
    const input = makeAuditInput();
    const result = buildAuditAgentInput(input);
    assert.equal(result.bottleneck, buildAuditBottleneckSummary(input));
  });

  test("passes through urgency and volume", () => {
    const result = buildAuditAgentInput(
      makeAuditInput({ urgency: "high", volume: "500/day" })
    );
    assert.equal(result.urgency, "high");
    assert.equal(result.volume, "500/day");
  });

  test("urgency and volume are undefined when not provided", () => {
    const result = buildAuditAgentInput(makeAuditInput());
    assert.equal(result.urgency, undefined);
    assert.equal(result.volume, undefined);
  });

  test("handles single tool", () => {
    const result = buildAuditAgentInput(
      makeAuditInput({ current_tools: ["Airtable"] })
    );
    assert.equal(result.current_tools, "Airtable");
  });

  test("handles empty tools array", () => {
    const result = buildAuditAgentInput(
      makeAuditInput({ current_tools: [] })
    );
    assert.equal(result.current_tools, "");
  });
});
