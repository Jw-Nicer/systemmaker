"use client";

import Link from "next/link";
import type { LandingVariant } from "@/types/variant";
import { normalizeVariantSections } from "@/lib/marketing/variant-content";
import {
  AdminPanel,
  AdminPill,
} from "@/components/admin/AdminPrimitives";
import { inputClassName, type VariantAnalytics } from "../utils";

export default function VariantListCard({
  item,
  index,
  totalCount,
  origin,
  copiedLink,
  deleteConfirm,
  selected,
  analytics,
  onEdit,
  onDuplicate,
  onDelete,
  onDeleteConfirm,
  onToggle,
  onMove,
  onCopyLink,
  onSelect,
}: {
  item: LandingVariant;
  index: number;
  totalCount: number;
  origin: string;
  copiedLink: string | null;
  deleteConfirm: string | null;
  selected?: boolean;
  analytics?: VariantAnalytics;
  onEdit: (item: LandingVariant) => void;
  onDuplicate: (item: LandingVariant) => void;
  onDelete: (id: string) => void;
  onDeleteConfirm: (id: string | null) => void;
  onToggle: (id: string, published: boolean) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onCopyLink: (slug: string) => void;
  onSelect?: (id: string) => void;
}) {
  const sections = normalizeVariantSections(item);
  const variantUrl = origin ? `${origin}/${item.slug}` : `/${item.slug}`;
  const cls = inputClassName();

  return (
    <AdminPanel className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 flex-1 gap-3">
        {onSelect && (
          <div className="flex items-start pt-1">
            <input
              type="checkbox"
              checked={selected ?? false}
              onChange={() => onSelect(item.id)}
              className="h-4 w-4 rounded border-[#d7d0c1] bg-[#fbf7ef] text-[#4f6032] accent-[#4f6032]"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-[#1d2318]">{item.industry}</h3>
            <AdminPill tone={item.is_published ? "green" : "neutral"}>
              {item.is_published ? "Published" : "Draft"}
            </AdminPill>
            <AdminPill tone="blue">/{item.slug}</AdminPill>
          </div>
          <p className="mt-2 truncate text-sm text-[#596351]">{sections.hero.headline}</p>

          {analytics && (
            <div className="mt-2 flex gap-4 text-xs">
              <span className="flex items-center gap-1 text-[#596351]">
                <span className="font-medium text-[#1d2318]">{analytics.views}</span> views (30d)
              </span>
              <span className="flex items-center gap-1 text-[#596351]">
                <span className="font-medium text-[#1d2318]">{analytics.leads}</span> leads (30d)
              </span>
            </div>
          )}

          <div className="mt-3 flex flex-col gap-2">
            <label className="text-[11px] uppercase tracking-[0.14em] text-[#7e7b70]">
              Variant URL
            </label>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <input
                readOnly
                value={variantUrl}
                className={`${cls} bg-[#f3ede2] font-mono text-xs text-[#596351] md:max-w-[28rem]`}
              />
              <a
                href={variantUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-3 py-2 text-xs text-[#27311f] hover:bg-white"
              >
                Open
              </a>
              <button
                onClick={() => onCopyLink(item.slug)}
                className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-3 py-2 text-xs text-[#4f6032] hover:bg-white"
              >
                {copiedLink === item.slug ? "Copied" : "Copy Link"}
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#6c7467]">
            <span>Hero CTA: {sections.hero.cta_text}</span>
            <span>Proof filters: {sections.proof.featured_industries.length}</span>
            <span>Steps: {sections.how_it_works.steps.length}</span>
            <span>Features: {sections.features.items.length}</span>
            <span>Order: {index + 1}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <Link
          href={`/preview/variant/${item.id}`}
          target="_blank"
          className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-3 py-2 text-xs text-[#596351] hover:bg-white"
        >
          Preview
        </Link>
        <button
          onClick={() => onMove(index, -1)}
          disabled={index === 0}
          className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-3 py-2 text-xs text-[#596351] disabled:opacity-40"
        >
          Move up
        </button>
        <button
          onClick={() => onMove(index, 1)}
          disabled={index === totalCount - 1}
          className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-3 py-2 text-xs text-[#596351] disabled:opacity-40"
        >
          Move down
        </button>
        <button
          onClick={() => onToggle(item.id, item.is_published)}
          className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-3 py-2 text-xs text-[#596351] hover:bg-white"
        >
          {item.is_published ? "Unpublish" : "Publish"}
        </button>
        <button
          onClick={() => onDuplicate(item)}
          className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-3 py-2 text-xs text-[#596351] hover:bg-white"
        >
          Duplicate
        </button>
        <button
          onClick={() => onEdit(item)}
          className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-3 py-2 text-xs text-[#4f6032] hover:bg-white"
        >
          Edit
        </button>
        {deleteConfirm === item.id ? (
          <>
            <button
              onClick={() => onDelete(item.id)}
              className="rounded-full bg-[#8f3f3f] px-3 py-2 text-xs font-medium text-white"
            >
              Confirm Delete
            </button>
            <button
              onClick={() => onDeleteConfirm(null)}
              className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-3 py-2 text-xs text-[#596351]"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => onDeleteConfirm(item.id)}
            className="rounded-full border border-[#e3d8cb] bg-[#fff7f4] px-3 py-2 text-xs text-[#9d3f3f]"
          >
            Delete
          </button>
        )}
      </div>
    </AdminPanel>
  );
}
