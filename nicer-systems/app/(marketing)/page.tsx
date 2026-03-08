import { SeeItWork } from "@/components/marketing/SeeItWork";
import { ProofOfWork } from "@/components/marketing/ProofOfWork";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { ComputerFeatures } from "@/components/marketing/ComputerFeatures";
import { PricingSection } from "@/components/marketing/PricingSection";
import { FAQSection } from "@/components/marketing/FAQSection";
import { TestimonialsSection } from "@/components/marketing/TestimonialsSection";
import { LandingViewTracker } from "@/components/marketing/LandingViewTracker";
import {
  HomepageExperimentFinalCTA,
  HomepageExperimentHero,
  HomepageExperimentTracker,
} from "@/components/marketing/homepage-experiments";
import { getHomepageExperiments } from "@/lib/firestore/experiments";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Nicer Systems",
  url: "https://nicer-systems.web.app",
  description:
    "Automation and ops visibility systems for admin-heavy businesses.",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "sales",
    url: "https://nicer-systems.web.app/contact",
  },
};

export default async function LandingPage() {
  const homepageExperiments = await getHomepageExperiments();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <LandingViewTracker landingPath="/" />
      <HomepageExperimentTracker experiments={homepageExperiments} />
      <HomepageExperimentHero experiments={homepageExperiments} />
      <SeeItWork />
      <ProofOfWork />
      <TestimonialsSection />
      <HowItWorks />
      <ComputerFeatures />
      <PricingSection />
      <FAQSection />
      <HomepageExperimentFinalCTA experiments={homepageExperiments} />
    </>
  );
}
