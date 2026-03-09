"use client";

import { AdminPill } from "@/components/admin/AdminPrimitives";
import { inputClassName } from "../utils";

export type StatusFilter = "all" | "published" | "draft";

export default function VariantListToolbar({
  searchQuery,
  statusFilter,
  totalCount,
  filteredCount,
  selectedCount,
  onSearchChange,
  onStatusFilterChange,
  onSelectAll,
  onClearSelection,
  onBulkPublish,
  onBulkUnpublish,
}: {
  searchQuery: string;
  statusFilter: StatusFilter;
  totalCount: number;
  filteredCount: number;
  selectedCount: number;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkPublish: () => void;
  onBulkUnpublish: () => void;
}) {
  const filters: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "published", label: "Published" },
    { key: "draft", label: "Draft" },
  ];

  return (
    <div className="mt-8 space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search variants..."
            className={`${inputClassName()} max-w-sm`}
          />
          <div className="flex gap-1.5">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => onStatusFilterChange(f.key)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === f.key
                    ? "border-[#9bb286]/24 bg-[#e8eedf] text-[#4f6032]"
                    : "border-[#d5cdbd] bg-white/60 text-[#556052] hover:bg-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-[#6c7467]">
          Showing {filteredCount} of {totalCount} variants
        </p>
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center gap-3 rounded-[18px] border border-[#9bb286]/30 bg-[#e8eedf] px-4 py-3">
          <AdminPill tone="green">{selectedCount} selected</AdminPill>
          <button
            onClick={onBulkPublish}
            className="rounded-full border border-[#9bb286] bg-white px-3 py-1.5 text-xs font-medium text-[#4f6032] transition-colors hover:bg-[#e8eedf]"
          >
            Publish All
          </button>
          <button
            onClick={onBulkUnpublish}
            className="rounded-full border border-[#d0c8b8] bg-white px-3 py-1.5 text-xs font-medium text-[#596351] transition-colors hover:bg-[#fbf7ef]"
          >
            Unpublish All
          </button>
          <button
            onClick={onSelectAll}
            className="rounded-full border border-[#d0c8b8] bg-white px-3 py-1.5 text-xs text-[#596351] transition-colors hover:bg-[#fbf7ef]"
          >
            Select All
          </button>
          <button
            onClick={onClearSelection}
            className="rounded-full border border-[#d0c8b8] bg-white px-3 py-1.5 text-xs text-[#596351] transition-colors hover:bg-[#fbf7ef]"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
