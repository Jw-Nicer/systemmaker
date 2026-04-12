"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
} from "@/types/lead";
import type { Lead, LeadStatus } from "@/types/lead";
import {
  updateLeadStatus,
  setLeadFollowUp,
  clearLeadFollowUp,
} from "@/lib/actions/leads";
import { addLeadNote, type LeadActivity } from "@/lib/actions/lead-activity";
import { AdminPageHeader, AdminPanel, AdminPill } from "@/components/admin/AdminPrimitives";
import {
  formatDateLabel,
  formatDateTimeLabel,
  isPastDate,
  toDateInputValue,
} from "@/lib/date";

const STATUSES = LEAD_STATUSES;

const ACTIVITY_ICONS: Record<string, string> = {
  note: "N",
  status_change: "S",
  email_sent: "E",
};

const ACTIVITY_COLORS: Record<string, string> = {
  note: "bg-blue-500/20 text-blue-400",
  status_change: "bg-purple-500/20 text-purple-400",
  email_sent: "bg-green-500/20 text-green-400",
};

function getLeadSourceLabel(source: string | undefined) {
  if (source === "agent_demo") return "Agent Demo";
  if (source === "agent_chat") return "Agent Chat";
  if (source === "guided_audit") return "Guided Audit";
  return "Contact Form";
}

function getExperimentTargetLabel(target: string) {
  if (target === "hero_headline") return "Hero Headline";
  if (target === "hero_cta") return "Hero CTA";
  if (target === "final_cta") return "Final CTA";
  return target;
}

