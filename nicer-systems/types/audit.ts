export const AUDIT_WORKFLOW_TYPES = [
  "Lead intake",
  "Scheduling",
  "Dispatch",
  "Approvals",
  "Reporting",
  "Customer updates",
  "Billing",
  "Document handling",
  "Other",
] as const;

export const AUDIT_TEAM_SIZES = [
  "1-3",
  "4-10",
  "11-25",
  "26-50",
  "51+",
] as const;

export const AUDIT_STACK_MATURITY = [
  "Mostly manual",
  "Some automation",
  "Several connected tools",
  "Already systemized",
] as const;

export interface GuidedAuditResponses {
  industry: string;
  workflow_type: string;
  bottleneck: string;
  current_tools: string[];
  urgency?: "low" | "medium" | "high" | "urgent";
  volume?: string;
  team_size: string;
  stack_maturity: string;
  manual_steps: string;
  handoff_breaks: string;
  visibility_gap: string;
  desired_outcome: string;
  time_lost_per_week?: string;
  compliance_notes?: string;
  landing_path?: string;
}
