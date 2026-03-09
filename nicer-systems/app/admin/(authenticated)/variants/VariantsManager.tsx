"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { LandingVariant, LandingVariantSections } from "@/types/variant";
import {
  createVariant,
  deleteVariant,
  reorderVariants,
  toggleVariantPublished,
  updateVariant,
  bulkTogglePublished,
} from "@/lib/actions/variants";
import { normalizeVariantSections } from "@/lib/marketing/variant-content";
import { AdminPageHeader, AdminPanel } from "@/components/admin/AdminPrimitives";
import { type FormData, emptyForm, type VariantAnalytics } from "./utils";
import VariantForm from "./components/VariantForm";
import VariantListCard from "./components/VariantListCard";
import VariantListToolbar, { type StatusFilter } from "./components/VariantListToolbar";

export default function VariantsManager({
  initialData,
  analytics,
}: {
  initialData: LandingVariant[];
  analytics: Record<string, VariantAnalytics>;
}) {
  const router = useRouter();
  const [items, setItems] = useState<LandingVariant[]>(initialData);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [initialFormSnapshot, setInitialFormSnapshot] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  // Search, filter, selection state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    setItems(initialData);
  }, [initialData]);

  // Unsaved changes detection
  const hasUnsavedChanges = showForm && JSON.stringify(form) !== initialFormSnapshot;

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  // Filtering
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "published" && item.is_published) ||
      (statusFilter === "draft" && !item.is_published);
    return matchesSearch && matchesStatus;
  });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setInitialFormSnapshot(JSON.stringify(emptyForm));
    setShowForm(true);
    setError("");
  }

  function openEdit(item: LandingVariant) {
    setEditingId(item.id);
    const formData: FormData = {
      slug: item.slug,
      industry: item.industry,
      meta_title: item.meta_title,
      meta_description: item.meta_description,
      sections: normalizeVariantSections(item),
    };
    setForm(formData);
    setInitialFormSnapshot(JSON.stringify(formData));
    setShowForm(true);
    setError("");
  }

  function openDuplicate(item: LandingVariant) {
    setEditingId(null);
    const formData: FormData = {
      slug: `${item.slug}-copy`,
      industry: `${item.industry} (Copy)`,
      meta_title: item.meta_title,
      meta_description: item.meta_description,
      sections: normalizeVariantSections(item),
    };
    setForm(formData);
    setInitialFormSnapshot(JSON.stringify(emptyForm)); // Mark as dirty immediately
    setShowForm(true);
    setError("");
  }

  function cancelForm() {
    if (hasUnsavedChanges && !window.confirm("You have unsaved changes. Discard them?")) {
      return;
    }
    setShowForm(false);
    setEditingId(null);
    setError("");
  }

  const updateField = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const updateSection = useCallback(
    <K extends keyof LandingVariantSections>(section: K, value: LandingVariantSections[K]) => {
      setForm((current) => ({
        ...current,
        sections: { ...current.sections, [section]: value },
      }));
    },
    []
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      slug: form.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      industry: form.industry,
      headline: form.sections.hero.headline,
      subheadline: form.sections.hero.subheadline,
      cta_text: form.sections.hero.cta_text,
      meta_title: form.meta_title || `${form.industry} Automation — Nicer Systems`,
      meta_description: form.meta_description || form.sections.hero.subheadline,
      featured_industries: form.sections.proof.featured_industries,
      sections: form.sections,
    };

    let result;
    if (editingId) {
      result = await updateVariant(editingId, payload);
    } else {
      result = await createVariant(payload);
    }

    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "Failed to save variant");
      return;
    }

    if (editingId) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? { ...item, ...payload, sections: payload.sections }
            : item
        )
      );
    } else {
      router.refresh();
    }

    setShowForm(false);
    setEditingId(null);
  }

  async function handleToggle(id: string, published: boolean) {
    setError("");
    const result = await toggleVariantPublished(id, !published);
    if (!result.success) {
      setError(result.error ?? "Failed to update variant");
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, is_published: !published } : item
      )
    );
  }

  async function handleDelete(id: string) {
    setError("");
    const result = await deleteVariant(id);
    if (!result.success) {
      setError(result.error ?? "Failed to delete variant");
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
    setDeleteConfirm(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function moveItem(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(targetIndex, 0, item);

    setItems(next);
    const result = await reorderVariants(next.map((v) => v.id));
    if (!result.success) {
      setItems(items);
      setError(result.error ?? "Failed to reorder variants");
    }
  }

  async function handleCopyLink(slug: string) {
    const variantUrl = origin ? `${origin}/${slug}` : `/${slug}`;
    try {
      await navigator.clipboard.writeText(variantUrl);
    } catch {
      const input = document.createElement("input");
      input.value = variantUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopiedLink(slug);
    window.setTimeout(() => {
      setCopiedLink((current) => (current === slug ? null : current));
    }, 2000);
  }

  // Selection handlers
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(filteredItems.map((item) => item.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleBulkPublish() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setError("");
    const result = await bulkTogglePublished(ids, true);
    if (!result.success) {
      setError(result.error ?? "Failed to publish variants");
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        selectedIds.has(item.id) ? { ...item, is_published: true } : item
      )
    );
    clearSelection();
  }

  async function handleBulkUnpublish() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setError("");
    const result = await bulkTogglePublished(ids, false);
    if (!result.success) {
      setError(result.error ?? "Failed to unpublish variants");
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        selectedIds.has(item.id) ? { ...item, is_published: false } : item
      )
    );
    clearSelection();
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="Growth"
        title="Industry Landing Variants"
        description="Manage full section-level configuration for industry landing pages. Published variants render at /{slug} with shared layout and variant-specific section copy."
        actions={
          !showForm ? (
            <button
              onClick={openCreate}
              className="rounded-full bg-[#171d13] px-5 py-3 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02]"
            >
              New Variant
            </button>
          ) : null
        }
      />

      {error && !showForm && (
        <div className="mt-4 rounded-[18px] border border-red-200 bg-[#fff4f2] p-3 text-sm text-[#9d3f3f]">
          {error}
        </div>
      )}

      {showForm && (
        <VariantForm
          form={form}
          editingId={editingId}
          saving={saving}
          error={error}
          hasUnsavedChanges={hasUnsavedChanges}
          onUpdateField={updateField}
          onUpdateSection={updateSection}
          onSubmit={handleSubmit}
          onCancel={cancelForm}
        />
      )}

      <VariantListToolbar
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        totalCount={items.length}
        filteredCount={filteredItems.length}
        selectedCount={selectedIds.size}
        onSearchChange={setSearchQuery}
        onStatusFilterChange={setStatusFilter}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onBulkPublish={handleBulkPublish}
        onBulkUnpublish={handleBulkUnpublish}
      />

      {filteredItems.length === 0 ? (
        <AdminPanel className="mt-4 text-sm text-[#6c7467]">
          {items.length === 0
            ? "No variants yet. Create one to add an industry landing page with tailored section copy."
            : "No variants match your search or filter."}
        </AdminPanel>
      ) : (
        <div className="mt-4 space-y-3">
          {filteredItems.map((item, index) => (
            <VariantListCard
              key={item.id}
              item={item}
              index={index}
              totalCount={filteredItems.length}
              origin={origin}
              copiedLink={copiedLink}
              deleteConfirm={deleteConfirm}
              selected={selectedIds.has(item.id)}
              analytics={analytics[item.slug]}
              onEdit={openEdit}
              onDuplicate={openDuplicate}
              onDelete={handleDelete}
              onDeleteConfirm={setDeleteConfirm}
              onToggle={handleToggle}
              onMove={moveItem}
              onCopyLink={handleCopyLink}
              onSelect={toggleSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
