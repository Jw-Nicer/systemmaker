import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getVariantBySlug, getPublishedVariants } from "@/lib/firestore/variants";
import { BrushRevealHero } from "@/components/marketing/BrushRevealHero";
import { SeeItWork } from "@/components/marketing/SeeItWork";
import { ProofOfWork } from "@/components/marketing/ProofOfWork";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { PricingSection } from "@/components/marketing/PricingSection";
import { FAQSection } from "@/components/marketing/FAQSection";
import { FinalCTA } from "@/components/marketing/FinalCTA";
import { WorkflowGraph } from "@/components/marketing/WorkflowGraph";
import { LandingViewTracker } from "@/components/marketing/LandingViewTracker";
import { GlowLine } from "@/components/ui/GlowLine";

interface Props {
  params: Promise<{ industry: string }>;
}

// Reserve known routes so they don't get caught by this dynamic segment
const RESERVED_SLUGS = ["case-studies", "contact", "privacy", "terms"];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { industry } = await params;
  if (RESERVED_SLUGS.includes(industry)) return {};

  const variant = await getVariantBySlug(industry);
  if (!variant) return {};

  return {
    title: variant.meta_title,
    description: variant.meta_description,
  };
}

export async function generateStaticParams() {
  const variants = await getPublishedVariants();
  return variants.map((v) => ({ industry: v.slug }));
}

export default async function IndustryLandingPage({ params }: Props) {
  const { industry } = await params;

  // Don't intercept known static routes
  if (RESERVED_SLUGS.includes(industry)) notFound();

  const variant = await getVariantBySlug(industry);
  if (!variant) notFound();

  return (
    <>
      <LandingViewTracker />
      <BrushRevealHero
        headline={variant.headline}
        subheadline={variant.subheadline}
        ctaText={variant.cta_text}
      />

      <div className="relative">
        <WorkflowGraph />
        <GlowLine />
        <SeeItWork />
        <GlowLine />
        <ProofOfWork featuredIndustries={variant.featured_industries} />
        <GlowLine />
        <HowItWorks />
        <GlowLine />
        <PricingSection />
        <GlowLine />
        <FAQSection />
      </div>

      <FinalCTA ctaText={variant.cta_text} />
    </>
  );
}
