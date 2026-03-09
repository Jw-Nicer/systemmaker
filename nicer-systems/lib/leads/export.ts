import { escapeCsvCell } from "@/lib/csv";
import type { Lead, LeadExportFilters } from "@/types/lead";

function toSearchValue(value: unknown) {
  return typeof value === "string" ? value.toLowerCase() : "";
}

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
        toSearchValue(lead.name).includes(search) ||
        toSearchValue(lead.email).includes(search) ||
        toSearchValue(lead.company).includes(search) ||
        toSearchValue(lead.bottleneck).includes(search)
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
