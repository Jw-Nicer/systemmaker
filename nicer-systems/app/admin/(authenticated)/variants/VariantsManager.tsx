"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  LandingFeatureItem,
  LandingHowItWorksStep,
  LandingVariant,
  LandingVariantSections,
} from "@/types/variant";
import {
  createVariant,
  deleteVariant,
  reorderVariants,
  toggleVariantPublished,
  updateVariant,
} from "@/lib/actions/variants";
import { normalizeVariantSections } from "@/lib/marketing/variant-content";
import {
  AdminPageHeader,
  AdminPanel,
  AdminPill,
} from "@/components/admin/AdminPrimitives";

type FormData = {
  slug: string;
  industry: string;
  meta_title: string;
  meta_description: string;
  sections: LandingVariantSections;
};

const emptyForm: FormData = {
  slug: "",
  industry: "",
  meta_title: "",
  meta_description: "",
  sections: normalizeVariantSections(null),
};

function inputClassName() {
  return "w-full rounded-[18px] border border-[#d7d0c1] bg-[#fbf7ef] px-4 py-3 text-sm text-[#1d2318] outline-none transition-colors focus:border-[#92a07a]";
}

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
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);

  useEffect(() => {
    setItems(initialData);
  }, [initialData]);

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
      meta_title: item.meta_title,
      meta_description: item.meta_description,
      sections: normalizeVariantSections(item),
    });
    setShowForm(true);
    setError("");
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setError("");
  }

  function updateField<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateSection<K extends keyof LandingVariantSections>(
    section: K,
    value: LandingVariantSections[K]
  ) {
    setForm((current) => ({
      ...current,
      sections: { ...current.sections, [section]: value },
    }));
  }

  function updateHowStep(index: number, field: keyof LandingHowItWorksStep, value: string) {
    updateSection("how_it_works", {
      ...form.sections.how_it_works,
      steps: form.sections.how_it_works.steps.map((step, idx) =>
        idx === index ? { ...step, [field]: value } : step
      ),
    });
  }

  function updateFeature(index: number, field: keyof LandingFeatureItem, value: string) {
    updateSection("features", {
      ...form.sections.features,
      items: form.sections.features.items.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item
      ),
    });
  }

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
            ? {
                ...item,
                ...payload,
                sections: payload.sections,
              }
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
  }

  async function moveItem(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(targetIndex, 0, item);

    setItems(next);
    const result = await reorderVariants(next.map((variant) => variant.id));
    if (!result.success) {
      setItems(items);
      setError(result.error ?? "Failed to reorder variants");
    }
  }

  function getVariantUrl(slug: string) {
    return origin ? `${origin}/${slug}` : `/${slug}`;
  }

  async function handleCopyLink(slug: string) {
    const variantUrl = getVariantUrl(slug);

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

      {showForm && (
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
            <AdminPill tone="blue">Full section config</AdminPill>
          </div>

          {error && (
            <div className="mb-4 rounded-[18px] border border-red-200 bg-[#fff4f2] p-3 text-sm text-[#9d3f3f]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <AdminPanel tone="soft" className="p-5">
              <h3 className="text-base font-semibold text-[#1d2318]">Identity</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-[#6c7467]">Industry Name</label>
                  <input
                    value={form.industry}
                    onChange={(e) => updateField("industry", e.target.value)}
                    className={inputClassName()}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[#6c7467]">URL Slug</label>
                  <input
                    value={form.slug}
                    onChange={(e) => updateField("slug", e.target.value)}
                    className={inputClassName()}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[#6c7467]">Meta Title</label>
                  <input
                    value={form.meta_title}
                    onChange={(e) => updateField("meta_title", e.target.value)}
                    className={inputClassName()}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[#6c7467]">Meta Description</label>
                  <input
                    value={form.meta_description}
                    onChange={(e) => updateField("meta_description", e.target.value)}
                    className={inputClassName()}
                  />
                </div>
              </div>
            </AdminPanel>

            <AdminPanel tone="soft" className="p-5">
              <h3 className="text-base font-semibold text-[#1d2318]">Hero</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-[#6c7467]">Headline</label>
                  <textarea
                    value={form.sections.hero.headline}
                    onChange={(e) =>
                      updateSection("hero", { ...form.sections.hero, headline: e.target.value })
                    }
                    rows={2}
                    className={`${inputClassName()} resize-y`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[#6c7467]">Subheadline</label>
                  <textarea
                    value={form.sections.hero.subheadline}
                    onChange={(e) =>
                      updateSection("hero", { ...form.sections.hero, subheadline: e.target.value })
                    }
                    rows={3}
                    className={`${inputClassName()} resize-y`}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm text-[#6c7467]">Primary CTA Text</label>
                    <input
                      value={form.sections.hero.cta_text}
                      onChange={(e) =>
                        updateSection("hero", { ...form.sections.hero, cta_text: e.target.value })
                      }
                      className={inputClassName()}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-[#6c7467]">Proof Line</label>
                    <input
                      value={form.sections.hero.proof_line}
                      onChange={(e) =>
                        updateSection("hero", { ...form.sections.hero, proof_line: e.target.value })
                      }
                      className={inputClassName()}
                    />
                  </div>
                </div>
              </div>
            </AdminPanel>

            <AdminPanel tone="soft" className="p-5">
              <h3 className="text-base font-semibold text-[#1d2318]">Demo + Proof</h3>
              <div className="mt-4 grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <p className="text-sm font-medium text-[#46523a]">Live Demo</p>
                  <input
                    value={form.sections.demo.eyebrow}
                    onChange={(e) =>
                      updateSection("demo", { ...form.sections.demo, eyebrow: e.target.value })
                    }
                    className={inputClassName()}
                    placeholder="Eyebrow"
                  />
                  <input
                    value={form.sections.demo.title}
                    onChange={(e) =>
                      updateSection("demo", { ...form.sections.demo, title: e.target.value })
                    }
                    className={inputClassName()}
                    placeholder="Title"
                  />
                  <textarea
                    value={form.sections.demo.description}
                    onChange={(e) =>
                      updateSection("demo", { ...form.sections.demo, description: e.target.value })
                    }
                    rows={3}
                    className={`${inputClassName()} resize-y`}
                    placeholder="Description"
                  />
                </div>
                <div className="space-y-4">
                  <p className="text-sm font-medium text-[#46523a]">Proof / Case Studies</p>
                  <input
                    value={form.sections.proof.eyebrow}
                    onChange={(e) =>
                      updateSection("proof", { ...form.sections.proof, eyebrow: e.target.value })
                    }
                    className={inputClassName()}
                    placeholder="Eyebrow"
                  />
                  <input
                    value={form.sections.proof.title}
                    onChange={(e) =>
                      updateSection("proof", { ...form.sections.proof, title: e.target.value })
                    }
                    className={inputClassName()}
                    placeholder="Title"
                  />
                  <textarea
                    value={form.sections.proof.description}
                    onChange={(e) =>
                      updateSection("proof", { ...form.sections.proof, description: e.target.value })
                    }
                    rows={3}
                    className={`${inputClassName()} resize-y`}
                    placeholder="Description"
                  />
                  <input
                    value={form.sections.proof.featured_industries.join(", ")}
                    onChange={(e) =>
                      updateSection("proof", {
                        ...form.sections.proof,
                        featured_industries: e.target.value
                          .split(",")
                          .map((value) => value.trim())
                          .filter(Boolean),
                      })
                    }
                    className={inputClassName()}
                    placeholder="Featured industries"
                  />
                </div>
              </div>
            </AdminPanel>

            <AdminPanel tone="soft" className="p-5">
              <h3 className="text-base font-semibold text-[#1d2318]">How It Works</h3>
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    value={form.sections.how_it_works.eyebrow}
                    onChange={(e) =>
                      updateSection("how_it_works", {
                        ...form.sections.how_it_works,
                        eyebrow: e.target.value,
                      })
                    }
                    className={inputClassName()}
                    placeholder="Eyebrow"
                  />
                  <input
                    value={form.sections.how_it_works.title}
                    onChange={(e) =>
                      updateSection("how_it_works", {
                        ...form.sections.how_it_works,
                        title: e.target.value,
                      })
                    }
                    className={inputClassName()}
                    placeholder="Section title"
                  />
                </div>
                {form.sections.how_it_works.steps.map((step, index) => (
                  <div key={step.id} className="grid gap-3 rounded-[18px] border border-[#ddd5c7] bg-white/65 p-4 md:grid-cols-[140px_1fr_1fr]">
                    <input value={step.id} readOnly className={`${inputClassName()} bg-[#f1eadf] text-[#6c7467]`} />
                    <input
                      value={step.title}
                      onChange={(e) => updateHowStep(index, "title", e.target.value)}
                      className={inputClassName()}
                      placeholder="Step title"
                    />
                    <textarea
                      value={step.description}
                      onChange={(e) => updateHowStep(index, "description", e.target.value)}
                      rows={2}
                      className={`${inputClassName()} resize-y`}
                      placeholder="Step description"
                    />
                  </div>
                ))}
              </div>
            </AdminPanel>

            <AdminPanel tone="soft" className="p-5">
              <h3 className="text-base font-semibold text-[#1d2318]">Features + Deliverables</h3>
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    value={form.sections.features.eyebrow}
                    onChange={(e) =>
                      updateSection("features", {
                        ...form.sections.features,
                        eyebrow: e.target.value,
                      })
                    }
                    className={inputClassName()}
                    placeholder="Eyebrow"
                  />
                  <input
                    value={form.sections.features.title}
                    onChange={(e) =>
                      updateSection("features", {
                        ...form.sections.features,
                        title: e.target.value,
                      })
                    }
                    className={inputClassName()}
                    placeholder="Section title"
                  />
                </div>
                {form.sections.features.items.map((item, index) => (
                  <div key={item.id} className="grid gap-3 rounded-[18px] border border-[#ddd5c7] bg-white/65 p-4 md:grid-cols-[120px_1fr_1fr_1fr]">
                    <input value={item.id} readOnly className={`${inputClassName()} bg-[#f1eadf] text-[#6c7467]`} />
                    <input
                      value={item.title}
                      onChange={(e) => updateFeature(index, "title", e.target.value)}
                      className={inputClassName()}
                      placeholder="Feature title"
                    />
                    <textarea
                      value={item.description}
                      onChange={(e) => updateFeature(index, "description", e.target.value)}
                      rows={2}
                      className={`${inputClassName()} resize-y`}
                      placeholder="Feature description"
                    />
                    <textarea
                      value={item.visual}
                      onChange={(e) => updateFeature(index, "visual", e.target.value)}
                      rows={2}
                      className={`${inputClassName()} resize-y`}
                      placeholder="Visual caption"
                    />
                  </div>
                ))}
              </div>
            </AdminPanel>

            <AdminPanel tone="soft" className="p-5">
              <h3 className="text-base font-semibold text-[#1d2318]">Pricing + FAQ + Final CTA</h3>
              <div className="mt-4 space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-[#46523a]">Pricing</p>
                    <input
                      value={form.sections.pricing.eyebrow}
                      onChange={(e) =>
                        updateSection("pricing", { ...form.sections.pricing, eyebrow: e.target.value })
                      }
                      className={inputClassName()}
                      placeholder="Eyebrow"
                    />
                    <input
                      value={form.sections.pricing.title}
                      onChange={(e) =>
                        updateSection("pricing", { ...form.sections.pricing, title: e.target.value })
                      }
                      className={inputClassName()}
                      placeholder="Title"
                    />
                    <textarea
                      value={form.sections.pricing.description}
                      onChange={(e) =>
                        updateSection("pricing", { ...form.sections.pricing, description: e.target.value })
                      }
                      rows={3}
                      className={`${inputClassName()} resize-y`}
                      placeholder="Description"
                    />
                    <input
                      value={form.sections.pricing.highlighted_tier ?? ""}
                      onChange={(e) =>
                        updateSection("pricing", {
                          ...form.sections.pricing,
                          highlighted_tier: e.target.value,
                        })
                      }
                      className={inputClassName()}
                      placeholder="Highlighted tier"
                    />
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-[#46523a]">FAQ</p>
                    <input
                      value={form.sections.faq.eyebrow}
                      onChange={(e) =>
                        updateSection("faq", { ...form.sections.faq, eyebrow: e.target.value })
                      }
                      className={inputClassName()}
                      placeholder="Eyebrow"
                    />
                    <input
                      value={form.sections.faq.title}
                      onChange={(e) =>
                        updateSection("faq", { ...form.sections.faq, title: e.target.value })
                      }
                      className={inputClassName()}
                      placeholder="Title"
                    />
                    <textarea
                      value={form.sections.faq.description}
                      onChange={(e) =>
                        updateSection("faq", { ...form.sections.faq, description: e.target.value })
                      }
                      rows={3}
                      className={`${inputClassName()} resize-y`}
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
                        updateSection("final_cta", {
                          ...form.sections.final_cta,
                          eyebrow: e.target.value,
                        })
                      }
                      className={inputClassName()}
                      placeholder="Eyebrow"
                    />
                    <input
                      value={form.sections.final_cta.cta_text}
                      onChange={(e) =>
                        updateSection("final_cta", {
                          ...form.sections.final_cta,
                          cta_text: e.target.value,
                        })
                      }
                      className={inputClassName()}
                      placeholder="CTA text"
                    />
                  </div>
                  <input
                    value={form.sections.final_cta.title}
                    onChange={(e) =>
                      updateSection("final_cta", {
                        ...form.sections.final_cta,
                        title: e.target.value,
                      })
                    }
                    className={inputClassName()}
                    placeholder="Title"
                  />
                  <textarea
                    value={form.sections.final_cta.description}
                    onChange={(e) =>
                      updateSection("final_cta", {
                        ...form.sections.final_cta,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    className={`${inputClassName()} resize-y`}
                    placeholder="Description"
                  />
                </div>
              </div>
            </AdminPanel>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[#171d13] px-5 py-3 text-sm font-semibold text-[#f7f2e8] transition-transform hover:scale-[1.02] disabled:opacity-50"
              >
                {saving ? "Saving..." : editingId ? "Update Variant" : "Create Variant"}
              </button>
              <button
                type="button"
                onClick={cancelForm}
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
          No variants yet. Create one to add an industry landing page with tailored section copy.
        </AdminPanel>
      ) : (
        <div className="mt-8 space-y-3">
          {items.map((item, index) => {
            const sections = normalizeVariantSections(item);
            const variantUrl = getVariantUrl(item.slug);

            return (
              <AdminPanel key={item.id} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-[#1d2318]">{item.industry}</h3>
                    <AdminPill tone={item.is_published ? "green" : "neutral"}>
                      {item.is_published ? "Published" : "Draft"}
                    </AdminPill>
                    <AdminPill tone="blue">/{item.slug}</AdminPill>
                  </div>
                  <p className="mt-2 truncate text-sm text-[#596351]">{sections.hero.headline}</p>
                  <div className="mt-3 flex flex-col gap-2">
                    <label className="text-[11px] uppercase tracking-[0.14em] text-[#7e7b70]">
                      Variant URL
                    </label>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center">
                      <input
                        readOnly
                        value={variantUrl}
                        className={`${inputClassName()} bg-[#f3ede2] font-mono text-xs text-[#596351] md:max-w-[28rem]`}
                      />
                      <a
                        href={variantUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-3 py-2 text-xs text-[#27311f] hover:bg-white"
                      >
                        Open
                      </a>
                      <button
                        onClick={() => handleCopyLink(item.slug)}
                        className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-3 py-2 text-xs text-[#4f6032] hover:bg-white"
                      >
                        {copiedLink === item.slug ? "Copied" : "Copy Link"}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#6c7467]">
                    <span>Hero CTA: {sections.hero.cta_text}</span>
                    <span>Proof filters: {sections.proof.featured_industries.length}</span>
                    <span>How-it-works steps: {sections.how_it_works.steps.length}</span>
                    <span>Features: {sections.features.items.length}</span>
                    <span>Order: {index + 1}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <Link
                    href={`/preview/variant/${item.id}`}
                    target="_blank"
                    className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-3 py-2 text-xs text-[#596351] hover:bg-white"
                  >
                    Preview
                  </Link>
                  <button
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0}
                    className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-3 py-2 text-xs text-[#596351] disabled:opacity-40"
                  >
                    Move up
                  </button>
                  <button
                    onClick={() => moveItem(index, 1)}
                    disabled={index === items.length - 1}
                    className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-3 py-2 text-xs text-[#596351] disabled:opacity-40"
                  >
                    Move down
                  </button>
                  <button
                    onClick={() => handleToggle(item.id, item.is_published)}
                    className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-3 py-2 text-xs text-[#596351] hover:bg-white"
                  >
                    {item.is_published ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    className="rounded-full border border-[#d0c8b8] bg-[#fbf7ef] px-3 py-2 text-xs text-[#4f6032] hover:bg-white"
                  >
                    Edit
                  </button>
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
              </AdminPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
