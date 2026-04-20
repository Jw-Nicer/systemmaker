import type {
  LandingFeatureItem,
  LandingHowItWorksStep,
  LandingVariant,
  LandingVariantSections,
} from "@/types/variant";

export const DEFAULT_HOW_IT_WORKS_STEPS: LandingHowItWorksStep[] = [
  {
    id: "01",
    title: "Describe the bottleneck",
    description:
      "Share the workflow, stack, and friction point. The intake stays short.",
  },
  {
    id: "02",
    title: "Generate the plan",
    description:
      "The system maps the workflow, KPI layer, and automations around the bottleneck.",
  },
  {
    id: "03",
    title: "Refine and move",
    description:
      "Share it, refine it, and use it to scope the next build.",
  },
];

export const DEFAULT_FEATURE_ITEMS: LandingFeatureItem[] = [
  {
    id: "01",
    title: "Workflow mapping for the process you already run",
    description:
      "We map the real handoffs, owners, and failure points.",
    visual: "Stages, owners, and handoff points",
  },
  {
    id: "02",
    title: "KPI architecture",
    description:
      "The plan defines the metrics and review views that matter.",
    visual: "Cycle time, stuck work, throughput, SLA",
  },
  {
    id: "03",
    title: "Alert logic and next actions",
    description:
      "Escalations, owners, and next moves are part of the system.",
    visual: "Triggers, ownership, and next steps",
  },
  {
    id: "04",
    title: "Shareable output",
    description:
      "Share it by link, export it, and refine section by section.",
    visual: "Shareable link with fast refinement",
  },
];

export const DEFAULT_VARIANT_SECTIONS: LandingVariantSections = {
  hero: {
    headline: "Tell us the bottleneck.\nWe design the system.",
    subheadline:
      "Turn one messy bottleneck into a clear agentic workflow, KPI layer, and next-step plan.",
    cta_text: "Book a Scoping Call",
    proof_line:
      "Preview plan in minutes. Shareable by link.",
  },
  demo: {
    eyebrow: "Live Demo",
    title: "See the agentic workflow",
    description:
      "Describe the bottleneck. The system asks a few questions, then streams the plan.",
  },
  proof: {
    eyebrow: "Results",
    title: "Case studies",
    description: "Real results from real operations teams.",
    featured_industries: [],
  },
  how_it_works: {
    eyebrow: "Process",
    title: "From bottleneck\nto agentic plan",
    steps: DEFAULT_HOW_IT_WORKS_STEPS,
  },
  features: {
    eyebrow: "Outputs",
    title: "What ships first",
    items: DEFAULT_FEATURE_ITEMS,
  },
  pricing: {
    eyebrow: "Pricing for every stage",
    title: "Simple, scoped\npricing",
    description:
      "Start with a free Discovery Call or scope a full engagement — every path begins with a clear operating plan.",
    highlighted_tier: "Build & Launch",
  },
  faq: {
    eyebrow: "FAQ",
    title: "Common questions",
    description: "",
  },
  final_cta: {
    eyebrow: "Ready to scope",
    title: "Design the next\nagentic workflow",
    description:
      "Start with one workflow. Leave with a plan your team can review and act on.",
    cta_text: "Book a Scoping Call",
  },
};

export function normalizeVariantSections(
  variant?: Partial<LandingVariant> | null
): LandingVariantSections {
  const sections = variant?.sections ?? {};

  return {
    hero: {
      headline: sections.hero?.headline ?? variant?.headline ?? DEFAULT_VARIANT_SECTIONS.hero.headline,
      subheadline:
        sections.hero?.subheadline ??
        variant?.subheadline ??
        DEFAULT_VARIANT_SECTIONS.hero.subheadline,
      cta_text: sections.hero?.cta_text ?? variant?.cta_text ?? DEFAULT_VARIANT_SECTIONS.hero.cta_text,
      proof_line: sections.hero?.proof_line ?? DEFAULT_VARIANT_SECTIONS.hero.proof_line,
    },
    demo: {
      eyebrow: sections.demo?.eyebrow ?? DEFAULT_VARIANT_SECTIONS.demo.eyebrow,
      title: sections.demo?.title ?? DEFAULT_VARIANT_SECTIONS.demo.title,
      description: sections.demo?.description ?? DEFAULT_VARIANT_SECTIONS.demo.description,
    },
    proof: {
      eyebrow: sections.proof?.eyebrow ?? DEFAULT_VARIANT_SECTIONS.proof.eyebrow,
      title: sections.proof?.title ?? DEFAULT_VARIANT_SECTIONS.proof.title,
      description: sections.proof?.description ?? DEFAULT_VARIANT_SECTIONS.proof.description,
      featured_industries:
        sections.proof?.featured_industries ??
        variant?.featured_industries ??
        DEFAULT_VARIANT_SECTIONS.proof.featured_industries,
    },
    how_it_works: {
      eyebrow:
        sections.how_it_works?.eyebrow ?? DEFAULT_VARIANT_SECTIONS.how_it_works.eyebrow,
      title: sections.how_it_works?.title ?? DEFAULT_VARIANT_SECTIONS.how_it_works.title,
      steps:
        sections.how_it_works?.steps?.length
          ? sections.how_it_works.steps.map((step, index) => ({
              id: step.id || DEFAULT_HOW_IT_WORKS_STEPS[index]?.id || String(index + 1).padStart(2, "0"),
              title: step.title,
              description: step.description,
            }))
          : DEFAULT_VARIANT_SECTIONS.how_it_works.steps,
    },
    features: {
      eyebrow: sections.features?.eyebrow ?? DEFAULT_VARIANT_SECTIONS.features.eyebrow,
      title: sections.features?.title ?? DEFAULT_VARIANT_SECTIONS.features.title,
      items:
        sections.features?.items?.length
          ? sections.features.items.map((item, index) => ({
              id: item.id || DEFAULT_FEATURE_ITEMS[index]?.id || String(index + 1).padStart(2, "0"),
              title: item.title,
              description: item.description,
              visual: item.visual,
            }))
          : DEFAULT_VARIANT_SECTIONS.features.items,
    },
    pricing: {
      eyebrow: sections.pricing?.eyebrow ?? DEFAULT_VARIANT_SECTIONS.pricing.eyebrow,
      title: sections.pricing?.title ?? DEFAULT_VARIANT_SECTIONS.pricing.title,
      description:
        sections.pricing?.description ?? DEFAULT_VARIANT_SECTIONS.pricing.description,
      highlighted_tier:
        sections.pricing?.highlighted_tier ?? DEFAULT_VARIANT_SECTIONS.pricing.highlighted_tier,
    },
    faq: {
      eyebrow: sections.faq?.eyebrow ?? DEFAULT_VARIANT_SECTIONS.faq.eyebrow,
      title: sections.faq?.title ?? DEFAULT_VARIANT_SECTIONS.faq.title,
      description: sections.faq?.description ?? DEFAULT_VARIANT_SECTIONS.faq.description,
    },
    final_cta: {
      eyebrow: sections.final_cta?.eyebrow ?? DEFAULT_VARIANT_SECTIONS.final_cta.eyebrow,
      title: sections.final_cta?.title ?? DEFAULT_VARIANT_SECTIONS.final_cta.title,
      description:
        sections.final_cta?.description ?? DEFAULT_VARIANT_SECTIONS.final_cta.description,
      cta_text:
        sections.final_cta?.cta_text ??
        variant?.cta_text ??
        DEFAULT_VARIANT_SECTIONS.final_cta.cta_text,
    },
  };
}
