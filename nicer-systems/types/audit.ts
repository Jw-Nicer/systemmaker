export const AUDIT_INDUSTRIES = [
  "Property Management",
  "E-commerce",
  "Professional Services",
  "Healthcare",
  "Construction/Field Services",
  "Other",
] as const;

export const AUDIT_WORKFLOW_TYPES = [
  "Intake & Onboarding",
  "Scheduling & Dispatch",
  "Billing & Invoicing",
  "Reporting & Compliance",
  "Maintenance & Renewals",
  "Customer Support",
  "Inventory & Procurement",
] as const;

export const AUDIT_TEAM_SIZES = [
  "1-5",
  "6-15",
  "16-50",
  "50+",
] as const;

export const AUDIT_STACK_MATURITY = [
  "Spreadsheets only",
  "Some tools no integration",
  "Multiple tools partially connected",
  "Established stack needs optimization",
] as const;

export const AUDIT_TIME_LOST = [
  "<2 hours",
  "2-5 hours",
  "5-10 hours",
  "10+ hours",
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
