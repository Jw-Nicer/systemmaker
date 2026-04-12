import type { Metadata } from "next";
import { getPublishedCaseStudies, getIndustries } from "@/lib/firestore/case-studies";
import { FALLBACK_CASE_STUDIES } from "@/lib/marketing/fallback-case-studies";
import { collectWorkflowTypes } from "@/lib/marketing/case-study-filters";
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
  const liveCaseStudies = await getPublishedCaseStudies();
  const caseStudies =
    liveCaseStudies.length > 0 ? liveCaseStudies : FALLBACK_CASE_STUDIES;
  const industries = getIndustries(caseStudies);
  const workflowTypes = collectWorkflowTypes(caseStudies);

  return (
    <CaseStudiesListClient
      caseStudies={caseStudies}
      industries={industries}
      workflowTypes={workflowTypes}
    />
  );
}
