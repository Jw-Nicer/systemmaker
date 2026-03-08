import type { LandingVariantSections } from "@/types/variant";
import { BrushRevealHero } from "@/components/marketing/BrushRevealHero";
import { SeeItWork } from "@/components/marketing/SeeItWork";
import { ProofOfWork } from "@/components/marketing/ProofOfWork";
import { TestimonialsSection } from "@/components/marketing/TestimonialsSection";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { ComputerFeatures } from "@/components/marketing/ComputerFeatures";
import { PricingSection } from "@/components/marketing/PricingSection";
import { FAQSection } from "@/components/marketing/FAQSection";
import { FinalCTA } from "@/components/marketing/FinalCTA";
import { LandingViewTracker } from "@/components/marketing/LandingViewTracker";

export async function VariantLandingPage({
  landingPath,
  industrySlug,
  industryName,
  sections,
}: {
  landingPath: string;
  industrySlug: string;
  industryName: string;
  sections: LandingVariantSections;
}) {
  return (
    <>
      <LandingViewTracker
        landingPath={landingPath}
        industrySlug={industrySlug}
        industryName={industryName}
      />
      <BrushRevealHero
        headline={sections.hero.headline}
        subheadline={sections.hero.subheadline}
        ctaText={sections.hero.cta_text}
        proofLine={sections.hero.proof_line}
      />
      <SeeItWork
        eyebrow={sections.demo.eyebrow}
        title={sections.demo.title}
        description={sections.demo.description}
      />
      <ProofOfWork
        featuredIndustries={sections.proof.featured_industries}
        eyebrow={sections.proof.eyebrow}
        title={sections.proof.title}
        description={sections.proof.description}
      />
      <TestimonialsSection />
      <HowItWorks
        eyebrow={sections.how_it_works.eyebrow}
        title={sections.how_it_works.title}
        steps={sections.how_it_works.steps}
      />
      <ComputerFeatures
        eyebrow={sections.features.eyebrow}
        title={sections.features.title}
        features={sections.features.items}
      />
      <PricingSection
        eyebrow={sections.pricing.eyebrow}
        title={sections.pricing.title}
        description={sections.pricing.description}
        highlightedTier={sections.pricing.highlighted_tier}
      />
      <FAQSection
        eyebrow={sections.faq.eyebrow}
        title={sections.faq.title}
        description={sections.faq.description}
      />
      <FinalCTA
        eyebrow={sections.final_cta.eyebrow}
        title={sections.final_cta.title}
        description={sections.final_cta.description}
        ctaText={sections.final_cta.cta_text}
      />
    </>
  );
}
