import { test } from "node:test";
import assert from "node:assert/strict";

import {
  agentChatSchema,
  agentRunSchema,
  experimentConfigSchema,
  experimentVariantSchema,
  variantSchema,
} from "../lib/validation";

// --- Experiment Variant Schema ---

test("experimentVariantSchema accepts valid variant", () => {
  const valid = { key: "control", label: "Control", value: "Sign up now", weight: 50 };
  const result = experimentVariantSchema.safeParse(valid);
  assert.ok(result.success);
});

test("experimentVariantSchema rejects empty key", () => {
  const invalid = { key: "", label: "Control", value: "Sign up", weight: 50 };
  const result = experimentVariantSchema.safeParse(invalid);
  assert.equal(result.success, false);
});

test("experimentVariantSchema rejects weight > 100", () => {
  const invalid = { key: "a", label: "A", value: "Text", weight: 150 };
  const result = experimentVariantSchema.safeParse(invalid);
  assert.equal(result.success, false);
});

// --- Experiment Config Schema ---

test("experimentConfigSchema accepts valid config", () => {
  const valid = {
    name: "Hero headline test",
    target: "hero_headline",
    variants: [
      { key: "control", label: "Control", value: "Original headline", weight: 50 },
      { key: "variant_a", label: "Variant A", value: "New headline", weight: 50 },
    ],
  };
  const result = experimentConfigSchema.safeParse(valid);
  assert.ok(result.success);
});

test("experimentConfigSchema rejects unsupported target", () => {
  const invalid = {
    name: "Test",
    target: "nonexistent_target",
    variants: [
      { key: "a", label: "A", value: "Text", weight: 50 },
      { key: "b", label: "B", value: "Text", weight: 50 },
    ],
  };
  const result = experimentConfigSchema.safeParse(invalid);
  assert.equal(result.success, false);
});

test("experimentConfigSchema rejects fewer than 2 variants", () => {
  const invalid = {
    name: "Test",
    target: "hero_headline",
    variants: [{ key: "only", label: "Only", value: "Text", weight: 100 }],
  };
  const result = experimentConfigSchema.safeParse(invalid);
  assert.equal(result.success, false);
});

test("experimentConfigSchema rejects weights not summing to 100", () => {
  const invalid = {
    name: "Test",
    target: "hero_cta",
    variants: [
      { key: "a", label: "A", value: "Text", weight: 30 },
      { key: "b", label: "B", value: "Text", weight: 30 },
    ],
  };
  const result = experimentConfigSchema.safeParse(invalid);
  assert.equal(result.success, false);
});

test("experimentConfigSchema accepts all valid targets", () => {
  const targets = ["hero_headline", "hero_cta", "final_cta"] as const;
  for (const target of targets) {
    const valid = {
      name: "Test",
      target,
      variants: [
        { key: "a", label: "A", value: "Text", weight: 50 },
        { key: "b", label: "B", value: "Text", weight: 50 },
      ],
    };
    const result = experimentConfigSchema.safeParse(valid);
    assert.ok(result.success, `Target "${target}" should be valid`);
  }
});

// --- Variant Schema ---

test("variantSchema accepts valid variant", () => {
  const valid = {
    slug: "property-management",
    industry: "Property Management",
    headline: "Automate your property ops",
    subheadline: "Stop drowning in tenant paperwork",
    cta_text: "Get a preview plan",
    meta_title: "Property Management Automation",
    meta_description: "Automate tenant onboarding and maintenance workflows",
    featured_industries: ["property-management", "real-estate"],
  };
  const result = variantSchema.safeParse(valid);
  assert.ok(result.success);
});

test("variantSchema rejects invalid slug format", () => {
  const invalid = {
    slug: "Property Management!", // uppercase + special char
    industry: "Property Management",
    headline: "Test",
    subheadline: "Test",
    cta_text: "Test",
    meta_title: "Test",
    meta_description: "Test",
    featured_industries: [],
  };
  const result = variantSchema.safeParse(invalid);
  assert.equal(result.success, false);
});

