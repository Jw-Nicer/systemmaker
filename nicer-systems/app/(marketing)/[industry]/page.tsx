import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getVariantBySlug, getPublishedVariants } from "@/lib/firestore/variants";
import { VariantLandingPage } from "@/components/marketing/VariantLandingPage";
import { isReservedMarketingSlug } from "@/lib/marketing/reserved-slugs";
import { normalizeVariantSections } from "@/lib/marketing/variant-content";

interface Props {
  params: Promise<{ industry: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { industry } = await params;
  if (isReservedMarketingSlug(industry)) return {};

  const variant = await getVariantBySlug(industry);
  if (!variant) return {};

  return {
    title: variant.meta_title,
    description: variant.meta_description,
    openGraph: {
      title: variant.meta_title,
      description: variant.meta_description,
      type: "website",
      siteName: "Nicer Systems",
    },
    twitter: {
      card: "summary_large_image",
      title: variant.meta_title,
      description: variant.meta_description,
    },
  };
}

export async function generateStaticParams() {
  const variants = await getPublishedVariants();
  return variants.map((v) => ({ industry: v.slug }));
}

export default async function IndustryLandingPage({ params }: Props) {
  const { industry } = await params;

  // Don't intercept known static routes
  if (isReservedMarketingSlug(industry)) notFound();

  const variant = await getVariantBySlug(industry);
  if (!variant) notFound();
  const sections = normalizeVariantSections(variant);

  return (
    <VariantLandingPage
      landingPath={`/${variant.slug}`}
      industrySlug={variant.slug}
      industryName={variant.industry}
      sections={sections}
    />
  );
}
