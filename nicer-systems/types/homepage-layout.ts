/**
 * Homepage layout — admin-managed ordering + visibility for the
 * marketing landing page sections.
 *
 * The layout is stored as a single Firestore document at
 * `site_settings/homepage_layout` (avoiding a new collection for a
 * single-document config). The marketing landing page reads this at
 * request time and renders sections in the configured order, skipping
 * any with `enabled: false`.
 *
 * Structural elements (analytics trackers, experiment bucketing,
 * JSON-LD) are NOT part of this layout — they stay hardcoded in
 * `page.tsx` because they have no admin-facing meaning.
 */

/**
 * The stable set of landing-page section keys.
 *
 * When adding a new marketing section:
 *  1. Add its key here
 *  2. Add a default entry to `DEFAULT_HOMEPAGE_LAYOUT` below
 *  3. Add a display label + description to `SECTION_REGISTRY` below
 *  4. Map the key to its React component in
 *     `app/(marketing)/page.tsx` via `SECTION_COMPONENTS`
 *
 * All four edits are required — the admin UI, the Firestore schema,
 * and the page renderer all key off this union.
 */
export const HOMEPAGE_SECTION_KEYS = [
  "hero",
  "proof_of_work",
  "testimonials",
  "is_this_for_you",
  "how_it_works",
  "see_it_work",
  "why_not_diy",
  "computer_features",
  "pricing",
  "faq",
  "final_cta",
] as const;

export type HomepageSectionKey = (typeof HOMEPAGE_SECTION_KEYS)[number];

export interface HomepageSection {
  key: HomepageSectionKey;
  enabled: boolean;
  sort_order: number;
}

export interface HomepageLayout {
  sections: HomepageSection[];
  /** ISO timestamp — updated on admin save. */
  updated_at?: string;
}

/**
 * Metadata for each section the admin UI uses to render its row.
 * Kept next to the key union so a rename forces you to update both.
 */
export interface SectionRegistryEntry {
  label: string;
  description: string;
  /**
   * When true the section is treated as "structural" — the admin UI
   * will show a warning if you disable it. Used for sections like the
   * hero that the landing page is basically unusable without.
   */
  recommended: boolean;
}

export const SECTION_REGISTRY: Record<HomepageSectionKey, SectionRegistryEntry> = {
  hero: {
    label: "Hero",
    description:
      "Brush reveal hero with the primary CTA. Usually the first thing a visitor sees.",
    recommended: true,
  },
  proof_of_work: {
    label: "Proof of work",
    description:
      "Case studies gallery with industry + workflow + result category filters.",
    recommended: true,
  },
  testimonials: {
    label: "Testimonials",
    description: "Quote cards pulled from the testimonials CMS.",
    recommended: false,
  },
  is_this_for_you: {
    label: "Is this for you?",
    description:
      "Persona cards: Ops Owner, Founder/GM, Internal Admin. Helps visitors self-identify.",
    recommended: false,
  },
  how_it_works: {
    label: "How it works",
    description: "3-step process overview.",
    recommended: false,
  },
  see_it_work: {
    label: "See it work (live chat demo)",
    description:
      "The interactive chat agent that generates preview plans. The most important on-page conversion surface after the hero.",
    recommended: true,
  },
  why_not_diy: {
    label: "Why not DIY",
    description:
      "Competitive differentiation grid vs. generic tools, consultants, and automation platforms.",
    recommended: false,
  },
  computer_features: {
    label: "Features panel",
    description: "Feature grid with the stylized computer-screen mock.",
    recommended: false,
  },
  pricing: {
    label: "Pricing",
    description: "Pricing tiers from the offers CMS.",
    recommended: false,
  },
  faq: {
    label: "FAQ",
    description: "Accordion pulled from the FAQs CMS.",
    recommended: false,
  },
  final_cta: {
    label: "Final CTA",
    description: "Closing banner with the primary CTA. Usually the last thing.",
    recommended: true,
  },
};

/**
 * The baseline layout — what the landing page renders when Firestore
 * has no `homepage_layout` doc yet (new deploy, empty DB, etc.). Must
 * match the canonical order the page.tsx file used to hardcode.
 *
 * Every key in HOMEPAGE_SECTION_KEYS must appear exactly once here.
 */
export const DEFAULT_HOMEPAGE_LAYOUT: HomepageLayout = {
  sections: [
    { key: "hero", enabled: true, sort_order: 0 },
    { key: "proof_of_work", enabled: true, sort_order: 1 },
    { key: "testimonials", enabled: true, sort_order: 2 },
    { key: "is_this_for_you", enabled: true, sort_order: 3 },
    { key: "how_it_works", enabled: true, sort_order: 4 },
    { key: "see_it_work", enabled: true, sort_order: 5 },
    { key: "why_not_diy", enabled: true, sort_order: 6 },
    { key: "computer_features", enabled: true, sort_order: 7 },
    { key: "pricing", enabled: true, sort_order: 8 },
    { key: "faq", enabled: true, sort_order: 9 },
    { key: "final_cta", enabled: true, sort_order: 10 },
  ],
};
