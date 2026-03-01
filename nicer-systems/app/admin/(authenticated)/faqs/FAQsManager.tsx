"use client";

import { useState, useRef } from "react";
import type { FAQ } from "@/types/faq";
import {
  createFAQ,
  updateFAQ,
  deleteFAQ,
  toggleFAQPublished,
  reorderFAQs,
} from "@/lib/actions/faqs";

type FormData = {
  question: string;
  answer: string;
  is_published: boolean;
  sort_order: number;
};

const emptyForm: FormData = {
  question: "",
  answer: "",
  is_published: false,
  sort_order: 0,
};

export default function FAQsManager({
  initialData,
}: {
  initialData: FAQ[];
}) {
  const [items, setItems] = useState<FAQ[]>(initialData);
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

  function openEdit(item: FAQ) {
    setEditingId(item.id);
    setForm({
      question: item.question,
      answer: item.answer,
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const result = editingId
      ? await updateFAQ(editingId, form)
      : await createFAQ(form);

    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "Something went wrong");
      return;
    }

    window.location.reload();
  }

  async function handleTogglePublished(item: FAQ) {
    const result = await toggleFAQPublished(item.id, !item.is_published);
    if (result.success) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_published: !i.is_published } : i
        )
      );
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteFAQ(id);
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

    await reorderFAQs(reordered.map((i) => i.id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">FAQs</h1>
          <p className="text-muted text-sm">
            Manage frequently asked questions.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium hover:opacity-90 transition-opacity"
          >
            + New FAQ
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-8 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? "Edit FAQ" : "New FAQ"}
          </h2>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1">Question</label>
              <input
                type="text"
                value={form.question}
                onChange={(e) => updateField("question", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-1">Answer</label>
              <textarea
                value={form.answer}
                onChange={(e) => updateField("answer", e.target.value)}
                rows={4}
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
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update FAQ"
                    : "Create FAQ"}
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
              <th className="px-6 py-3 text-muted font-medium">Question</th>
              <th className="px-6 py-3 text-muted font-medium">Status</th>
              <th className="px-6 py-3 text-muted font-medium text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-muted">
                  No FAQs yet. Create your first one to get started.
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
                  <td className="px-6 py-3">
                    <p className="font-medium">{item.question}</p>
                    <p className="text-xs text-muted mt-0.5 line-clamp-1">
                      {item.answer}
                    </p>
                  </td>
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
