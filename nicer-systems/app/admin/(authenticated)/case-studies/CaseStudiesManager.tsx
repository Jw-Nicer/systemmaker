"use client";

import { useState, useRef } from "react";
import type { CaseStudy } from "@/types/case-study";
import {
  createCaseStudy,
  updateCaseStudy,
  deleteCaseStudy,
  toggleCaseStudyPublished,
  reorderCaseStudies,
} from "@/lib/actions/case-studies";

type FormData = {
  title: string;
  slug: string;
  client_name: string;
  industry: string;
  tools: string;
  challenge: string;
  solution: string;
  metrics: { label: string; before: string; after: string }[];
  thumbnail_url: string;
  is_published: boolean;
  sort_order: number;
};

const emptyForm: FormData = {
  title: "",
  slug: "",
  client_name: "",
  industry: "",
  tools: "",
  challenge: "",
  solution: "",
  metrics: [{ label: "", before: "", after: "" }],
  thumbnail_url: "",
  is_published: false,
  sort_order: 0,
};

function toSlug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function CaseStudiesManager({
  initialData,
}: {
  initialData: CaseStudy[];
}) {
  const [items, setItems] = useState<CaseStudy[]>(initialData);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, sort_order: items.length });
    setShowForm(true);
    setError("");
  }

  function openEdit(item: CaseStudy) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      slug: item.slug,
      client_name: item.client_name,
      industry: item.industry,
      tools: item.tools.join(", "),
      challenge: item.challenge,
      solution: item.solution,
      metrics: item.metrics.length
        ? item.metrics
        : [{ label: "", before: "", after: "" }],
      thumbnail_url: item.thumbnail_url,
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

  function updateMetric(
    idx: number,
    field: "label" | "before" | "after",
    value: string
  ) {
    setForm((f) => {
      const metrics = [...f.metrics];
      metrics[idx] = { ...metrics[idx], [field]: value };
      return { ...f, metrics };
    });
  }

  function addMetric() {
    setForm((f) => ({
      ...f,
      metrics: [...f.metrics, { label: "", before: "", after: "" }],
    }));
  }

  function removeMetric(idx: number) {
    setForm((f) => ({
      ...f,
      metrics: f.metrics.filter((_, i) => i !== idx),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      ...form,
      tools: form.tools
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      metrics: form.metrics.filter((m) => m.label || m.before || m.after),
    };

    const result = editingId
      ? await updateCaseStudy(editingId, payload)
      : await createCaseStudy(payload);

    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "Something went wrong");
      return;
    }

    // Refresh — re-fetch by reloading
    window.location.reload();
  }

  async function handleTogglePublished(item: CaseStudy) {
    const result = await toggleCaseStudyPublished(item.id, !item.is_published);
    if (result.success) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_published: !i.is_published } : i
        )
      );
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteCaseStudy(id);
    if (result.success) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      setDeleteConfirm(null);
    }
  }

  function handleDragStart(index: number) {
    dragItem.current = index;
  }

  function handleDragEnter(index: number) {
    dragOverItem.current = index;
  }

  async function handleDragEnd() {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;

    const reordered = [...items];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, removed);

    setItems(reordered);
    dragItem.current = null;
    dragOverItem.current = null;

    await reorderCaseStudies(reordered.map((i) => i.id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Case Studies</h1>
          <p className="text-muted text-sm">
            Create and manage your proof of work.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium hover:opacity-90 transition-opacity"
          >
            + New Case Study
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-8 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? "Edit Case Study" : "New Case Study"}
          </h2>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => {
                    updateField("title", e.target.value);
                    if (!editingId) updateField("slug", toSlug(e.target.value));
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
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
              <div>
                <label className="block text-sm text-muted mb-1">
                  Client Name
                </label>
                <input
                  type="text"
                  value={form.client_name}
                  onChange={(e) => updateField("client_name", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">
                  Industry
                </label>
                <input
                  type="text"
                  value={form.industry}
                  onChange={(e) => updateField("industry", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted mb-1">
                Tools (comma-separated)
              </label>
              <input
                type="text"
                value={form.tools}
                onChange={(e) => updateField("tools", e.target.value)}
                placeholder="Zapier, Google Sheets, Slack"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-1">Challenge</label>
              <textarea
                value={form.challenge}
                onChange={(e) => updateField("challenge", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-y"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-1">Solution</label>
              <textarea
                value={form.solution}
                onChange={(e) => updateField("solution", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-y"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-1">
                Thumbnail URL
              </label>
              <input
                type="text"
                value={form.thumbnail_url}
                onChange={(e) => updateField("thumbnail_url", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>

            {/* Metrics */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-muted">Metrics</label>
                <button
                  type="button"
                  onClick={addMetric}
                  className="text-xs text-primary hover:opacity-80"
                >
                  + Add Metric
                </button>
              </div>
              <div className="space-y-2">
                {form.metrics.map((m, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <input
                      type="text"
                      value={m.label}
                      onChange={(e) => updateMetric(idx, "label", e.target.value)}
                      placeholder="Label"
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                    />
                    <input
                      type="text"
                      value={m.before}
                      onChange={(e) =>
                        updateMetric(idx, "before", e.target.value)
                      }
                      placeholder="Before"
                      className="w-28 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                    />
                    <input
                      type="text"
                      value={m.after}
                      onChange={(e) => updateMetric(idx, "after", e.target.value)}
                      placeholder="After"
                      className="w-28 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                    />
                    {form.metrics.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMetric(idx)}
                        className="px-2 py-2 text-red-400 hover:text-red-300 text-sm"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>
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
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Case Study"
                    : "Create Case Study"}
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
              <th className="px-6 py-3 text-muted font-medium w-8"></th>
              <th className="px-6 py-3 text-muted font-medium">Title</th>
              <th className="px-6 py-3 text-muted font-medium">Industry</th>
              <th className="px-6 py-3 text-muted font-medium">Status</th>
              <th className="px-6 py-3 text-muted font-medium text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted">
                  No case studies yet. Create your first one to get started.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragEnter={() => handleDragEnter(idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-b border-border last:border-b-0 hover:bg-surface-light/50 cursor-grab active:cursor-grabbing"
                >
                  <td className="px-6 py-3 text-muted">⠿</td>
                  <td className="px-6 py-3 font-medium">{item.title}</td>
                  <td className="px-6 py-3 text-muted">{item.industry}</td>
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
