"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import { LEAD_STATUSES } from "@/types/lead";
import type { Lead, LeadStatus } from "@/types/lead";
import {
  updateLeadStatus,
  exportLeadsCSV,
} from "@/lib/actions/leads";
import {
  AdminPageHeader,
  AdminPanel,
  AdminPill,
} from "@/components/admin/AdminPrimitives";
import { formatDateLabel, isPastDate, parseDateValue } from "@/lib/date";

const STATUSES = LEAD_STATUSES;

const STATUS_COLORS: Record<string, string> = {
  nurture: "border-purple-300 bg-purple-50 text-purple-700",
  lost: "border-gray-300 bg-gray-100 text-gray-500",
};

function toSearchValue(value: unknown) {
  return typeof value === "string" ? value.toLowerCase() : "";
}

export default function LeadsManager({
  initialData,
}: {
  initialData: Lead[];
}) {
  const [leads, setLeads] = useState<Lead[]>(initialData);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "score">("date");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const filtered = leads
    .filter((l) => {
      if (filter !== "all" && l.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          toSearchValue(l.name).includes(q) ||
          toSearchValue(l.email).includes(q) ||
          toSearchValue(l.company).includes(q) ||
          toSearchValue(l.bottleneck).includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "score") return (b.score ?? 0) - (a.score ?? 0);
      return 0; // already sorted by date from server
    });

  const hasActiveExportFilters =
    filter !== "all" || search.trim().length > 0 || sortBy !== "date";

  async function handleStatusChange(id: string, newStatus: LeadStatus) {
    setStatusError(null);
    const result = await updateLeadStatus(id, newStatus);
    if (result.success) {
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
      );
    } else {
      setStatusError(result.error ?? "Failed to update lead status");
    }
  }

  async function handleExport() {
    setExporting(true);
    const csv = await exportLeadsCSV({
      status: filter,
      search,
      sortBy,
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="CRM"
        title="Leads"
        description="Track, qualify, and follow up on inbound requests from contact and preview-plan flows."
        actions={
          <button
            onClick={handleExport}
            disabled={exporting}
            className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-5 py-3 text-sm font-medium text-[#27311f] transition-colors hover:bg-white disabled:opacity-50"
          >
            {exporting
              ? "Exporting..."
              : hasActiveExportFilters
                ? "Export Filtered CSV"
                : "Export CSV"}
          </button>
        }
      />

      <AdminPanel className="mt-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {["all", ...STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === s
                  ? "bg-[#171d13] text-[#f7f2e8]"
                  : "border border-[#d7d0c1] bg-white/55 text-[#596351] hover:bg-white"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search leads..."
          className="max-w-xs flex-1 rounded-[16px] border border-[#d7d0c1] bg-[#fbf7ef] px-3 py-2 text-sm text-[#1d2318]"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "date" | "score")}
          className="rounded-[16px] border border-[#d7d0c1] bg-[#fbf7ef] px-3 py-2 text-sm text-[#1d2318]"
        >
          <option value="date">Sort: Newest</option>
          <option value="score">Sort: Score</option>
        </select>
      </div>
      </AdminPanel>

      {statusError && (
        <div className="mb-4 mt-4 rounded-[16px] border border-[#dc8f8f] bg-[#fff2f2] p-3 text-sm text-[#9d3f3f]">
          {statusError}
        </div>
      )}

      <AdminPanel className="mt-6 overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-white/45">
            <tr className="border-b border-[#ddd5c7] text-left">
              <th className="px-6 py-3 font-medium text-[#6c7467]">Name</th>
              <th className="px-6 py-3 font-medium text-[#6c7467]">Email</th>
              <th className="px-6 py-3 font-medium text-[#6c7467]">Company</th>
              <th className="px-6 py-3 font-medium text-[#6c7467]">Score</th>
              <th className="px-6 py-3 font-medium text-[#6c7467]">Status</th>
              <th className="px-6 py-3 font-medium text-[#6c7467]">Source</th>
              <th className="px-6 py-3 font-medium text-[#6c7467]">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-[#6c7467]">
                  No leads found.
                </td>
              </tr>
            ) : (
              filtered.map((lead) => (
                <Fragment key={lead.id}>
                  <tr
                    onClick={() =>
                      setExpandedId(
                        expandedId === lead.id ? null : lead.id
                      )
                    }
                    className="cursor-pointer border-b border-[#e1d9cb] last:border-b-0 hover:bg-white/35"
                  >
                    <td className="px-6 py-3 font-medium text-[#1d2318]">
                      <div className="flex items-center gap-2">
                        {isPastDate(lead.follow_up_at) && (
                          <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" title="Overdue follow-up" />
                        )}
                        {lead.follow_up_at && parseDateValue(lead.follow_up_at) && !isPastDate(lead.follow_up_at) && (
                          <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" title="Follow-up scheduled" />
                        )}
                        <span>{lead.name || "—"}</span>
                        <Link
                          href={`/admin/leads/${lead.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="ml-1 text-xs text-[#4f6032] hover:underline"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-[#596351]">
                      {lead.email || "—"}
                    </td>
                    <td className="px-6 py-3 text-[#596351]">
                      {lead.company || "—"}
                    </td>
                    <td className="px-6 py-3">
                      {lead.score != null ? (
                        <AdminPill
                          tone={
                            lead.score >= 50 ? "green" : lead.score >= 25 ? "yellow" : "red"
                          }
                        >
                          {lead.score}
                        </AdminPill>
                      ) : (
                        <span className="text-xs text-[#6c7467]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <select
                        value={lead.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleStatusChange(lead.id, e.target.value as LeadStatus);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className={`cursor-pointer rounded-full border px-2 py-1 text-xs font-medium ${STATUS_COLORS[lead.status] ?? "border-[#d7d0c1] bg-[#fbf7ef] text-[#27311f]"}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-3 text-xs text-[#6c7467]">
                      {lead.source}
                    </td>
                    <td className="px-6 py-3 text-xs text-[#6c7467]">
                      {formatDateLabel(lead.created_at)}
                    </td>
                  </tr>
                  {expandedId === lead.id && (
                    <tr key={`${lead.id}-detail`}>
                      <td
                        colSpan={7}
                        className="border-b border-[#e1d9cb] bg-white/42 px-6 py-4"
                      >
                        <div className="grid sm:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="mb-1 text-xs uppercase text-[#7e7b70]">
                              Bottleneck
                            </p>
                            <p className="text-[#1d2318]">{lead.bottleneck || "—"}</p>
                          </div>
                          <div>
                            <p className="mb-1 text-xs uppercase text-[#7e7b70]">
                              Tools
                            </p>
                            <p className="text-[#1d2318]">{lead.tools || "—"}</p>
                          </div>
                          <div>
                            <p className="mb-1 text-xs uppercase text-[#7e7b70]">
                              Urgency
                            </p>
                            <p className="text-[#1d2318]">{lead.urgency || "—"}</p>
                          </div>
                          <div>
                            <p className="mb-1 text-xs uppercase text-[#7e7b70]">
                              UTM Source
                            </p>
                            <p className="text-[#1d2318]">{lead.utm_source || "—"}</p>
                          </div>
                          <div>
                            <p className="mb-1 text-xs uppercase text-[#7e7b70]">
                              Nurture
                            </p>
                            <p>
                              {lead.nurture_enrolled ? (
                                <span className="text-[#4f6032]">Enrolled</span>
                              ) : (
                                <span className="text-[#6c7467]">Not enrolled</span>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="mb-1 text-xs uppercase text-[#7e7b70]">
                              Preview Plan
                            </p>
                            <div className="flex items-center gap-2">
                              {lead.preview_plan_sent_at ? (
                                <span className="text-[#4f6032]">Sent</span>
                              ) : (
                                <span className="text-[#6c7467]">—</span>
                              )}
                              {lead.plan_id ? (
                                <Link
                                  href={`/plan/${lead.plan_id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs text-[#4f6032] hover:underline"
                                >
                                  View plan
                                </Link>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </AdminPanel>

      <p className="mt-4 text-xs text-[#6c7467]">
        {filtered.length} lead{filtered.length !== 1 ? "s" : ""} shown
      </p>
    </div>
  );
}
