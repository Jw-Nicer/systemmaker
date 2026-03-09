import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/firebase/auth";
import { getAllCaseStudiesForPreview } from "@/lib/firestore/case-studies";
import { getAllTestimonialsForPreview } from "@/lib/firestore/testimonials";
import { getAllFAQsForPreview } from "@/lib/firestore/faqs";
import { getAllOffersForPreview } from "@/lib/firestore/offers";
import { getHomepageExperiments } from "@/lib/firestore/experiments";
import { SeeItWork } from "@/components/marketing/SeeItWork";
import { ProofOfWork } from "@/components/marketing/ProofOfWork";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { ComputerFeatures } from "@/components/marketing/ComputerFeatures";
import { PricingSection } from "@/components/marketing/PricingSection";
import { FAQSection } from "@/components/marketing/FAQSection";
import { TestimonialsSection } from "@/components/marketing/TestimonialsSection";
import { PreviewBanner } from "@/components/marketing/PreviewBanner";
import {
  HomepageExperimentFinalCTA,
  HomepageExperimentHero,
} from "@/components/marketing/homepage-experiments";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function SitePreviewPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/admin/login");
  }

  const [caseStudies, testimonials, faqs, offers, experiments] =
    await Promise.all([
      getAllCaseStudiesForPreview(),
      getAllTestimonialsForPreview(),
      getAllFAQsForPreview(),
      getAllOffersForPreview(),
      getHomepageExperiments(),
    ]);

  return (
    <>
      <PreviewBanner
        draftCounts={{
          caseStudies: caseStudies.filter((cs) => !cs.is_published).length,
          testimonials: testimonials.filter((t) => !t.is_published).length,
          faqs: faqs.filter((f) => !f.is_published).length,
          offers: offers.filter((o) => !o.is_published).length,
        }}
      />
      <HomepageExperimentHero experiments={experiments} />
      <SeeItWork />
      <ProofOfWork caseStudiesData={caseStudies} />
      <TestimonialsSection testimonialsData={testimonials} />
      <HowItWorks />
      <ComputerFeatures />
      <PricingSection offersData={offers} />
      <FAQSection faqsData={faqs} />
      <HomepageExperimentFinalCTA experiments={experiments} />
    </>
  );
}
