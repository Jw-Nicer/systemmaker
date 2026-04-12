"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { HomepageLayout, HomepageSection } from "@/types/homepage-layout";
import { SECTION_REGISTRY } from "@/types/homepage-layout";
import {
  updateHomepageLayout,
  resetHomepageLayout,
} from "@/lib/actions/homepage-layout";
import {
  AdminPageHeader,
  AdminPanel,
  AdminPill,
} from "@/components/admin/AdminPrimitives";

interface Props {
  initialLayout: HomepageLayout;
}

export default function HomepageLayoutManager({ initialLayout }: Props) {
  const router = useRouter();
  const [sections, setSections] = useState<HomepageSection[]>(
    initialLayout.sections
  );
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(
    initialLayout.updated_at ?? null
  );

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const isDirty =
    JSON.stringify(sections) !== JSON.stringify(initialLayout.sections);

  function toggleSection(index: number) {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, enabled: !s.enabled } : s))
    );
  }

  function handleDragStart(index: number) {
    dragItem.current = index;
  }

  function handleDragEnter(index: number) {
    dragOverItem.current = index;
  }

  function handleDragEnd() {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    const reordered = [...sections];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, removed);
    // Renormalize sort_order to match the new positions
    setSections(reordered.map((s, i) => ({ ...s, sort_order: i })));

    dragItem.current = null;
    dragOverItem.current = null;
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateHomepageLayout({ sections });
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? "Failed to save layout");
      return;
    }
    setSavedAt(new Date().toISOString());
    router.refresh();
  }

  async function handleReset() {
    if (
      !confirm(
        "Reset the homepage layout to the default order and visibility? This will overwrite your current settings."
      )
    ) {
      return;
    }
    setResetting(true);
    setError(null);
    const result = await resetHomepageLayout();
    setResetting(false);
    if (!result.success) {
      setError(result.error ?? "Failed to reset layout");
      return;
    }
    router.refresh();
  }

  const enabledCount = sections.filter((s) => s.enabled).length;

  return (
    <div>
      <AdminPageHeader
        eyebrow="Landing page"
        title="Homepage layout"
        description="Drag to reorder sections on the marketing landing page. Toggle the checkbox to hide a section without deleting it. Changes go live after Save."
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              disabled={resetting || saving}
              className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-4 py-2.5 text-sm font-medium text-[#596351] transition-colors hover:bg-white disabled:opacity-50"
            >
              {resetting ? "Resetting..." : "Reset to defaults"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || resetting || !isDirty}
              className="rounded-full bg-[#171d13] px-5 py-3 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save layout"}
            </button>
          </div>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-[#6c7467]">
        <AdminPill tone={enabledCount === sections.length ? "green" : "yellow"}>
          {enabledCount} of {sections.length} visible
        </AdminPill>
        {savedAt && (
          <span className="text-xs text-[#8a8f7f]">
            Last saved: {new Date(savedAt).toLocaleString()}
          </span>
        )}
        {isDirty && (
          <span className="text-xs font-medium text-[#a06f2a]">
            Unsaved changes
          </span>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-[18px] border border-red-200 bg-[#fff4f2] p-3 text-sm text-[#9d3f3f]">
          {error}
        </div>
      )}

      <AdminPanel className="mt-8 overflow-hidden p-0">
        <ul>
          {sections.map((section, idx) => {
            const meta = SECTION_REGISTRY[section.key];
            return (
              <li
                key={section.key}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragEnter={() => handleDragEnter(idx)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={`flex cursor-grab items-center gap-4 border-b border-[#e1d9cb] px-6 py-4 transition-colors last:border-b-0 hover:bg-white/40 active:cursor-grabbing ${
                  section.enabled ? "" : "bg-[#f7f3e8] opacity-70"
                }`}
              >
                <span
                  className="select-none text-lg text-[#8a8f7f]"
                  aria-hidden
                  title="Drag to reorder"
                >
                  ⠿
                </span>
                <span className="w-8 font-mono text-xs text-[#8a8f7f]">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-[#1d2318]">{meta.label}</p>
                    {meta.recommended && (
                      <AdminPill tone="green">Recommended</AdminPill>
                    )}
                    {!section.enabled && (
                      <AdminPill tone="neutral">Hidden</AdminPill>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#6c7467]">
                    {meta.description}
                  </p>
                </div>
                <label
                  className="flex cursor-pointer items-center gap-2 text-sm text-[#27311f]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={section.enabled}
                    onChange={() => toggleSection(idx)}
                    className="h-4 w-4 cursor-pointer rounded border-[#d7d0c1] accent-[#171d13]"
                  />
                  <span className="select-none">Visible</span>
                </label>
              </li>
            );
          })}
        </ul>
      </AdminPanel>

      <p className="mt-6 text-xs text-[#8a8f7f]">
        Tip: Use the admin{" "}
        <a
          href="/preview/site"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4 hover:text-[#27311f]"
        >
          Preview site
        </a>{" "}
        to see layout changes before saving.
      </p>
    </div>
  );
}
