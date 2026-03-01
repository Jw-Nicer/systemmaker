"use client";

import { useState } from "react";
import type { IndustryPage } from "@/types/industry-page";
import {
  createIndustryPage,
  updateIndustryPage,
  deleteIndustryPage,
  toggleIndustryPagePublished,
} from "@/lib/actions/industry-pages";

type FormData = {
  slug: string;
  industry_name: string;
  hero_headline: string;
  hero_subheadline: string;
  pain_points: string[];
  cta_primary_text: string;
  cta_secondary_text: string;
  meta_title: string;
  meta_description: string;
  is_published: boolean;
  sort_order: number;
};

const emptyForm: FormData = {
  slug: "",
  industry_name: "",
  hero_headline: "",
  hero_subheadline: "",
  pain_points: [""],
  cta_primary_text: "Book a Scoping Call",
  cta_secondary_text: "Get a Preview Plan",
  meta_title: "",
  meta_description: "",
  is_published: false,
  sort_order: 0,
};

function toSlug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function IndustryPagesManager({
  initialData,
}: {
  initialData: IndustryPage[];
}) {
  const [items, setItems] = useState<IndustryPage[]>(initialData);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, sort_order: items.length });
    setShowForm(true);
    setError("");
  }

  function openEdit(item: IndustryPage) {
    setEditingId(item.id);
    setForm({
      slug: item.slug,
      industry_name: item.industry_name,
      hero_headline: item.hero_headline,
      hero_subheadline: item.hero_subheadline,
      pain_points: item.pain_points.length ? item.pain_points : [""],
      cta_primary_text: item.cta_primary_text,
      cta_secondary_text: item.cta_secondary_text,
      meta_title: item.meta_title,
      meta_description: item.meta_description,
      is_published: item.is_published,
      sort_order: item.sort_order,
    });
    setShowForm(true);
    setError("");
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setError("");
  }

  function updateField(field: keyof FormData, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updatePainPoint(idx: number, value: string) {
    setForm((f) => {
      const points = [...f.pain_points];
      points[idx] = value;
      return { ...f, pain_points: points };
    });
  }

  function addPainPoint() {
    setForm((f) => ({ ...f, pain_points: [...f.pain_points, ""] }));
  }

  function removePainPoint(idx: number) {
    setForm((f) => ({
      ...f,
      pain_points: f.pain_points.filter((_, i) => i !== idx),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      ...form,
      pain_points: form.pain_points.filter(Boolean),
    };

    const result = editingId
      ? await updateIndustryPage(editingId, payload)
      : await createIndustryPage(payload);

    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "Something went wrong");
      return;
    }

    window.location.reload();
  }

  async function handleTogglePublished(item: IndustryPage) {
    const result = await toggleIndustryPagePublished(item.id, !item.is_published);
    if (result.success) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_published: !i.is_published } : i
        )
      );
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteIndustryPage(id);
    if (result.success) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      setDeleteConfirm(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Industry Pages</h1>
          <p className="text-muted text-sm">
            Create niche landing pages for specific industries.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium hover:opacity-90 transition-opacity"
          >
            + New Industry Page
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-8 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? "Edit Industry Page" : "New Industry Page"}
          </h2>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted mb-1">Industry Name</label>
                <input
                  type="text"
                  value={form.industry_name}
                  onChange={(e) => {
                    updateField("industry_name", e.target.value);
                    if (!editingId) {
                      updateField("slug", toSlug(e.target.value));
                      updateField("meta_title", `${e.target.value} Operations Automation | Nicer Systems`);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  placeholder="e.g. Logistics"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => updateField("slug", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted mb-1">Hero Headline</label>
              <input
                type="text"
                value={form.hero_headline}
                onChange={(e) => updateField("hero_headline", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                placeholder="Stop losing shipments to manual tracking."
                required
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-1">Hero Subheadline</label>
              <textarea
                value={form.hero_subheadline}
                onChange={(e) => updateField("hero_subheadline", e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-y"
                required
              />
            </div>

            {/* Pain Points */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-muted">Pain Points</label>
                <button
                  type="button"
                  onClick={addPainPoint}
                  className="text-xs text-primary hover:opacity-80"
                >
                  + Add Pain Point
                </button>
              </div>
              <div className="space-y-2">
                {form.pain_points.map((point, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={point}
                      onChange={(e) => updatePainPoint(idx, e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                      placeholder="Describe the bottleneck..."
                    />
                    {form.pain_points.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePainPoint(idx)}
                        className="px-2 py-2 text-red-400 hover:text-red-300 text-sm"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted mb-1">Primary CTA Text</label>
                <input
                  type="text"
                  value={form.cta_primary_text}
                  onChange={(e) => updateField("cta_primary_text", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Secondary CTA Text</label>
                <input
                  type="text"
                  value={form.cta_secondary_text}
                  onChange={(e) => updateField("cta_secondary_text", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted mb-1">Meta Title</label>
              <input
                type="text"
                value={form.meta_title}
                onChange={(e) => updateField("meta_title", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-1">Meta Description</label>
              <textarea
                value={form.meta_description}
                onChange={(e) => updateField("meta_description", e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-y"
                required
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => updateField("is_published", e.target.checked)}
                  className="rounded"
                />
                Published
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="px-4 py-2 rounded-lg border border-border text-sm text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-6 py-3 text-muted font-medium">Industry</th>
              <th className="px-6 py-3 text-muted font-medium">Slug</th>
              <th className="px-6 py-3 text-muted font-medium">Status</th>
              <th className="px-6 py-3 text-muted font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-muted">
                  No industry pages yet. Create your first one.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border last:border-b-0 hover:bg-surface-light/50"
                >
                  <td className="px-6 py-3 font-medium">{item.industry_name}</td>
                  <td className="px-6 py-3 text-muted">/industries/{item.slug}</td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => handleTogglePublished(item)}
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.is_published
                          ? "bg-green-500/10 text-green-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}
                    >
                      {item.is_published ? "Published" : "Draft"}
                    </button>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(item)}
                        className="text-xs text-muted hover:text-foreground transition-colors"
                      >
                        Edit
                      </button>
                      {deleteConfirm === item.id ? (
                        <span className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-xs text-muted hover:text-foreground"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(item.id)}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
