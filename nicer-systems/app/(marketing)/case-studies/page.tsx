import { getPublishedCaseStudies, getIndustries } from "@/lib/firestore/case-studies";
import { CaseStudiesListClient } from "./CaseStudiesListClient";

export default async function CaseStudiesPage() {
  const caseStudies = await getPublishedCaseStudies();
  const industries = getIndustries(caseStudies);

  return <CaseStudiesListClient caseStudies={caseStudies} industries={industries} />;
}
