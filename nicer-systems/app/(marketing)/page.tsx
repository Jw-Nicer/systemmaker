import type { Metadata } from "next";
import { SeeItWork } from "@/components/marketing/SeeItWork";
import { ProofOfWork } from "@/components/marketing/ProofOfWork";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { ComputerFeatures } from "@/components/marketing/ComputerFeatures";
import { PricingSection } from "@/components/marketing/PricingSection";
import { FAQSection } from "@/components/marketing/FAQSection";
import { TestimonialsSection } from "@/components/marketing/TestimonialsSection";
import { IsThisForYou } from "@/components/marketing/IsThisForYou";
import { WhyNotDIY } from "@/components/marketing/WhyNotDIY";
import { LandingViewTracker } from "@/components/marketing/LandingViewTracker";
import {
  HomepageExperimentFinalCTA,
  HomepageExperimentHero,
  HomepageExperimentTracker,
} from "@/components/marketing/homepage-experiments";
import { getHomepageExperiments } from "@/lib/firestore/experiments";
import { getHomepageLayout } from "@/lib/firestore/homepage-layout";
import { visibleHomepageSections } from "@/lib/marketing/homepage-layout-resolver";
import type { HomepageSectionKey } from "@/types/homepage-layout";
import type { Experiment } from "@/types/experiment";
import { Fragment } from "react";

export const metadata: Metadata = {
  title: "Nicer Systems — Automation & Ops Visibility for Admin-Heavy Businesses",
  description:
    "Tell us the problem. We'll build the system. Workflow mapping, KPI dashboards, alert rules, and automation for operations teams.",
  openGraph: {
    title: "Nicer Systems — Automation & Ops Visibility",
    description:
      "Workflow mapping, KPI dashboards, alert rules, and automation for operations teams.",
    images: [{ url: "/opengraph-image" }],
    type: "website",
    siteName: "Nicer Systems",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nicer Systems — Automation & Ops Visibility",
    description:
      "Tell us the problem. We'll build the system.",
    images: ["/opengraph-image"],
  },
};

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

/**
 * Map each HomepageSectionKey to the React node that renders it.
 *
 * A few sections (hero + final_cta) depend on the experiments data that
 * the page pre-fetches, so they accept it as a prop. All other sections
 * are self-sufficient — they fetch their own data or render statically.
 *
 * When adding a new section: add its key to HOMEPAGE_SECTION_KEYS in
 * `types/homepage-layout.ts`, add a default layout entry, add a
 * SECTION_REGISTRY entry, then add its renderer here.
 */
function renderSection(
  key: HomepageSectionKey,
  experiments: Experiment[]
): React.ReactNode {
  switch (key) {
    case "hero":
      return <HomepageExperimentHero experiments={experiments} />;
    case "proof_of_work":
      return <ProofOfWork />;
    case "testimonials":
      return <TestimonialsSection />;
    case "is_this_for_you":
      return <IsThisForYou />;
    case "how_it_works":
      return <HowItWorks />;
    case "see_it_work":
      return <SeeItWork />;
    case "why_not_diy":
      return <WhyNotDIY />;
    case "computer_features":
      return <ComputerFeatures />;
    case "pricing":
      return <PricingSection />;
    case "faq":
      return <FAQSection />;
    case "final_cta":
      return <HomepageExperimentFinalCTA experiments={experiments} />;
  }
}

export default async function LandingPage() {
  const [homepageExperiments, layout] = await Promise.all([
    getHomepageExperiments(),
    getHomepageLayout(),
  ]);

  const sections = visibleHomepageSections(layout);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <LandingViewTracker landingPath="/" />
      <HomepageExperimentTracker experiments={homepageExperiments} />
      {sections.map((section) => (
        <Fragment key={section.key}>
          {renderSection(section.key, homepageExperiments)}
        </Fragment>
      ))}
    </>
  );
}
