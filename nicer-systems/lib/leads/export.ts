import { escapeCsvCell } from "@/lib/csv";
import type { Lead, LeadExportFilters } from "@/types/lead";

export function filterLeadsForExport(
  leads: Lead[],
  filters: LeadExportFilters = {}
) {
  const statusFilter = filters.status ?? "all";
  const search = filters.search?.trim().toLowerCase() ?? "";
  const sortBy = filters.sortBy ?? "date";

  return [...leads]
    .filter((lead) => {
      if (statusFilter !== "all" && lead.status !== statusFilter) {
        return false;
      }

      if (!search) {
        return true;
      }

      return (
        lead.name.toLowerCase().includes(search) ||
        lead.email.toLowerCase().includes(search) ||
        lead.company.toLowerCase().includes(search) ||
        lead.bottleneck.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      if (sortBy === "score") {
        return (b.score ?? 0) - (a.score ?? 0);
      }
      return 0;
    });
}

export function buildLeadsCSV(leads: Lead[]): string {
  const headers = [
    "Name",
    "Email",
    "Company",
    "Bottleneck",
    "Tools",
    "Urgency",
    "Status",
    "Source",
    "Score",
    "Nurture",
    "Created",
  ];

  const rows = leads.map((lead) =>
    [
      lead.name,
      lead.email,
      lead.company,
      lead.bottleneck,
      lead.tools,
      lead.urgency,
      lead.status,
      lead.source,
      lead.score ?? "",
      lead.nurture_enrolled ? "yes" : "no",
      lead.created_at,
    ].map(escapeCsvCell).join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}
