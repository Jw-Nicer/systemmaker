import { getPublishedCaseStudies, getIndustries } from "@/lib/firestore/case-studies";
import { ProofOfWorkClient } from "./ProofOfWorkClient";
import { matchesIndustryKey } from "@/lib/marketing/industry-key";
import { FALLBACK_CASE_STUDIES } from "@/lib/marketing/fallback-case-studies";
import type { CaseStudy } from "@/types/case-study";

interface ProofOfWorkProps {
  featuredIndustries?: string[];
  eyebrow?: string;
  title?: string;
  description?: string;
  caseStudiesData?: CaseStudy[];
}

export async function ProofOfWork({
  featuredIndustries,
  eyebrow,
  title,
  description,
  caseStudiesData,
}: ProofOfWorkProps = {}) {
  const liveCaseStudies = caseStudiesData ?? await getPublishedCaseStudies();
  let caseStudies = liveCaseStudies.length > 0 ? liveCaseStudies : FALLBACK_CASE_STUDIES;

  // Filter to featured industries if provided (variant pages)
  if (featuredIndustries && featuredIndustries.length > 0) {
    const filtered = caseStudies.filter((cs) =>
      matchesIndustryKey(cs.industry, featuredIndustries)
    );
    if (filtered.length > 0) caseStudies = filtered;
  }

  const industries = await getIndustries(caseStudies);
  const workflowTypes = Array.from(
    new Set(caseStudies.map((cs) => cs.workflow_type).filter(Boolean))
  ).sort();

  return (
    <ProofOfWorkClient
      caseStudies={caseStudies}
      industries={industries}
      workflowTypes={workflowTypes}
      eyebrow={eyebrow}
      title={title}
      description={description}
    />
  );
}
