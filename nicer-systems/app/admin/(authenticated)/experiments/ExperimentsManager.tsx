"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Experiment, ExperimentVariant } from "@/types/experiment";
import {
  createExperiment,
  startExperiment,
  completeExperiment,
  deleteExperiment,
} from "@/lib/actions/experiments";

const TARGET_OPTIONS = [
  { value: "hero_headline", label: "Hero Headline" },
  { value: "hero_cta", label: "Hero CTA Button" },
  { value: "final_cta", label: "Final CTA Button" },
];

const statusColors: Record<string, string> = {
  draft: "bg-gray-500/20 text-gray-400",
  running: "bg-green-500/20 text-green-300",
  completed: "bg-blue-500/20 text-blue-300",
};

export default function ExperimentsManager({
  initialData,
}: {
  initialData: Experiment[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<Experiment[]>(initialData);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("hero_headline");
  const [variants, setVariants] = useState<ExperimentVariant[]>([
    { key: "control", label: "Control", value: "", weight: 50 },
    { key: "variant_a", label: "Variant A", value: "", weight: 50 },
  ]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [winnerSelect, setWinnerSelect] = useState<string | null>(null);

  function updateVariant(index: number, field: keyof ExperimentVariant, value: string | number) {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    if (totalWeight !== 100) {
      setError(`Variant weights must sum to 100 (currently ${totalWeight})`);
      setSaving(false);
      return;
    }

    try {
      await createExperiment({ name, target, variants });
      setShowForm(false);
      setName("");
      setTarget("hero_headline");
      setVariants([
        { key: "control", label: "Control", value: "", weight: 50 },
        { key: "variant_a", label: "Variant A", value: "", weight: 50 },
      ]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create experiment");
    } finally {
      setSaving(false);
    }
  }

  async function handleStart(id: string) {
    try {
      await startExperiment(id);
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: "running" as const } : i))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
    }
  }

  async function handleComplete(id: string, winner: string) {
    try {
      await completeExperiment(id, winner);
      setItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, status: "completed" as const, winner } : i
        )
      );
      setWinnerSelect(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete experiment");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteExperiment(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete experiment");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">A/B Experiments</h1>
          <p className="text-sm text-muted mt-1">
            Test different copy and CTAs to optimize conversions.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2.5 rounded-lg bg-primary text-background text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          + New Experiment
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-500/40 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-8 p-6 rounded-xl border border-border bg-surface space-y-4"
        >
          <h2 className="font-semibold">New Experiment</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-background border border-border focus:border-primary focus:outline-none text-sm"
                placeholder="e.g. Hero headline test Q1"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Target *</label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-background border border-border focus:border-primary focus:outline-none text-sm"
              >
                {TARGET_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2">Variants</label>
            <div className="space-y-3">
              {variants.map((v, i) => (
                <div key={i} className="grid grid-cols-[1fr_2fr_80px] gap-3">
                  <input
                    value={v.label}
                    onChange={(e) => updateVariant(i, "label", e.target.value)}
                    className="px-3 py-2 rounded-lg bg-background border border-border text-sm"
                    placeholder="Label"
                  />
                  <input
                    value={v.value}
                    onChange={(e) => updateVariant(i, "value", e.target.value)}
                    className="px-3 py-2 rounded-lg bg-background border border-border text-sm"
                    placeholder="Content value"
                  />
                  <input
                    type="number"
                    value={v.weight}
                    onChange={(e) => updateVariant(i, "weight", parseInt(e.target.value) || 0)}
                    className="px-3 py-2 rounded-lg bg-background border border-border text-sm"
                    placeholder="Weight"
                    min={0}
                    max={100}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-primary text-background text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Experiment"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 rounded-lg border border-border text-sm hover:bg-surface-light transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {items.length === 0 ? (
        <p className="text-sm text-muted">No experiments yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl border border-border bg-surface"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{item.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[item.status]}`}>
                    {item.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {item.status === "draft" && (
                    <button
                      onClick={() => handleStart(item.id)}
                      className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-300 text-xs hover:bg-green-500/30 transition-colors"
                    >
                      Start
                    </button>
                  )}
                  {item.status === "running" && (
                    winnerSelect === item.id ? (
                      <div className="flex gap-1">
                        {item.variants.map((v) => (
                          <button
                            key={v.key}
                            onClick={() => handleComplete(item.id, v.key)}
                            className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 text-xs"
                          >
                            {v.label} wins
                          </button>
                        ))}
                        <button
                          onClick={() => setWinnerSelect(null)}
                          className="px-3 py-1.5 rounded-lg border border-border text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setWinnerSelect(item.id)}
                        className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 text-xs"
                      >
                        End & Pick Winner
                      </button>
                    )
                  )}
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

              <p className="text-xs text-muted mb-2">
                Target: {TARGET_OPTIONS.find((t) => t.value === item.target)?.label || item.target}
                {item.winner && (
                  <span className="ml-2 text-primary">
                    Winner: {item.variants.find((v) => v.key === item.winner)?.label}
                  </span>
                )}
              </p>

              <div className="flex gap-2">
                {item.variants.map((v) => (
                  <div
                    key={v.key}
                    className={`text-xs px-3 py-1.5 rounded-lg border ${
                      item.winner === v.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted"
                    }`}
                  >
                    {v.label}: &quot;{v.value}&quot; ({v.weight}%)
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
