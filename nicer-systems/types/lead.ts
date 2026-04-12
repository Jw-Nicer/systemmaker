import type { ExperimentAssignment } from "@/types/experiment";
import type { GuidedAuditResponses } from "@/types/audit";

/**
 * Lead pipeline statuses, in the rough order a lead moves through them.
 *
 * Meaning:
 *  - new          — just created, no contact yet
 *  - qualified    — triaged, worth pursuing
 *  - nurture      — parked in the automated nurture sequence
 *  - later        — visitor explicitly asked for a deferred follow-up
 *                   (as distinct from `nurture`, which is the automated
 *                   cadence) — surfaced in the follow-up dashboard widget
 *  - booked       — scoping call on the calendar
 *  - closed       — contract signed or project complete
 *  - unqualified  — not a fit (wrong industry, too small, etc.)
 *  - lost         — walked away / ghosted / went with someone else
 */
export const LEAD_STATUSES = [
  "new",
  "qualified",
  "nurture",
  "later",
  "booked",
  "closed",
  "unqualified",
  "lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

/**
 * Human-readable label for a lead status. Prefer this over ad-hoc
 * `.charAt(0).toUpperCase()` so renames stay centralized.
 */
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  qualified: "Qualified",
  nurture: "Nurture",
  later: "Later",
  booked: "Booked",
  closed: "Closed",
  unqualified: "Unqualified",
  lost: "Lost",
};

/**
 * Tailwind class set for each lead status pill. Used by the admin leads
 * dashboard + detail view. Centralizing it here means admin components
 * don't each maintain their own partial copy (and silently fall back
 * to a neutral style for statuses they forgot to add).
 */
export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  new: "border-sky-300 bg-sky-50 text-sky-700",
  qualified: "border-emerald-300 bg-emerald-50 text-emerald-700",
  nurture: "border-purple-300 bg-purple-50 text-purple-700",
  later: "border-amber-300 bg-amber-50 text-amber-700",
  booked: "border-green-400 bg-green-50 text-green-800",
  closed: "border-slate-300 bg-slate-100 text-slate-600",
  unqualified: "border-red-300 bg-red-50 text-red-700",
  lost: "border-gray-300 bg-gray-100 text-gray-500",
};

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  bottleneck: string;
  tools: string;
  urgency: string;
  status: LeadStatus;
  source: string;
  score?: number;
  nurture_enrolled?: boolean;
  nurture_unsubscribed?: boolean;
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
