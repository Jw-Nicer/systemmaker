import type { ExperimentAssignment } from "@/types/experiment";
import type { GuidedAuditResponses } from "@/types/audit";

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  bottleneck: string;
  tools: string;
  urgency: string;
  status: string;
  source: string;
  score?: number;
  nurture_enrolled?: boolean;
  preview_plan_sent_at?: string;
  plan_id?: string;
  follow_up_at?: string;
  follow_up_note?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  landing_path?: string;
  experiment_assignments?: ExperimentAssignment[];
  audit_summary?: string;
  audit_responses?: GuidedAuditResponses;
  created_at: string;
}

export interface LeadExportFilters {
  status?: string;
  search?: string;
  sortBy?: "date" | "score";
}
