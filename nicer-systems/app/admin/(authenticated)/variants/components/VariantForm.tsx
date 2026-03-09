"use client";

import { useState } from "react";
import type {
  LandingFeatureItem,
  LandingHowItWorksStep,
  LandingVariantSections,
} from "@/types/variant";
import {
  AdminPanel,
  AdminPill,
} from "@/components/admin/AdminPrimitives";
import {
  type FormData,
  type TabKey,
  TABS,
  CHAR_LIMITS,
  inputClassName,
  slugify,
} from "../utils";

function CharCount({ value, max }: { value: string; max: number }) {
  const count = value.length;
  const over = count > max;
  return (
    <span className={`text-xs ${over ? "font-medium text-red-600" : "text-[#7e7b70]"}`}>
      {count}/{max}
    </span>
  );
}

function FieldLabel({
  label,
  charCount,
}: {
  label: string;
  charCount?: { value: string; max: number };
}) {
  return (
    <div className="mb-1 flex items-center justify-between">
      <label className="block text-sm text-[#6c7467]">{label}</label>
      {charCount && <CharCount value={charCount.value} max={charCount.max} />}
    </div>
  );
}

export default function VariantForm({
  form,
  editingId,
  saving,
  error,
  hasUnsavedChanges,
  onUpdateField,
  onUpdateSection,
  onSubmit,
  onCancel,
}: {
  form: FormData;
  editingId: string | null;
  saving: boolean;
  error: string;
  hasUnsavedChanges: boolean;
  onUpdateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  onUpdateSection: <K extends keyof LandingVariantSections>(
    section: K,
    value: LandingVariantSections[K]
  ) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("identity");

  function updateHowStep(index: number, field: keyof LandingHowItWorksStep, value: string) {
    onUpdateSection("how_it_works", {
      ...form.sections.how_it_works,
      steps: form.sections.how_it_works.steps.map((step, idx) =>
        idx === index ? { ...step, [field]: value } : step
      ),
    });
  }

  function addHowStep() {
    const steps = form.sections.how_it_works.steps;
    const nextId = String(steps.length + 1).padStart(2, "0");
    onUpdateSection("how_it_works", {
      ...form.sections.how_it_works,
      steps: [...steps, { id: nextId, title: "", description: "" }],
    });
  }

  function removeHowStep(index: number) {
    onUpdateSection("how_it_works", {
      ...form.sections.how_it_works,
      steps: form.sections.how_it_works.steps.filter((_, i) => i !== index),
    });
  }

  function updateFeature(index: number, field: keyof LandingFeatureItem, value: string) {
    onUpdateSection("features", {
      ...form.sections.features,
      items: form.sections.features.items.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item
      ),
    });
  }

  function addFeature() {
    const items = form.sections.features.items;
    const nextId = String(items.length + 1).padStart(2, "0");
    onUpdateSection("features", {
      ...form.sections.features,
      items: [...items, { id: nextId, title: "", description: "", visual: "" }],
    });
  }

  function removeFeature(index: number) {
    onUpdateSection("features", {
      ...form.sections.features,
      items: form.sections.features.items.filter((_, i) => i !== index),
    });
  }

  function handleIndustryChange(value: string) {
    onUpdateField("industry", value);
    if (!editingId) {
      onUpdateField("slug", slugify(value));
    }
  }

  const cls = inputClassName();

  return (
    <AdminPanel className="mt-8 mb-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1d2318]">
            {editingId ? "Edit Variant" : "New Variant"}
          </h2>
          <p className="mt-1 text-sm text-[#6c7467]">
            Draft a full industry landing page by adjusting the shared sections below.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && <AdminPill tone="yellow">Unsaved changes</AdminPill>}
          <AdminPill tone="blue">Full section config</AdminPill>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-[18px] border border-red-200 bg-[#fff4f2] p-3 text-sm text-[#9d3f3f]">
          {error}
        </div>
      )}

      {/* Tab bar */}
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "border-[#9bb286] bg-[#e8eedf] text-[#4f6032]"
                : "border-[#d0c8b8] bg-[#fbf7ef] text-[#596351] hover:bg-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit}>
        {/* Identity tab */}
        {activeTab === "identity" && (
          <AdminPanel tone="soft" className="p-5">
            <h3 className="text-base font-semibold text-[#1d2318]">Identity</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <FieldLabel label="Industry Name" />
                <input
                  value={form.industry}
                  onChange={(e) => handleIndustryChange(e.target.value)}
                  className={cls}
                  required
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm text-[#6c7467]">URL Slug</label>
                  {!editingId && (
                    <span className="text-[10px] text-[#92a07a]">Auto-generated</span>
                  )}
                </div>
                <input
                  value={form.slug}
                  onChange={(e) => onUpdateField("slug", e.target.value)}
                  className={cls}
                  required
                />
              </div>
              <div>
                <FieldLabel
                  label="Meta Title"
                  charCount={{ value: form.meta_title, max: CHAR_LIMITS.meta_title }}
                />
                <input
                  value={form.meta_title}
                  onChange={(e) => onUpdateField("meta_title", e.target.value)}
                  className={cls}
                />
              </div>
              <div>
                <FieldLabel
                  label="Meta Description"
                  charCount={{ value: form.meta_description, max: CHAR_LIMITS.meta_description }}
                />
                <input
                  value={form.meta_description}
                  onChange={(e) => onUpdateField("meta_description", e.target.value)}
                  className={cls}
                />
              </div>
            </div>
          </AdminPanel>
        )}

        {/* Hero tab */}
        {activeTab === "hero" && (
          <AdminPanel tone="soft" className="p-5">
            <h3 className="text-base font-semibold text-[#1d2318]">Hero</h3>
            <div className="mt-4 space-y-4">
              <div>
                <FieldLabel
                  label="Headline"
                  charCount={{ value: form.sections.hero.headline, max: CHAR_LIMITS.headline }}
                />
                <textarea
                  value={form.sections.hero.headline}
                  onChange={(e) =>
                    onUpdateSection("hero", { ...form.sections.hero, headline: e.target.value })
                  }
                  rows={2}
                  className={`${cls} resize-y`}
                />
              </div>
              <div>
                <FieldLabel
                  label="Subheadline"
                  charCount={{ value: form.sections.hero.subheadline, max: CHAR_LIMITS.subheadline }}
                />
                <textarea
                  value={form.sections.hero.subheadline}
                  onChange={(e) =>
                    onUpdateSection("hero", { ...form.sections.hero, subheadline: e.target.value })
                  }
                  rows={3}
                  className={`${cls} resize-y`}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel
                    label="Primary CTA Text"
                    charCount={{ value: form.sections.hero.cta_text, max: CHAR_LIMITS.cta_text }}
                  />
                  <input
                    value={form.sections.hero.cta_text}
                    onChange={(e) =>
                      onUpdateSection("hero", { ...form.sections.hero, cta_text: e.target.value })
                    }
                    className={cls}
                  />
                </div>
                <div>
                  <FieldLabel
                    label="Proof Line"
                    charCount={{ value: form.sections.hero.proof_line, max: CHAR_LIMITS.proof_line }}
                  />
                  <input
                    value={form.sections.hero.proof_line}
                    onChange={(e) =>
                      onUpdateSection("hero", { ...form.sections.hero, proof_line: e.target.value })
                    }
                    className={cls}
                  />
                </div>
              </div>
            </div>
          </AdminPanel>
        )}

        {/* Demo + Proof tab */}
        {activeTab === "demo-proof" && (
          <AdminPanel tone="soft" className="p-5">
            <h3 className="text-base font-semibold text-[#1d2318]">Demo + Proof</h3>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <p className="text-sm font-medium text-[#46523a]">Live Demo</p>
                <input
                  value={form.sections.demo.eyebrow}
                  onChange={(e) =>
                    onUpdateSection("demo", { ...form.sections.demo, eyebrow: e.target.value })
                  }
                  className={cls}
                  placeholder="Eyebrow"
                />
                <input
                  value={form.sections.demo.title}
                  onChange={(e) =>
                    onUpdateSection("demo", { ...form.sections.demo, title: e.target.value })
                  }
                  className={cls}
                  placeholder="Title"
                />
                <textarea
                  value={form.sections.demo.description}
                  onChange={(e) =>
                    onUpdateSection("demo", { ...form.sections.demo, description: e.target.value })
                  }
                  rows={3}
                  className={`${cls} resize-y`}
                  placeholder="Description"
                />
              </div>
              <div className="space-y-4">
                <p className="text-sm font-medium text-[#46523a]">Proof / Case Studies</p>
                <input
                  value={form.sections.proof.eyebrow}
                  onChange={(e) =>
                    onUpdateSection("proof", { ...form.sections.proof, eyebrow: e.target.value })
                  }
                  className={cls}
                  placeholder="Eyebrow"
                />
                <input
                  value={form.sections.proof.title}
                  onChange={(e) =>
                    onUpdateSection("proof", { ...form.sections.proof, title: e.target.value })
                  }
                  className={cls}
                  placeholder="Title"
                />
                <textarea
                  value={form.sections.proof.description}
                  onChange={(e) =>
                    onUpdateSection("proof", { ...form.sections.proof, description: e.target.value })
                  }
                  rows={3}
                  className={`${cls} resize-y`}
                  placeholder="Description"
                />
                <input
                  value={form.sections.proof.featured_industries.join(", ")}
                  onChange={(e) =>
                    onUpdateSection("proof", {
                      ...form.sections.proof,
                      featured_industries: e.target.value
                        .split(",")
                        .map((v) => v.trim())
                        .filter(Boolean),
                    })
                  }
                  className={cls}
                  placeholder="Featured industries (comma-separated)"
                />
              </div>
            </div>
          </AdminPanel>
        )}

        {/* How It Works tab */}
        {activeTab === "how-it-works" && (
          <AdminPanel tone="soft" className="p-5">
            <h3 className="text-base font-semibold text-[#1d2318]">How It Works</h3>
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  value={form.sections.how_it_works.eyebrow}
                  onChange={(e) =>
                    onUpdateSection("how_it_works", {
                      ...form.sections.how_it_works,
                      eyebrow: e.target.value,
                    })
                  }
                  className={cls}
                  placeholder="Eyebrow"
                />
                <input
                  value={form.sections.how_it_works.title}
                  onChange={(e) =>
                    onUpdateSection("how_it_works", {
                      ...form.sections.how_it_works,
                      title: e.target.value,
                    })
                  }
                  className={cls}
                  placeholder="Section title"
                />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#46523a]">
                  Steps ({form.sections.how_it_works.steps.length})
                </p>
                <button
                  type="button"
                  onClick={addHowStep}
                  disabled={form.sections.how_it_works.steps.length >= 20}
                  className="rounded-full border border-dashed border-[#9bb286] px-3 py-1.5 text-xs font-medium text-[#4f6032] transition-colors hover:bg-[#e8eedf] disabled:opacity-40"
                >
                  + Add Step
                </button>
              </div>

              {form.sections.how_it_works.steps.map((step, index) => (
                <div
                  key={step.id}
                  className="grid gap-3 rounded-[18px] border border-[#ddd5c7] bg-white/65 p-4 md:grid-cols-[100px_1fr_1fr_auto]"
                >
                  <input
                    value={step.id}
                    readOnly
                    className={`${cls} bg-[#f1eadf] text-[#6c7467]`}
                  />
                  <input
                    value={step.title}
                    onChange={(e) => updateHowStep(index, "title", e.target.value)}
                    className={cls}
                    placeholder="Step title"
                  />
                  <textarea
                    value={step.description}
                    onChange={(e) => updateHowStep(index, "description", e.target.value)}
                    rows={2}
                    className={`${cls} resize-y`}
                    placeholder="Step description"
                  />
                  <button
                    type="button"
                    onClick={() => removeHowStep(index)}
                    disabled={form.sections.how_it_works.steps.length <= 1}
                    className="self-start rounded-full border border-red-200 bg-[#fff4f2] px-3 py-2 text-xs text-[#9d3f3f] transition-colors hover:bg-red-100 disabled:opacity-30"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </AdminPanel>
        )}

        {/* Features tab */}
        {activeTab === "features" && (
          <AdminPanel tone="soft" className="p-5">
            <h3 className="text-base font-semibold text-[#1d2318]">Features + Deliverables</h3>
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  value={form.sections.features.eyebrow}
                  onChange={(e) =>
                    onUpdateSection("features", {
                      ...form.sections.features,
                      eyebrow: e.target.value,
                    })
                  }
                  className={cls}
                  placeholder="Eyebrow"
                />
                <input
                  value={form.sections.features.title}
                  onChange={(e) =>
                    onUpdateSection("features", {
                      ...form.sections.features,
                      title: e.target.value,
                    })
                  }
                  className={cls}
                  placeholder="Section title"
                />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#46523a]">
                  Items ({form.sections.features.items.length})
                </p>
                <button
                  type="button"
                  onClick={addFeature}
                  disabled={form.sections.features.items.length >= 20}
                  className="rounded-full border border-dashed border-[#9bb286] px-3 py-1.5 text-xs font-medium text-[#4f6032] transition-colors hover:bg-[#e8eedf] disabled:opacity-40"
                >
                  + Add Feature
                </button>
              </div>

              {form.sections.features.items.map((item, index) => (
                <div
                  key={item.id}
                  className="grid gap-3 rounded-[18px] border border-[#ddd5c7] bg-white/65 p-4 md:grid-cols-[80px_1fr_1fr_1fr_auto]"
                >
                  <input
                    value={item.id}
                    readOnly
                    className={`${cls} bg-[#f1eadf] text-[#6c7467]`}
                  />
                  <input
                    value={item.title}
                    onChange={(e) => updateFeature(index, "title", e.target.value)}
                    className={cls}
                    placeholder="Feature title"
                  />
                  <textarea
                    value={item.description}
                    onChange={(e) => updateFeature(index, "description", e.target.value)}
                    rows={2}
                    className={`${cls} resize-y`}
                    placeholder="Feature description"
                  />
                  <textarea
                    value={item.visual}
                    onChange={(e) => updateFeature(index, "visual", e.target.value)}
                    rows={2}
                    className={`${cls} resize-y`}
                    placeholder="Visual caption"
                  />
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    disabled={form.sections.features.items.length <= 1}
                    className="self-start rounded-full border border-red-200 bg-[#fff4f2] px-3 py-2 text-xs text-[#9d3f3f] transition-colors hover:bg-red-100 disabled:opacity-30"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </AdminPanel>
        )}

        {/* Pricing + FAQ + CTA tab */}
        {activeTab === "pricing-faq-cta" && (
          <AdminPanel tone="soft" className="p-5">
            <h3 className="text-base font-semibold text-[#1d2318]">Pricing + FAQ + Final CTA</h3>
            <div className="mt-4 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-[#46523a]">Pricing</p>
                  <input
                    value={form.sections.pricing.eyebrow}
                    onChange={(e) =>
                      onUpdateSection("pricing", { ...form.sections.pricing, eyebrow: e.target.value })
                    }
                    className={cls}
                    placeholder="Eyebrow"
                  />
                  <input
                    value={form.sections.pricing.title}
                    onChange={(e) =>
                      onUpdateSection("pricing", { ...form.sections.pricing, title: e.target.value })
                    }
                    className={cls}
                    placeholder="Title"
                  />
                  <textarea
                    value={form.sections.pricing.description}
                    onChange={(e) =>
                      onUpdateSection("pricing", {
                        ...form.sections.pricing,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    className={`${cls} resize-y`}
                    placeholder="Description"
                  />
                  <input
                    value={form.sections.pricing.highlighted_tier ?? ""}
                    onChange={(e) =>
                      onUpdateSection("pricing", {
                        ...form.sections.pricing,
                        highlighted_tier: e.target.value,
                      })
                    }
                    className={cls}
                    placeholder="Highlighted tier"
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-[#46523a]">FAQ</p>
                  <input
                    value={form.sections.faq.eyebrow}
                    onChange={(e) =>
                      onUpdateSection("faq", { ...form.sections.faq, eyebrow: e.target.value })
                    }
                    className={cls}
                    placeholder="Eyebrow"
                  />
                  <input
                    value={form.sections.faq.title}
                    onChange={(e) =>
                      onUpdateSection("faq", { ...form.sections.faq, title: e.target.value })
                    }
                    className={cls}
                    placeholder="Title"
                  />
                  <textarea
                    value={form.sections.faq.description}
                    onChange={(e) =>
                      onUpdateSection("faq", { ...form.sections.faq, description: e.target.value })
                    }
                    rows={3}
                    className={`${cls} resize-y`}
                    placeholder="Description"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-[#46523a]">Final CTA</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    value={form.sections.final_cta.eyebrow}
                    onChange={(e) =>
                      onUpdateSection("final_cta", {
                        ...form.sections.final_cta,
                        eyebrow: e.target.value,
                      })
                    }
                    className={cls}
                    placeholder="Eyebrow"
                  />
                  <input
                    value={form.sections.final_cta.cta_text}
                    onChange={(e) =>
                      onUpdateSection("final_cta", {
                        ...form.sections.final_cta,
                        cta_text: e.target.value,
                      })
                    }
                    className={cls}
                    placeholder="CTA text"
                  />
                </div>
                <input
                  value={form.sections.final_cta.title}
                  onChange={(e) =>
                    onUpdateSection("final_cta", {
                      ...form.sections.final_cta,
                      title: e.target.value,
                    })
                  }
                  className={cls}
                  placeholder="Title"
                />
                <textarea
                  value={form.sections.final_cta.description}
                  onChange={(e) =>
                    onUpdateSection("final_cta", {
                      ...form.sections.final_cta,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  className={`${cls} resize-y`}
                  placeholder="Description"
                />
              </div>
            </div>
          </AdminPanel>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#171d13] px-5 py-3 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {saving ? "Saving..." : editingId ? "Update Variant" : "Create Variant"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-5 py-3 text-sm font-medium text-[#596351] transition-colors hover:bg-white"
          >
            Cancel
          </button>
        </div>
      </form>
    </AdminPanel>
  );
}
