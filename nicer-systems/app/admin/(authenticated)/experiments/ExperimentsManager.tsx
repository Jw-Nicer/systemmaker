"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Experiment, ExperimentVariant } from "@/types/experiment";
import type { ExperimentExposureSummary } from "@/types/analytics";
import { getExperimentWinnerRecommendation } from "@/lib/experiments/recommendation";
import {
  completeExperiment,
  createExperiment,
  deleteExperiment,
  startExperiment,
  stopExperiment,
} from "@/lib/actions/experiments";
import {
  AdminPageHeader,
  AdminPanel,
  AdminPill,
} from "@/components/admin/AdminPrimitives";

const TARGET_OPTIONS = [
  { value: "hero_headline", label: "Homepage Hero Headline" },
  { value: "hero_cta", label: "Homepage Hero CTA" },
  { value: "final_cta", label: "Homepage Final CTA" },
];

export default function ExperimentsManager({
  initialData,
  metricsByExperiment,
}: {
  initialData: Experiment[];
  metricsByExperiment: Record<string, ExperimentExposureSummary>;
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

  useEffect(() => {
    setItems(initialData);
  }, [initialData]);

  function inputClassName() {
    return "w-full rounded-[18px] border border-[#d7d0c1] bg-[#fbf7ef] px-4 py-3 text-sm text-[#1d2318] outline-none transition-colors focus:border-[#92a07a]";
  }

  function statusTone(status: Experiment["status"]) {
    if (status === "running") return "green";
    if (status === "completed") return "blue";
    if (status === "stopped") return "yellow";
    return "neutral";
  }

  function formatLastSeen(value: string | null) {
    if (!value) return "No recent exposure";
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  function getRecommendationTone(confidence: "low" | "medium") {
    return confidence === "medium" ? "green" : "yellow";
  }

  function resetForm() {
    setName("");
    setTarget("hero_headline");
    setVariants([
      { key: "control", label: "Control", value: "", weight: 50 },
      { key: "variant_a", label: "Variant A", value: "", weight: 50 },
    ]);
  }

  function updateVariant(
    index: number,
    field: keyof ExperimentVariant,
    value: string | number
  ) {
    setVariants((prev) =>
      prev.map((variant, i) => (i === index ? { ...variant, [field]: value } : variant))
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const totalWeight = variants.reduce((sum, variant) => sum + variant.weight, 0);
    if (totalWeight !== 100) {
      setError(`Variant weights must sum to 100 (currently ${totalWeight}).`);
      setSaving(false);
      return;
    }

    const result = await createExperiment({ name, target, variants });
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? "Failed to create experiment");
      return;
    }
    setShowForm(false);
    resetForm();
    router.refresh();
  }

  async function handleStart(id: string) {
    const result = await startExperiment(id);
    if (!result.success) {
      setError(result.error ?? "Failed to start experiment");
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "running" as const } : item
      )
    );
  }

  async function handleComplete(id: string, winner: string) {
    const result = await completeExperiment(id, winner);
    if (!result.success) {
      setError(result.error ?? "Failed to complete experiment");
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: "completed" as const, winner }
          : item
      )
    );
    setWinnerSelect(null);
  }

  async function handleDelete(id: string) {
    const result = await deleteExperiment(id);
    if (!result.success) {
      setError(result.error ?? "Failed to delete experiment");
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
    setDeleteConfirm(null);
  }

  async function handleStop(id: string) {
    const result = await stopExperiment(id);
    if (!result.success) {
      setError(result.error ?? "Failed to stop experiment");
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: "stopped" as const, winner: undefined }
          : item
      )
    );
    setWinnerSelect(null);
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="Growth"
        title="Homepage A/B Experiments"
        description="Running experiments split live homepage traffic. Completing an experiment applies the selected winner until you start another test for that target."
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="rounded-full bg-[#171d13] px-5 py-3 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02]"
          >
            New Experiment
          </button>
        }
      />

      {error && (
        <div className="mt-6 rounded-[18px] border border-red-200 bg-[#fff4f2] p-3 text-sm text-[#9d3f3f]">
          {error}
        </div>
      )}

      {showForm && (
        <AdminPanel className="mt-8 mb-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#1d2318]">New Experiment</h2>
              <p className="mt-1 text-sm text-[#6c7467]">
                Running experiments affect live homepage traffic only while status is set to running.
              </p>
            </div>
            <AdminPill tone="blue">Homepage only</AdminPill>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-[#6c7467]">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClassName()}
                  placeholder="e.g. Hero headline test Q1"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#6c7467]">Target</label>
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className={inputClassName()}
                >
                  {TARGET_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-[#6c7467]">Variants</label>
              <div className="space-y-3">
                {variants.map((variant, index) => (
                  <div
                    key={variant.key}
                    className="grid gap-3 rounded-[18px] border border-[#ddd5c7] bg-white/70 p-3 md:grid-cols-[1fr_2fr_110px]"
                  >
                    <input
                      value={variant.label}
                      onChange={(e) => updateVariant(index, "label", e.target.value)}
                      className={inputClassName()}
                      placeholder="Label"
                    />
                    <input
                      value={variant.value}
                      onChange={(e) => updateVariant(index, "value", e.target.value)}
                      className={inputClassName()}
                      placeholder="Content value"
                    />
                    <input
                      type="number"
                      value={variant.weight}
                      onChange={(e) =>
                        updateVariant(index, "weight", parseInt(e.target.value, 10) || 0)
                      }
                      className={inputClassName()}
                      min={0}
                      max={100}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[#171d13] px-5 py-3 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02] disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Experiment"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                  setError("");
                }}
                className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-5 py-3 text-sm font-medium text-[#596351] transition-colors hover:bg-white"
              >
                Cancel
              </button>
            </div>
          </form>
        </AdminPanel>
      )}

      {items.length === 0 ? (
        <AdminPanel className="mt-8 text-sm text-[#6c7467]">
          No experiments yet. Create one to test a live homepage copy target.
        </AdminPanel>
      ) : (
        <div className="mt-8 space-y-3">
          {items.map((item) => (
            <AdminPanel key={item.id}>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  {(() => {
                    const metrics = metricsByExperiment[item.id];
                    const recommendation = getExperimentWinnerRecommendation(
                      metrics,
                      item.variants
                    );

                    return (
                      <>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-[#1d2318]">{item.name}</h3>
                    <AdminPill tone={statusTone(item.status)}>{item.status}</AdminPill>
                  </div>
                  <p className="mt-2 text-sm text-[#596351]">
                    Target: {TARGET_OPTIONS.find((option) => option.value === item.target)?.label || item.target}
                    {item.winner ? (
                      <span className="ml-2 text-[#4f6032]">
                        Winner: {item.variants.find((variant) => variant.key === item.winner)?.label}
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.variants.map((variant) => (
                      <div
                        key={variant.key}
                        className={`rounded-full border px-3 py-2 text-xs ${
                          item.winner === variant.key
                            ? "border-[#9bb286]/24 bg-[#e8eedf] text-[#4f6032]"
                            : "border-[#d5cdbd] bg-white/60 text-[#556052]"
                        }`}
                      >
                        {variant.label}: &quot;{variant.value}&quot; ({variant.weight}%)
                      </div>
                    ))}
                  </div>
                        <div className="mt-4 rounded-[18px] border border-[#ddd5c7] bg-white/55 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[#7e7b70]">
                              Exposure Last 30 Days
                            </p>
                            <AdminPill tone="blue">
                              {metrics?.exposures ?? 0} total
                            </AdminPill>
                          </div>
                          {metrics ? (
                            <>
                              <p className="mt-2 text-xs text-[#6c7467]">
                                Last seen {formatLastSeen(metrics.lastSeen)}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#596351]">
                                <span>{metrics.leads} leads</span>
                                <span>{metrics.bookings} booking clicks</span>
                                <span>{metrics.leadConversionRate}% lead rate</span>
                              </div>
                              <div className="mt-3 rounded-[16px] border border-[#ddd5c7] bg-[#f8f3ea] px-3 py-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#7e7b70]">
                                    Winner Guidance
                                  </p>
                                  {recommendation ? (
                                    <AdminPill tone={getRecommendationTone(recommendation.confidence)}>
                                      {recommendation.confidence === "medium" ? "Stronger signal" : "Early signal"}
                                    </AdminPill>
                                  ) : (
                                    <AdminPill tone="neutral">No signal yet</AdminPill>
                                  )}
                                </div>
                                <p className="mt-2 text-sm text-[#596351]">
                                  {recommendation
                                    ? `Recommend ${recommendation.variantLabel} based on ${
                                        recommendation.metric === "lead_rate" ? "lead rate" : "booking rate"
                                      }: ${recommendation.rate}% (${recommendation.conversions}/${recommendation.exposures}).`
                                    : "Need at least one attributed lead or booking click before recommending a winner."}
                                </p>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {metrics.variants.map((variant) => (
                                  <div
                                    key={variant.key}
                                    className="rounded-full border border-[#d5cdbd] bg-white/70 px-3 py-2 text-xs text-[#556052]"
                                  >
                                    {variant.label}: {variant.exposures} exp · {variant.leads} leads · {variant.bookings} books · {variant.leadConversionRate}% lead rate
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <p className="mt-2 text-sm text-[#6c7467]">
                              No experiment exposure events captured yet.
                            </p>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  {item.status === "draft" || item.status === "stopped" ? (
                    <button
                      onClick={() => handleStart(item.id)}
                      className="rounded-full bg-[#e8eedf] px-3 py-2 text-xs font-medium text-[#4f6032]"
                    >
                      {item.status === "stopped" ? "Restart" : "Start"}
                    </button>
                  ) : null}

                  {item.status === "running" ? (
                    winnerSelect === item.id ? (
                      <>
                        {item.variants.map((variant) => (
                          <button
                            key={variant.key}
                            onClick={() => handleComplete(item.id, variant.key)}
                            className="rounded-full bg-[#edf1fb] px-3 py-2 text-xs font-medium text-sky-700"
                          >
                            {variant.label} wins
                          </button>
                        ))}
                        <button
                          onClick={() => handleStop(item.id)}
                          className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-3 py-2 text-xs text-[#596351]"
                        >
                          Stop
                        </button>
                        <button
                          onClick={() => setWinnerSelect(null)}
                          className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-3 py-2 text-xs text-[#596351]"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setWinnerSelect(item.id)}
                        className="rounded-full bg-[#edf1fb] px-3 py-2 text-xs font-medium text-sky-700"
                      >
                        End & Apply Winner
                      </button>
                    )
                  ) : null}

                  {deleteConfirm === item.id ? (
                    <>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="rounded-full bg-[#8f3f3f] px-3 py-2 text-xs font-medium text-white"
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-3 py-2 text-xs text-[#596351]"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(item.id)}
                      className="rounded-full border border-[#e3d8cb] bg-[#fff7f4] px-3 py-2 text-xs text-[#9d3f3f]"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </AdminPanel>
          ))}
        </div>
      )}
    </div>
  );
}
