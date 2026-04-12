export interface LandingHeroConfig {
  headline: string;
  subheadline: string;
  cta_text: string;
  proof_line: string;
}

export interface LandingSectionIntroConfig {
  eyebrow: string;
  title: string;
  description: string;
}

export interface LandingHowItWorksStep {
  id: string;
  title: string;
  description: string;
}

export interface LandingFeatureItem {
  id: string;
  title: string;
  description: string;
  visual: string;
  imageUrl?: string;
}

export interface LandingProofConfig extends LandingSectionIntroConfig {
  featured_industries: string[];
}

export interface LandingPricingConfig extends LandingSectionIntroConfig {
  highlighted_tier?: string;
}

export interface LandingFinalCtaConfig {
  eyebrow: string;
  title: string;
  description: string;
  cta_text: string;
}

export interface LandingVariantSections {
  hero: LandingHeroConfig;
  demo: LandingSectionIntroConfig;
  proof: LandingProofConfig;
  how_it_works: {
    eyebrow: string;
    title: string;
    steps: LandingHowItWorksStep[];
  };
  features: {
    eyebrow: string;
    title: string;
    items: LandingFeatureItem[];
  };
  pricing: LandingPricingConfig;
  faq: LandingSectionIntroConfig;
  final_cta: LandingFinalCtaConfig;
}

export interface LandingVariant {
  id: string;
  slug: string; // URL slug e.g. "healthcare"
  industry: string; // Display name e.g. "Healthcare"
  headline: string;
  subheadline: string;
  cta_text: string;
  meta_title: string;
  meta_description: string;
  featured_industries: string[]; // Legacy filter field, kept for backward compatibility
  sections?: Partial<LandingVariantSections>;
  is_published: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}