test("variantSchema rejects empty required fields", () => {
  const invalid = {
    slug: "test",
    industry: "", // empty
    headline: "Test",
    subheadline: "Test",
    cta_text: "Test",
    meta_title: "Test",
    meta_description: "Test",
    featured_industries: [],
  };
  const result = variantSchema.safeParse(invalid);
  assert.equal(result.success, false);
});

test("variantSchema accepts slug with hyphens and numbers", () => {
  const valid = {
    slug: "hvac-services-2025",
    industry: "HVAC",
    headline: "Test",
    subheadline: "Test",
    cta_text: "Test",
    meta_title: "Test",
    meta_description: "Test",
    featured_industries: [],
  };
  const result = variantSchema.safeParse(valid);
  assert.ok(result.success);
});

test("variantSchema accepts persisted section-level variant content", () => {
  const result = variantSchema.safeParse({
    slug: "field-services",
    industry: "Field Services",
    headline: "Fix dispatch bottlenecks",
    subheadline: "Turn manual coordination into a reliable operating flow.",
    cta_text: "Get a preview plan",
    meta_title: "Field Services Automation",
    meta_description: "Field services landing page",
    featured_industries: ["field-services"],
    sections: {
      hero: {
        headline: "Field service ops, clarified.",
        subheadline: "Scope the workflow before implementation starts.",
        cta_text: "Review the workflow",
        proof_line: "Preview the KPIs, alerts, and next actions.",
      },
      demo: {
        eyebrow: "Demo",
        title: "Build a plan",
        description: "Generate a tailored preview plan.",
      },
      proof: {
        eyebrow: "Results",
        title: "Case studies",
        description: "Proof from real teams.",
        featured_industries: ["field-services"],
      },
      how_it_works: {
        eyebrow: "How it works",
        title: "From problem to plan",
        steps: [
          { id: "01", title: "Capture intake", description: "Describe the workflow." },
        ],
      },
      features: {
        eyebrow: "Deliverables",
        title: "What ships",
        items: [
          {
            id: "01",
            title: "Process map",
            description: "Map the workflow and handoffs.",
            visual: "handoff diagram",
          },
        ],
      },
      pricing: {
        eyebrow: "Pricing",
        title: "Simple pricing",
        description: "Start with scoping.",
        highlighted_tier: "Growth",
      },
      faq: {
        eyebrow: "FAQ",
        title: "Questions",
        description: "",
      },
      final_cta: {
        eyebrow: "Ready",
        title: "Focus the workflow",
        description: "Turn the bottleneck into a concrete plan.",
        cta_text: "Start the scoping call",
      },
    },
  });

  assert.ok(result.success);
  if (!result.success) {
    return;
  }
  assert.equal(result.data.sections?.features.items[0]?.visual, "handoff diagram");
});

test("agentRunSchema accepts experiment attribution context", () => {
  const result = agentRunSchema.safeParse({
    industry: "Logistics",
    bottleneck: "Manual dispatch updates",
    current_tools: "Sheets and phone",
    landing_path: "/logistics",
    experiment_assignments: [
      {
        experiment_id: "exp_1",
        experiment_name: "Hero test",
        target: "hero_headline",
        variant_key: "variant_a",
        variant_label: "Variant A",
      },
    ],
  });

  assert.ok(result.success);
});

test("agentChatSchema accepts experiment attribution context", () => {
  const result = agentChatSchema.safeParse({
    message: "We run a field service team and dispatch is manual.",
    history: [],
    phase: "gathering",
    extracted: {},
    landing_path: "/field-services",
    experiment_assignments: [
      {
        experiment_id: "exp_1",
        experiment_name: "Hero test",
        target: "hero_headline",
        variant_key: "variant_a",
        variant_label: "Variant A",
      },
    ],
  });

  assert.ok(result.success);
});
