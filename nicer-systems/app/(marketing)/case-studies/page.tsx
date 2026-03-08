import type { Metadata } from "next";
import { getPublishedCaseStudies, getIndustries } from "@/lib/firestore/case-studies";
import { CaseStudiesListClient } from "./CaseStudiesListClient";

export const metadata: Metadata = {
  title: "Case Studies | Nicer Systems",
  description:
    "Real automation results for admin-heavy businesses. See how we mapped workflows, built dashboards, and eliminated repetitive work.",
  openGraph: {
    title: "Case Studies | Nicer Systems",
    description:
      "Real automation results for admin-heavy businesses. See how we mapped workflows, built dashboards, and eliminated repetitive work.",
    type: "website",
    siteName: "Nicer Systems",
  },
  twitter: {
    card: "summary",
    title: "Case Studies | Nicer Systems",
    description:
      "Real automation results for admin-heavy businesses.",
  },
};

export default async function CaseStudiesPage() {
  const caseStudies = await getPublishedCaseStudies();
  const industries = getIndustries(caseStudies);

  return <CaseStudiesListClient caseStudies={caseStudies} industries={industries} />;
}
