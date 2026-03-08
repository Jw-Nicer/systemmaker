import { getPublishedCaseStudies, getIndustries } from "@/lib/firestore/case-studies";
import { ProofOfWorkClient } from "./ProofOfWorkClient";
import { matchesIndustryKey } from "@/lib/marketing/industry-key";

interface ProofOfWorkProps {
  featuredIndustries?: string[];
  eyebrow?: string;
  title?: string;
  description?: string;
}

export async function ProofOfWork({
  featuredIndustries,
  eyebrow,
  title,
  description,
}: ProofOfWorkProps = {}) {
  let caseStudies = await getPublishedCaseStudies();

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

  return (
    <ProofOfWorkClient
      caseStudies={caseStudies}
      industries={industries}
      eyebrow={eyebrow}
      title={title}
      description={description}
    />
  );
}