export default function LeadDetail({
  lead: initialLead,
  activity: initialActivity,
}: {
  lead: Lead;
  activity: LeadActivity[];
}) {
  const router = useRouter();
  const [lead, setLead] = useState(initialLead);
  const [activity, setActivity] = useState(initialActivity);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(
    toDateInputValue(lead.follow_up_at)
  );
  const [followUpNote, setFollowUpNote] = useState(lead.follow_up_note ?? "");
  const [savingFollowUp, setSavingFollowUp] = useState(false);

  async function handleStatusChange(newStatus: LeadStatus) {
    const result = await updateLeadStatus(lead.id, newStatus);
    if (result.success) {
      const oldStatus = lead.status;
      setLead((prev) => ({ ...prev, status: newStatus }));
      setActivity((prev) => [
        {
          id: `temp-${Date.now()}`,
          type: "status_change",
          content: `${oldStatus} → ${newStatus}`,
          author: "you",
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
  }

  async function handleAddNote() {
    if (!note.trim()) return;
    setSubmitting(true);
    const result = await addLeadNote(lead.id, note);
    if (result.success) {
      setActivity((prev) => [
        {
          id: `temp-${Date.now()}`,
          type: "note",
          content: note.trim(),
          author: "you",
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setNote("");
    }
    setSubmitting(false);
  }

  async function handleSetFollowUp() {
    if (!followUpDate) return;
    setSavingFollowUp(true);
    const result = await setLeadFollowUp(lead.id, followUpDate, followUpNote);
    if (result.success) {
      setLead((prev) => ({
        ...prev,
        follow_up_at: new Date(followUpDate + "T12:00:00").toISOString(),
        follow_up_note: followUpNote,
      }));
      router.refresh();
    }
    setSavingFollowUp(false);
  }

  async function handleClearFollowUp() {
    setSavingFollowUp(true);
    const result = await clearLeadFollowUp(lead.id);
    if (result.success) {
      setLead((prev) => ({
        ...prev,
        follow_up_at: undefined,
        follow_up_note: undefined,
      }));
      setFollowUpDate("");
      setFollowUpNote("");
      router.refresh();
    }
    setSavingFollowUp(false);
  }

  const scoreColor =
    (lead.score ?? 0) >= 50
      ? "bg-green-500/10 text-green-400"
      : (lead.score ?? 0) >= 25
        ? "bg-yellow-500/10 text-yellow-400"
        : "bg-red-500/10 text-red-400";

  const isOverdue = isPastDate(lead.follow_up_at);
  const hasAttribution =
    Boolean(lead.utm_source || lead.utm_medium || lead.utm_campaign || lead.landing_path) ||
    Boolean(lead.experiment_assignments?.length);

  return (
    <div>
      <AdminPageHeader
        eyebrow="Lead"
        title={lead.name || "Unnamed Lead"}
        description={lead.email || "No email on record"}
        actions={
          <Link
            href="/admin/leads"
            className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-5 py-3 text-sm font-medium text-[#27311f] transition-colors hover:bg-white"
          >
            Back to Leads
          </Link>
        }
      />

      <AdminPanel className="mt-8 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-[#1d2318]">{lead.company || "No company"}</h2>
            <p className="text-sm text-[#6c7467]">{getLeadSourceLabel(lead.source)}</p>
          </div>
          {lead.score != null && (
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${scoreColor}`}>
              Score: {lead.score}/75
            </span>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="mb-1 text-xs uppercase text-[#7e7b70]">Company</p>
            <p className="text-[#1d2318]">{lead.company || "—"}</p>
          </div>
          <div>
            <p className="mb-1 text-xs uppercase text-[#7e7b70]">Source</p>
            <p className="text-[#1d2318]">{getLeadSourceLabel(lead.source)}</p>
          </div>
          <div>
            <p className="mb-1 text-xs uppercase text-[#7e7b70]">Status</p>
            <select
              value={lead.status}
              onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
              className={`cursor-pointer rounded-full border px-2 py-1 text-xs font-medium ${LEAD_STATUS_COLORS[lead.status] ?? "border-[#d7d0c1] bg-[#fbf7ef] text-[#27311f]"}`}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {LEAD_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-1 text-xs uppercase text-[#7e7b70]">Bottleneck</p>
            <p className="text-[#1d2318]">{lead.bottleneck || "—"}</p>
          </div>
          <div>
            <p className="mb-1 text-xs uppercase text-[#7e7b70]">Tools</p>
            <p className="text-[#1d2318]">{lead.tools || "—"}</p>
          </div>
          <div>
            <p className="mb-1 text-xs uppercase text-[#7e7b70]">Created</p>
            <p className="text-[#1d2318]">{formatDateLabel(lead.created_at)}</p>
          </div>
          <div>
            <p className="mb-1 text-xs uppercase text-[#7e7b70]">Nurture</p>
            <p>
              {lead.nurture_enrolled ? (
                <span className="text-[#4f6032]">Enrolled</span>
              ) : (
                <span className="text-[#6c7467]">Not enrolled</span>
              )}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs uppercase text-[#7e7b70]">Preview Plan</p>
            {lead.plan_id ? (
              <div className="flex flex-col gap-1">
                <span className="text-[#4f6032]">
                  {lead.preview_plan_sent_at
                    ? `Sent ${formatDateLabel(lead.preview_plan_sent_at)}`
                    : "Generated"}
                </span>
                <Link
                  href={`/plan/${lead.plan_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-[#4f6032] hover:underline"
                >
                  View plan
                </Link>
              </div>
            ) : (
              <p>
                {lead.preview_plan_sent_at ? (
                  <span className="text-[#4f6032]">
                    Sent {formatDateLabel(lead.preview_plan_sent_at)}
                  </span>
                ) : (
                  <span className="text-[#6c7467]">—</span>
                )}
              </p>
            )}
          </div>
        </div>

        {hasAttribution && (
          <div className="mt-6 border-t border-[#ddd5c7] pt-5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[#1d2318]">Attribution</h3>
              <AdminPill tone="blue">Captured</AdminPill>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div>
                <p className="mb-1 text-xs uppercase text-[#7e7b70]">Landing Path</p>
                <p className="text-[#1d2318]">{lead.landing_path || "—"}</p>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase text-[#7e7b70]">UTM Source</p>
                <p className="text-[#1d2318]">{lead.utm_source || "—"}</p>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase text-[#7e7b70]">UTM Medium</p>
                <p className="text-[#1d2318]">{lead.utm_medium || "—"}</p>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase text-[#7e7b70]">UTM Campaign</p>
                <p className="text-[#1d2318]">{lead.utm_campaign || "—"}</p>
              </div>
            </div>

            {lead.experiment_assignments && lead.experiment_assignments.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs uppercase text-[#7e7b70]">Experiment Assignments</p>
                <div className="flex flex-wrap gap-2">
                  {lead.experiment_assignments.map((assignment) => (
                    <div
                      key={`${assignment.experiment_id}:${assignment.variant_key}`}
                      className="rounded-[18px] border border-[#d7d0c1] bg-white/65 px-3 py-2"
                    >
                      <p className="text-xs font-medium text-[#1d2318]">
                        {assignment.experiment_name}
                      </p>
                      <p className="mt-1 text-xs text-[#596351]">
                        {getExperimentTargetLabel(assignment.target)}: {assignment.variant_label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {lead.audit_summary && (
          <div className="mt-6 border-t border-[#ddd5c7] pt-5">
            <h3 className="text-sm font-semibold text-[#1d2318]">Audit Summary</h3>
            <p className="mt-2 text-sm leading-6 text-[#596351]">
              {lead.audit_summary}
            </p>
          </div>
        )}
      </AdminPanel>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-[#1d2318]">Activity</h2>

          <AdminPanel className="mb-4">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note..."
              rows={2}
              className="mb-2 w-full resize-none rounded-[18px] border border-[#d7d0c1] bg-[#fbf7ef] p-3 text-sm text-[#1d2318] placeholder:text-[#7e7b70]"
            />
            <button
              onClick={handleAddNote}
              disabled={submitting || !note.trim()}
              className="rounded-full bg-[#171d13] px-4 py-2 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Add Note"}
            </button>
          </AdminPanel>

          {activity.length === 0 ? (
            <AdminPanel className="py-8 text-center text-sm text-[#6c7467]">No activity yet.</AdminPanel>
          ) : (
            <div className="space-y-3">
              {activity.map((item) => (
                <AdminPanel
                  key={item.id}
                  className="flex items-start gap-3"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${ACTIVITY_COLORS[item.type] ?? "bg-muted/20 text-muted"}`}
                  >
                    {ACTIVITY_ICONS[item.type] ?? "?"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1d2318]">{item.content}</p>
                      <p className="mt-1 text-xs text-[#6c7467]">
                      {item.author && `${item.author} · `}
                      {formatDateTimeLabel(item.created_at)}
                    </p>
                  </div>
                </AdminPanel>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-[#1d2318]">Follow-up</h2>
          <AdminPanel>
            {lead.follow_up_at && (
              <div
                className={`mb-4 rounded-[18px] p-3 text-sm ${isOverdue ? "bg-[#fff2f2] text-[#9d3f3f]" : "bg-[#eef4fb] text-sky-700"}`}
              >
                <p className="font-medium">
                  {isOverdue ? "Overdue" : "Upcoming"}
                </p>
                <p>{formatDateLabel(lead.follow_up_at)}</p>
                {lead.follow_up_note && (
                  <p className="text-xs mt-1 opacity-80">
                    {lead.follow_up_note}
                  </p>
                )}
              </div>
            )}

            <label className="mb-1 block text-xs uppercase text-[#7e7b70]">
              Date
            </label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="mb-3 w-full rounded-[16px] border border-[#d7d0c1] bg-[#fbf7ef] px-3 py-2 text-sm text-[#1d2318]"
            />

            <label className="mb-1 block text-xs uppercase text-[#7e7b70]">
              Note (optional)
            </label>
            <input
              type="text"
              value={followUpNote}
              onChange={(e) => setFollowUpNote(e.target.value)}
              placeholder="e.g. Check in after demo"
              className="mb-3 w-full rounded-[16px] border border-[#d7d0c1] bg-[#fbf7ef] px-3 py-2 text-sm text-[#1d2318]"
            />

            <div className="flex gap-2">
              <button
                onClick={handleSetFollowUp}
                disabled={savingFollowUp || !followUpDate}
                className="flex-1 rounded-full bg-[#171d13] px-3 py-2 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02] disabled:opacity-50"
              >
                {savingFollowUp ? "Saving..." : "Set Reminder"}
              </button>
              {lead.follow_up_at && (
                <button
                  onClick={handleClearFollowUp}
                  disabled={savingFollowUp}
                  className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-3 py-2 text-sm text-[#596351] transition-colors hover:bg-white disabled:opacity-50"
                >
                  Clear
                </button>
              )}
            </div>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}
