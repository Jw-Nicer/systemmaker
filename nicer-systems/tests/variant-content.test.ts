import { test } from "vitest";
import assert from "node:assert/strict";
import {
  DEFAULT_FEATURE_ITEMS,
  DEFAULT_HOW_IT_WORKS_STEPS,
  DEFAULT_VARIANT_SECTIONS,
  normalizeVariantSections,
} from "@/lib/marketing/variant-content";

test("normalizeVariantSections returns defaults when no variant is provided", () => {
  const sections = normalizeVariantSections(null);

  assert.deepEqual(sections, DEFAULT_VARIANT_SECTIONS);
});

test("normalizeVariantSections preserves legacy hero fields and proof filters", () => {
  const sections = normalizeVariantSections({
    id: "variant-1",
    slug: "logistics",
    industry: "Logistics",
    headline: "Fix dispatch delays",
    subheadline: "Map the handoff gaps before they cascade.",
    cta_text: "Review the workflow",
    meta_title: "Logistics Automation",
    meta_description: "Logistics landing page",
    featured_industries: ["logistics", "distribution"],
    is_published: true,
    sort_order: 0,
  });

  assert.equal(sections.hero.headline, "Fix dispatch delays");
  assert.equal(sections.hero.subheadline, "Map the handoff gaps before they cascade.");
  assert.equal(sections.hero.cta_text, "Review the workflow");
  assert.deepEqual(sections.proof.featured_industries, ["logistics", "distribution"]);
});

test("normalizeVariantSections maps custom steps and features while keeping ids stable", () => {
  const sections = normalizeVariantSections({
    id: "variant-2",
    slug: "field-services",
    industry: "Field Services",
    headline: "Unused legacy headline",
    subheadline: "Unused legacy subheadline",
    cta_text: "Unused legacy cta",
    meta_title: "Field Services Automation",
    meta_description: "Field services landing page",
    featured_industries: [],
    is_published: false,
    sort_order: 1,
    sections: {
      how_it_works: {
        eyebrow: "Workflow",
        title: "How the rollout works",
        steps: [
          {
            id: "",
            title: "Capture the intake",
            description: "Start with the broken workflow.",
          },
        ],
      },
      features: {
        eyebrow: "Outputs",
        title: "What ships",
        items: [
          {
            id: "",
            title: "Dispatch map",
            description: "A scoped process map.",
            visual: "handoff diagram",
          },
        ],
      },
    },
  });

  assert.equal(sections.how_it_works.eyebrow, "Workflow");
  assert.equal(sections.how_it_works.title, "How the rollout works");
  assert.equal(sections.how_it_works.steps[0]?.id, DEFAULT_HOW_IT_WORKS_STEPS[0]?.id);
  assert.equal(sections.how_it_works.steps[0]?.title, "Capture the intake");

  assert.equal(sections.features.eyebrow, "Outputs");
  assert.equal(sections.features.title, "What ships");
  assert.equal(sections.features.items[0]?.id, DEFAULT_FEATURE_ITEMS[0]?.id);
  assert.equal(sections.features.items[0]?.visual, "handoff diagram");
});

test("normalizeVariantSections passes through step image fields and omits empties", () => {
  const sections = normalizeVariantSections({
    id: "variant-3",
    slug: "with-images",
    industry: "Imaged",
    headline: "h",
    subheadline: "s",
    cta_text: "c",
    meta_title: "m",
    meta_description: "d",
    featured_industries: [],
    is_published: false,
    sort_order: 0,
    sections: {
      how_it_works: {
        eyebrow: "Process",
        title: "Steps",
        steps: [
          {
            id: "01",
            title: "With image",
            description: "has visual",
            imageUrl: "https://example.com/a.png",
            imageAlt: "alt text",
          },
          {
            id: "02",
            title: "Without image",
            description: "uses fallback",
            imageUrl: "",
            imageAlt: "",
          },
        ],
      },
    },
  });

  assert.equal(sections.how_it_works.steps[0]?.imageUrl, "https://example.com/a.png");
  assert.equal(sections.how_it_works.steps[0]?.imageAlt, "alt text");
  assert.equal(sections.how_it_works.steps[1]?.imageUrl, undefined);
  assert.equal(sections.how_it_works.steps[1]?.imageAlt, undefined);
});
