"use client";

import { useState } from "react";
import {
  updateLeadStatus,
  exportLeadsCSV,
  type Lead,
} from "@/lib/actions/leads";

const STATUSES = ["new", "qualified", "booked", "closed", "unqualified"];
const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-400",
  qualified: "bg-green-500/10 text-green-400",
  booked: "bg-purple-500/10 text-purple-400",
  closed: "bg-muted/10 text-muted",
  unqualified: "bg-red-500/10 text-red-400",
};

const SCORE_COLORS: Record<string, string> = {
  hot: "bg-red-500/10 text-red-400",
  warm: "bg-yellow-500/10 text-yellow-400",
  cold: "bg-blue-500/10 text-blue-400",
};

export default function LeadsManager({
  initialData,
}: {
  initialData: Lead[];
}) {
  const [leads, setLeads] = useState<Lead[]>(initialData);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const filtered = leads.filter((l) => {
    if (filter !== "all" && l.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.company.toLowerCase().includes(q) ||
        l.bottleneck.toLowerCase().includes(q)
      );
    }
    return true;
  });

  async function handleStatusChange(id: string, newStatus: string) {
    const result = await updateLeadStatus(id, newStatus);
    if (result.success) {
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
      );
    }
  }

  async function handleExport() {
    setExporting(true);
    const csv = await exportLeadsCSV();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Leads</h1>
          <p className="text-muted text-sm">
            Track and triage incoming inquiries.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2 rounded-lg border border-border text-sm text-muted hover:text-foreground transition-colors disabled:opacity-50"
        >
          {exporting ? "Exporting..." : "Export CSV"}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1">
          {["all", ...STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === s
                  ? "bg-primary text-background"
                  : "bg-surface-light text-muted hover:text-foreground border border-border"
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
          className="px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm flex-1 max-w-xs"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-6 py-3 text-muted font-medium">Name</th>
              <th className="px-6 py-3 text-muted font-medium">Email</th>
              <th className="px-6 py-3 text-muted font-medium">Company</th>
              <th className="px-6 py-3 text-muted font-medium">Status</th>
              <th className="px-6 py-3 text-muted font-medium">Score</th>
              <th className="px-6 py-3 text-muted font-medium">Source</th>
              <th className="px-6 py-3 text-muted font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-muted">
                  No leads found.
                </td>
              </tr>
            ) : (
              filtered.map((lead) => (
                <>
                  <tr
                    key={lead.id}
                    onClick={() =>
                      setExpandedId(
                        expandedId === lead.id ? null : lead.id
                      )
                    }
                    className="border-b border-border last:border-b-0 hover:bg-surface-light/50 cursor-pointer"
                  >
                    <td className="px-6 py-3 font-medium">
                      {lead.name || "—"}
                    </td>
                    <td className="px-6 py-3 text-muted">
                      {lead.email || "—"}
                    </td>
                    <td className="px-6 py-3 text-muted">
                      {lead.company || "—"}
                    </td>
                    <td className="px-6 py-3">
                      <select
                        value={lead.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleStatusChange(lead.id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${STATUS_COLORS[lead.status] ?? STATUS_COLORS.new}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-3">
                      {(lead as Lead & { score_label?: string; score?: number }).score_label ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SCORE_COLORS[(lead as Lead & { score_label?: string }).score_label!] ?? "bg-muted/10 text-muted"}`}>
                          {(lead as Lead & { score?: number }).score ?? 0}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-muted text-xs">
                      {lead.source}
                    </td>
                    <td className="px-6 py-3 text-muted text-xs">
                      {formatDate(lead.created_at)}
                    </td>
                  </tr>
                  {expandedId === lead.id && (
                    <tr key={`${lead.id}-detail`}>
                      <td
                        colSpan={7}
                        className="px-6 py-4 bg-surface-light/30 border-b border-border"
                      >
                        <div className="grid sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-muted uppercase mb-1">
                              Bottleneck
                            </p>
                            <p>{lead.bottleneck || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted uppercase mb-1">
                              Tools
                            </p>
                            <p>{lead.tools || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted uppercase mb-1">
                              Urgency
                            </p>
                            <p>{lead.urgency || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted uppercase mb-1">
                              UTM Source
                            </p>
                            <p>{lead.utm_source || "—"}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted mt-4">
        {filtered.length} lead{filtered.length !== 1 ? "s" : ""} shown
      </p>
    </div>
  );
}
