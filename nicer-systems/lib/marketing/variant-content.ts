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
      "Share the workflow that keeps breaking down. The agent gathers the industry, bottleneck, tool stack, urgency, and volume before it builds anything.",
  },
  {
    id: "02",
    title: "Generate the preview plan",
    description:
      "The backend runs the planning pipeline and streams each section back as it is completed, so you can review the plan while it is still being assembled.",
  },
  {
    id: "03",
    title: "Share, refine, and follow up",
    description:
      "Once the plan is generated, you can share the public plan URL, print it to PDF, refine individual sections, or ask follow-up questions about the recommendation.",
  },
];

export const DEFAULT_FEATURE_ITEMS: LandingFeatureItem[] = [
  {
    id: "01",
    title: "Workflow mapping built around your existing process",
    description:
      "We start from the bottleneck you already have. No generic automation pitch — we map your actual workflow, identify the handoff gaps, and scope a concrete fix.",
    visual: "end-to-end process map with handoff points highlighted",
  },
  {
    id: "02",
    title: "KPI and dashboard recommendations",
    description:
      "Each preview plan defines the KPIs and dashboard views that should exist for the workflow before implementation starts.",
    visual: "dashboard specification showing cycle time, stuck items, and throughput",
  },
  {
    id: "03",
    title: "Alerts and next actions before problems escalate",
    description:
      "The plan includes alert recommendations and ownership so the output ends with decisions and next steps, not just a diagram.",
    visual: "alert recommendation tied to a stuck handoff and owner",
  },
  {
    id: "04",
    title: "Shareable plan output",
    description:
      "Completed preview plans can be shared by URL, printed to PDF, and refined section by section as the recommendation evolves.",
    visual: "public preview plan link with section refinement controls",
  },
];

export const DEFAULT_VARIANT_SECTIONS: LandingVariantSections = {
  hero: {
    headline: "Tell us the problem.\nWe'll build the system.",
    subheadline:
      "Turn a messy operational bottleneck into a concrete preview plan. We map the workflow, define the KPIs, outline the alerts, and show the next actions before implementation starts.",
    cta_text: "Book a Scoping Call",
    proof_line:
      "Get a shareable preview plan with workflow, KPI, and alert recommendations.",
  },
  demo: {
    eyebrow: "Live Demo",
    title: "Build a preview plan",
    description:
      "Tell the agent about your bottleneck. It asks a few intake questions, then streams a draft preview plan with workflow stages, KPIs, alerts, and recommended actions.",
  },
  proof: {
    eyebrow: "Results",
    title: "Case studies",
    description: "Real results from real operations teams.",
    featured_industries: [],
  },
  how_it_works: {
    eyebrow: "How it works",
    title: "From bottleneck\nto preview plan",
    steps: DEFAULT_HOW_IT_WORKS_STEPS,
  },
  features: {
    eyebrow: "Deliverables",
    title: "What you get",
    items: DEFAULT_FEATURE_ITEMS,
  },
  pricing: {
    eyebrow: "Pricing",
    title: "Simple, outcome-based\npricing",
    description:
      "Every engagement starts with a scoping call. We confirm the workflow, define the deliverables, and align the implementation plan to your actual operating stack.",
    highlighted_tier: "Growth",
  },
  faq: {
    eyebrow: "FAQ",
    title: "Common questions",
    description: "",
  },
  final_cta: {
    eyebrow: "Available now",
    title: "Put the workflow\nin focus",
    description:
      "Start with a scoping conversation, generate a preview plan, and use it to align the workflow, metrics, alerts, and implementation scope before any build work starts.",
    cta_text: "Start the Scoping Call",
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
