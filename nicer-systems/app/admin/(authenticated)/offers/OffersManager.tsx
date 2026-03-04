"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Offer } from "@/types/offer";
import {
  createOffer,
  updateOffer,
  deleteOffer,
  toggleOfferPublished,
  reorderOffers,
} from "@/lib/actions/offers";

type FormData = {
  name: string;
  price: string;
  description: string;
  features: string;
  cta: string;
  highlighted: boolean;
  is_published: boolean;
  sort_order: number;
};

const emptyForm: FormData = {
  name: "",
  price: "",
  description: "",
  features: "",
  cta: "Book a Scoping Call",
  highlighted: false,
  is_published: false,
  sort_order: 0,
};

export default function OffersManager({
  initialData,
}: {
  initialData: Offer[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<Offer[]>(initialData);
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

  function openEdit(item: Offer) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      price: item.price,
      description: item.description,
      features: item.features.join("\n"),
      cta: item.cta,
      highlighted: item.highlighted,
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

    const payload = {
      ...form,
      features: form.features
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
    };

    const result = editingId
      ? await updateOffer(editingId, payload)
      : await createOffer(payload);

    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "Something went wrong");
      return;
    }

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    router.refresh();
  }

  async function handleTogglePublished(item: Offer) {
    const result = await toggleOfferPublished(item.id, !item.is_published);
    if (result.success) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_published: !i.is_published } : i
        )
      );
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteOffer(id);
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

    const previous = [...items];
    const reordered = [...items];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, removed);

    setItems(reordered);
    dragItem.current = null;
    dragOverItem.current = null;

    try {
      await reorderOffers(reordered.map((i) => i.id));
    } catch {
      setItems(previous);
      setError("Failed to reorder. Changes reverted.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Offers</h1>
          <p className="text-muted text-sm">
            Manage pricing tiers and offers.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium hover:opacity-90 transition-opacity"
          >
            + New Offer
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-8 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? "Edit Offer" : "New Offer"}
          </h2>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="e.g. Starter"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Price</label>
                <input
                  type="text"
                  value={form.price}
                  onChange={(e) => updateField("price", e.target.value)}
                  placeholder="e.g. One workflow"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted mb-1">
                Description
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-1">
                Features (one per line)
              </label>
              <textarea
                value={form.features}
                onChange={(e) => updateField("features", e.target.value)}
                rows={5}
                placeholder={"End-to-end process map\nSystem of record setup\nBasic live dashboard"}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-y"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted mb-1">
                  CTA Text
                </label>
                <input
                  type="text"
                  value={form.cta}
                  onChange={(e) => updateField("cta", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.highlighted}
                  onChange={(e) => updateField("highlighted", e.target.checked)}
                  className="rounded"
                />
                Highlighted tier
              </label>
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
                    ? "Update Offer"
                    : "Create Offer"}
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
              <th className="px-6 py-3 text-muted font-medium">Name</th>
              <th className="px-6 py-3 text-muted font-medium">Price</th>
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
                  No offers yet. Create your first pricing tier.
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
                    <span className="font-medium">{item.name}</span>
                    {item.highlighted && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        Featured
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-muted">{item.price}</td>
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
