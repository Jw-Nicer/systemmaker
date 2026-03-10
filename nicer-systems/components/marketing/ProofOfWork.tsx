import { getPublishedCaseStudies, getIndustries } from "@/lib/firestore/case-studies";
import { ProofOfWorkClient } from "./ProofOfWorkClient";
import { matchesIndustryKey } from "@/lib/marketing/industry-key";
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
  let caseStudies = caseStudiesData ?? await getPublishedCaseStudies();

  // Filter to featured industries if provided (variant pages)
  if (featuredIndustries && featuredIndustries.length > 0) {
    const filtered = caseStudies.filter((cs) =>
      matchesIndustryKey(cs.industry, featuredIndustries)
    );
    if (filtered.length > 0) caseStudies = filtered;
  }

  const industries = await getIndustries(caseStudies);
  if (caseStudies.length === 0) {
    return null;
  }

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
