import type { GuidedAuditResponses } from "@/types/audit";

export function buildAuditBottleneckSummary(input: GuidedAuditResponses): string {
  const parts = [
    `Primary workflow: ${input.workflow_type}.`,
    `Core bottleneck: ${input.bottleneck}.`,
    `Manual steps: ${input.manual_steps}.`,
    `Broken handoffs: ${input.handoff_breaks}.`,
    `Visibility gap: ${input.visibility_gap}.`,
    `Desired outcome: ${input.desired_outcome}.`,
  ];

  if (input.time_lost_per_week) {
    parts.push(`Estimated time lost: ${input.time_lost_per_week} per week.`);
  }

  if (input.compliance_notes) {
    parts.push(`Risk or accuracy concerns: ${input.compliance_notes}.`);
  }

  return parts.join(" ");
}

export function buildAuditLeadSummary(input: GuidedAuditResponses): string {
  const detailLines = [
    `${input.workflow_type} workflow in ${input.industry}`,
    `Team size: ${input.team_size}`,
    `Stack maturity: ${input.stack_maturity}`,
    `Tools: ${input.current_tools.join(", ")}`,
  ];

  if (input.volume) {
    detailLines.push(`Volume: ${input.volume}`);
  }

  if (input.urgency) {
    detailLines.push(`Urgency: ${input.urgency}`);
  }

  return detailLines.join(" | ");
}

export function buildAuditAgentInput(input: GuidedAuditResponses) {
  return {
    industry: input.industry,
    bottleneck: buildAuditBottleneckSummary(input),
    current_tools: input.current_tools.join(", "),
    urgency: input.urgency,
    volume: input.volume,
  };
}
