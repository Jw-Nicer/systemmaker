import { notFound } from "next/navigation";
import Link from "next/link";
import { getIndustryPageBySlug } from "@/lib/firestore/industry-pages";
import { getPublishedCaseStudies } from "@/lib/firestore/case-studies";
import { SeeItWork } from "@/components/marketing/SeeItWork";
import { FinalCTA } from "@/components/marketing/FinalCTA";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { IndustryHero } from "@/components/marketing/IndustryHero";
import { IndustryProof } from "@/components/marketing/IndustryProof";
import { LandingViewTracker } from "@/components/marketing/LandingViewTracker";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const page = await getIndustryPageBySlug(slug);
  if (!page) return {};
  return {
    title: page.meta_title,
    description: page.meta_description,
  };
}

export default async function IndustryPage({ params }: Props) {
  const { slug } = await params;
  const page = await getIndustryPageBySlug(slug);

  if (!page) notFound();

  // Fetch case studies matching this industry
  const allCaseStudies = await getPublishedCaseStudies();
  const industryCaseStudies = allCaseStudies.filter(
    (cs) => cs.industry.toLowerCase() === page.industry_name.toLowerCase()
  );

  return (
    <>
      <LandingViewTracker />
      <IndustryHero page={page} />

      {/* Pain Points */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-8 text-center">
            Common {page.industry_name} Bottlenecks We Solve
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {page.pain_points.map((point, i) => (
              <div
                key={i}
                className="flex gap-3 p-4 rounded-xl border border-border bg-surface"
              >
                <span className="text-primary font-bold text-lg shrink-0">
                  {i + 1}.
                </span>
                <p className="text-muted">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industry-specific proof */}
      {industryCaseStudies.length > 0 && (
        <IndustryProof
          caseStudies={industryCaseStudies}
          industryName={page.industry_name}
        />
      )}

      <SeeItWork />
      <HowItWorks />
      <FinalCTA />
    </>
  );
}
