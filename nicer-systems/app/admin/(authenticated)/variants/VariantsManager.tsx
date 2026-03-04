"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LandingVariant } from "@/types/variant";
import {
  createVariant,
  updateVariant,
  deleteVariant,
  toggleVariantPublished,
} from "@/lib/actions/variants";

type FormData = {
  slug: string;
  industry: string;
  headline: string;
  subheadline: string;
  cta_text: string;
  meta_title: string;
  meta_description: string;
  featured_industries: string;
};

const emptyForm: FormData = {
  slug: "",
  industry: "",
  headline: "",
  subheadline: "",
  cta_text: "Book a Scoping Call",
  meta_title: "",
  meta_description: "",
  featured_industries: "",
};

export default function VariantsManager({
  initialData,
}: {
  initialData: LandingVariant[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<LandingVariant[]>(initialData);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError("");
  }

  function openEdit(item: LandingVariant) {
    setEditingId(item.id);
    setForm({
      slug: item.slug,
      industry: item.industry,
      headline: item.headline,
      subheadline: item.subheadline,
      cta_text: item.cta_text,
      meta_title: item.meta_title,
      meta_description: item.meta_description,
      featured_industries: item.featured_industries.join(", "),
    });
    setShowForm(true);
    setError("");
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setError("");
  }

  function updateField(field: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      slug: form.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      industry: form.industry,
      headline: form.headline,
      subheadline: form.subheadline,
      cta_text: form.cta_text,
      meta_title: form.meta_title || `${form.industry} Automation — Nicer Systems`,
      meta_description: form.meta_description || form.subheadline,
      featured_industries: form.featured_industries
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    try {
      if (editingId) {
        await updateVariant(editingId, payload);
        setItems((prev) =>
          prev.map((i) => (i.id === editingId ? { ...i, ...payload } : i))
        );
      } else {
        await createVariant(payload);
        router.refresh();
      }
      setShowForm(false);
      setEditingId(null);
    } catch {
      setError("Failed to save variant");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string, published: boolean) {
    await toggleVariantPublished(id, !published);
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, is_published: !published } : i))
    );
  }

  async function handleDelete(id: string) {
    await deleteVariant(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDeleteConfirm(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Landing Variants</h1>
          <p className="text-sm text-muted mt-1">
            Industry-specific landing pages with tailored copy.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2.5 rounded-lg bg-primary text-background text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          + New Variant
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 p-6 rounded-xl border border-border bg-surface space-y-4"
        >
          <h2 className="font-semibold">
            {editingId ? "Edit Variant" : "New Variant"}
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Industry Name *</label>
              <input
                value={form.industry}
                onChange={(e) => updateField("industry", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-background border border-border focus:border-primary focus:outline-none text-sm"
                placeholder="e.g. Healthcare"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">URL Slug *</label>
              <input
                value={form.slug}
                onChange={(e) => updateField("slug", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-background border border-border focus:border-primary focus:outline-none text-sm"
                placeholder="e.g. healthcare"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Headline *</label>
            <input
              value={form.headline}
              onChange={(e) => updateField("headline", e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-background border border-border focus:border-primary focus:outline-none text-sm"
              placeholder="e.g. Automate your healthcare admin"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Subheadline *</label>
            <textarea
              value={form.subheadline}
              onChange={(e) => updateField("subheadline", e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg bg-background border border-border focus:border-primary focus:outline-none text-sm resize-none"
              placeholder="Supporting text below the headline"
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">CTA Button Text</label>
              <input
                value={form.cta_text}
                onChange={(e) => updateField("cta_text", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-background border border-border focus:border-primary focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">
                Featured Industries (comma-separated)
              </label>
              <input
                value={form.featured_industries}
                onChange={(e) => updateField("featured_industries", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-background border border-border focus:border-primary focus:outline-none text-sm"
                placeholder="e.g. Healthcare, Medical Devices"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Meta Title</label>
              <input
                value={form.meta_title}
                onChange={(e) => updateField("meta_title", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-background border border-border focus:border-primary focus:outline-none text-sm"
                placeholder="Auto-generated if empty"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Meta Description</label>
              <input
                value={form.meta_description}
                onChange={(e) => updateField("meta_description", e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-background border border-border focus:border-primary focus:outline-none text-sm"
                placeholder="Uses subheadline if empty"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-primary text-background text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving..." : editingId ? "Update" : "Create"}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="px-5 py-2.5 rounded-lg border border-border text-sm hover:bg-surface-light transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {items.length === 0 ? (
        <p className="text-sm text-muted">
          No variants yet. Create one to add an industry-specific landing page.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{item.industry}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      item.is_published
                        ? "bg-green-500/20 text-green-300"
                        : "bg-gray-500/20 text-gray-400"
                    }`}
                  >
                    {item.is_published ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="text-sm text-muted truncate mt-0.5">
                  /{item.slug} — {item.headline}
                </p>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleToggle(item.id, item.is_published)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-surface-light transition-colors"
                >
                  {item.is_published ? "Unpublish" : "Publish"}
                </button>
                <button
                  onClick={() => openEdit(item)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-surface-light transition-colors"
                >
                  Edit
                </button>
                {deleteConfirm === item.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-xs"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(item.id)}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
