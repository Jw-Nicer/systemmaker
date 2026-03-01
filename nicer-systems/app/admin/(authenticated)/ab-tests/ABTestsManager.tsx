"use client";

import { useState, useEffect, useCallback } from "react";
import type { ABTest, ABTestVariant } from "@/types/ab-test";
import {
  createABTest,
  updateABTest,
  deleteABTest,
  toggleABTestActive,
  getTestResults,
} from "@/lib/actions/ab-tests";

type VariantForm = {
  id: string;
  name: string;
  headline: string;
  subheadline: string;
  cta_text: string;
  weight: number;
};

type FormData = {
  name: string;
  target_page: string;
  element: string;
  variants: VariantForm[];
  is_active: boolean;
};

function newVariant(): VariantForm {
  return {
    id: crypto.randomUUID().slice(0, 8),
    name: "",
    headline: "",
    subheadline: "",
    cta_text: "",
    weight: 50,
  };
}

const emptyForm: FormData = {
  name: "",
  target_page: "landing",
  element: "hero",
  variants: [
    { ...newVariant(), name: "Control" },
    { ...newVariant(), name: "Variant B" },
  ],
  is_active: false,
};

type ResultsMap = Record<string, { id: string; name: string; impressions: number; conversions: number }[]>;

export default function ABTestsManager({
  initialData,
}: {
  initialData: ABTest[];
}) {
  const [items, setItems] = useState<ABTest[]>(initialData);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [results, setResults] = useState<ResultsMap>({});

  const loadResults = useCallback(async () => {
    for (const test of items) {
      const r = await getTestResults(test.id);
      setResults((prev) => ({ ...prev, [test.id]: r.variants }));
    }
  }, [items]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError("");
  }

  function openEdit(item: ABTest) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      target_page: item.target_page,
      element: item.element,
      variants: item.variants.map((v) => ({
        id: v.id,
        name: v.name,
        headline: v.headline,
        subheadline: v.subheadline,
        cta_text: v.cta_text,
        weight: v.weight,
      })),
      is_active: item.is_active,
    });
    setShowForm(true);
    setError("");
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setError("");
  }

  function updateVariant(idx: number, field: keyof VariantForm, value: string | number) {
    setForm((f) => {
      const variants = [...f.variants];
      variants[idx] = { ...variants[idx], [field]: value };
      return { ...f, variants };
    });
  }

  function addVariant() {
    setForm((f) => ({
      ...f,
      variants: [...f.variants, { ...newVariant(), name: `Variant ${String.fromCharCode(65 + f.variants.length)}` }],
    }));
  }

  function removeVariant(idx: number) {
    setForm((f) => ({
      ...f,
      variants: f.variants.filter((_, i) => i !== idx),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const result = editingId
      ? await updateABTest(editingId, form)
      : await createABTest(form);

    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "Something went wrong");
      return;
    }

    window.location.reload();
  }

  async function handleToggleActive(item: ABTest) {
    const result = await toggleABTestActive(item.id, !item.is_active);
    if (result.success) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_active: !i.is_active } : i
        )
      );
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteABTest(id);
    if (result.success) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      setDeleteConfirm(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">A/B Tests</h1>
          <p className="text-muted text-sm">
            Test hero copy and CTA variations to optimize conversions.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium hover:opacity-90 transition-opacity"
          >
            + New Test
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-8 rounded-xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? "Edit A/B Test" : "New A/B Test"}
          </h2>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-muted mb-1">Test Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  placeholder="e.g. Hero headline test"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Target Page</label>
                <input
                  type="text"
                  value={form.target_page}
                  onChange={(e) => setForm((f) => ({ ...f, target_page: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  placeholder="landing"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1">Element</label>
                <select
                  value={form.element}
                  onChange={(e) => setForm((f) => ({ ...f, element: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                >
                  <option value="hero">Hero</option>
                  <option value="cta">CTA</option>
                  <option value="pricing">Pricing</option>
                </select>
              </div>
            </div>

            {/* Variants */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-muted">Variants</label>
                <button
                  type="button"
                  onClick={addVariant}
                  className="text-xs text-primary hover:opacity-80"
                >
                  + Add Variant
                </button>
              </div>
              <div className="space-y-3">
                {form.variants.map((v, idx) => (
                  <div key={v.id} className="rounded-lg border border-border bg-background p-4">
                    <div className="flex justify-between items-center mb-3">
                      <input
                        type="text"
                        value={v.name}
                        onChange={(e) => updateVariant(idx, "name", e.target.value)}
                        className="px-2 py-1 rounded border border-border bg-surface text-sm font-medium"
                        placeholder="Variant name"
                      />
                      <div className="flex items-center gap-3">
                        <label className="text-xs text-muted">
                          Weight:
                          <input
                            type="number"
                            value={v.weight}
                            onChange={(e) => updateVariant(idx, "weight", Number(e.target.value))}
                            className="ml-1 w-16 px-2 py-1 rounded border border-border bg-surface text-sm"
                            min="0"
                            max="100"
                          />
                        </label>
                        {form.variants.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeVariant(idx)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={v.headline}
                        onChange={(e) => updateVariant(idx, "headline", e.target.value)}
                        placeholder="Headline override"
                        className="px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm"
                      />
                      <input
                        type="text"
                        value={v.subheadline}
                        onChange={(e) => updateVariant(idx, "subheadline", e.target.value)}
                        placeholder="Subheadline override"
                        className="px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm"
                      />
                      <input
                        type="text"
                        value={v.cta_text}
                        onChange={(e) => updateVariant(idx, "cta_text", e.target.value)}
                        placeholder="CTA text override"
                        className="px-3 py-2 rounded-lg border border-border bg-surface text-foreground text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="rounded"
                />
                Active
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-primary text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? "Saving..." : editingId ? "Update Test" : "Create Test"}
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
      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-12 text-center text-muted">
            No A/B tests yet. Create your first one.
          </div>
        ) : (
          items.map((test) => (
            <div key={test.id} className="rounded-xl border border-border bg-surface p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">{test.name}</h3>
                  <p className="text-xs text-muted">
                    {test.target_page} / {test.element} &middot; {test.variants.length} variants
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleActive(test)}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      test.is_active
                        ? "bg-green-500/10 text-green-400"
                        : "bg-yellow-500/10 text-yellow-400"
                    }`}
                  >
                    {test.is_active ? "Active" : "Paused"}
                  </button>
                  <button
                    onClick={() => openEdit(test)}
                    className="text-xs text-muted hover:text-foreground transition-colors"
                  >
                    Edit
                  </button>
                  {deleteConfirm === test.id ? (
                    <span className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(test.id)}
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
                      onClick={() => setDeleteConfirm(test.id)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Results */}
              {results[test.id] && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {results[test.id].map((v) => {
                    const rate = v.impressions > 0 ? ((v.conversions / v.impressions) * 100).toFixed(1) : "0.0";
                    return (
                      <div key={v.id} className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs text-muted mb-1">{v.name}</p>
                        <p className="text-lg font-bold text-primary">{rate}%</p>
                        <p className="text-xs text-muted">
                          {v.conversions} / {v.impressions} impressions
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
