"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Lead } from "@/lib/actions/leads";
import {
  updateLeadStatus,
  setLeadFollowUp,
  clearLeadFollowUp,
} from "@/lib/actions/leads";
import { addLeadNote, type LeadActivity } from "@/lib/actions/lead-activity";

const STATUSES = ["new", "qualified", "booked", "closed", "unqualified"];
const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-400",
  qualified: "bg-green-500/10 text-green-400",
  booked: "bg-purple-500/10 text-purple-400",
  closed: "bg-muted/10 text-muted",
  unqualified: "bg-red-500/10 text-red-400",
};

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
    lead.follow_up_at ? new Date(lead.follow_up_at).toISOString().slice(0, 10) : ""
  );
  const [followUpNote, setFollowUpNote] = useState(lead.follow_up_note ?? "");
  const [savingFollowUp, setSavingFollowUp] = useState(false);

  async function handleStatusChange(newStatus: string) {
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
    await clearLeadFollowUp(lead.id);
    setLead((prev) => ({
      ...prev,
      follow_up_at: undefined,
      follow_up_note: undefined,
    }));
    setFollowUpDate("");
    setFollowUpNote("");
    setSavingFollowUp(false);
    router.refresh();
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  }

  function formatDateTime(iso: string) {
    try {
      return new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  const scoreColor =
    (lead.score ?? 0) >= 50
      ? "bg-green-500/10 text-green-400"
      : (lead.score ?? 0) >= 25
        ? "bg-yellow-500/10 text-yellow-400"
        : "bg-red-500/10 text-red-400";

  const isOverdue =
    lead.follow_up_at && new Date(lead.follow_up_at) < new Date();

  return (
    <div>
      <Link
        href="/admin/leads"
        className="text-sm text-muted hover:text-foreground transition-colors mb-6 inline-block"
      >
        &larr; Back to Leads
      </Link>

      {/* Lead Info Header */}
      <div className="rounded-xl border border-border bg-surface p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">
              {lead.name || "Unnamed Lead"}
            </h1>
            <p className="text-muted text-sm">{lead.email || "No email"}</p>
          </div>
          {lead.score != null && (
            <span
              className={`text-sm px-3 py-1 rounded-full font-medium ${scoreColor}`}
            >
              Score: {lead.score}/75
            </span>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted uppercase mb-1">Company</p>
            <p>{lead.company || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted uppercase mb-1">Source</p>
            <p>{lead.source === "agent_demo" ? "Agent Demo" : "Contact Form"}</p>
          </div>
          <div>
            <p className="text-xs text-muted uppercase mb-1">Status</p>
            <select
              value={lead.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${STATUS_COLORS[lead.status] ?? STATUS_COLORS.new}`}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs text-muted uppercase mb-1">Bottleneck</p>
            <p>{lead.bottleneck || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted uppercase mb-1">Tools</p>
            <p>{lead.tools || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted uppercase mb-1">Created</p>
            <p>{formatDate(lead.created_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted uppercase mb-1">Nurture</p>
            <p>
              {lead.nurture_enrolled ? (
                <span className="text-green-400">Enrolled</span>
              ) : (
                <span className="text-muted">Not enrolled</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted uppercase mb-1">Preview Plan</p>
            <p>
              {lead.preview_plan_sent_at ? (
                <span className="text-green-400">
                  Sent {formatDate(lead.preview_plan_sent_at)}
                </span>
              ) : (
                <span className="text-muted">—</span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Activity Timeline — left 2/3 */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Activity</h2>

          {/* Add Note */}
          <div className="rounded-xl border border-border bg-surface p-4 mb-4">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note..."
              rows={2}
              className="w-full bg-background border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-muted resize-none mb-2"
            />
            <button
              onClick={handleAddNote}
              disabled={submitting || !note.trim()}
              className="px-4 py-1.5 rounded-lg bg-primary text-background text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Add Note"}
            </button>
          </div>

          {/* Timeline */}
          {activity.length === 0 ? (
            <p className="text-sm text-muted py-8 text-center">
              No activity yet.
            </p>
          ) : (
            <div className="space-y-3">
              {activity.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 items-start rounded-lg border border-border bg-surface p-3"
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${ACTIVITY_COLORS[item.type] ?? "bg-muted/20 text-muted"}`}
                  >
                    {ACTIVITY_ICONS[item.type] ?? "?"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{item.content}</p>
                    <p className="text-xs text-muted mt-1">
                      {item.author && `${item.author} · `}
                      {formatDateTime(item.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Follow-up Reminder — right 1/3 */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Follow-up</h2>
          <div className="rounded-xl border border-border bg-surface p-4">
            {lead.follow_up_at && (
              <div
                className={`text-sm mb-4 p-3 rounded-lg ${isOverdue ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"}`}
              >
                <p className="font-medium">
                  {isOverdue ? "Overdue" : "Upcoming"}
                </p>
                <p>{formatDate(lead.follow_up_at)}</p>
                {lead.follow_up_note && (
                  <p className="text-xs mt-1 opacity-80">
                    {lead.follow_up_note}
                  </p>
                )}
              </div>
            )}

            <label className="block text-xs text-muted uppercase mb-1">
              Date
            </label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground mb-3"
            />

            <label className="block text-xs text-muted uppercase mb-1">
              Note (optional)
            </label>
            <input
              type="text"
              value={followUpNote}
              onChange={(e) => setFollowUpNote(e.target.value)}
              placeholder="e.g. Check in after demo"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground mb-3"
            />

            <div className="flex gap-2">
              <button
                onClick={handleSetFollowUp}
                disabled={savingFollowUp || !followUpDate}
                className="flex-1 px-3 py-1.5 rounded-lg bg-primary text-background text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {savingFollowUp ? "Saving..." : "Set Reminder"}
              </button>
              {lead.follow_up_at && (
                <button
                  onClick={handleClearFollowUp}
                  disabled={savingFollowUp}
                  className="px-3 py-1.5 rounded-lg border border-border text-sm text-muted hover:text-foreground transition-colors disabled:opacity-50"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
