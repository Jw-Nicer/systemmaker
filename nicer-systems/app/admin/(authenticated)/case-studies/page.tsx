import { getAllCaseStudies } from "@/lib/actions/case-studies";
import CaseStudiesManager from "./CaseStudiesManager";

export default async function AdminCaseStudiesPage() {
  const caseStudies = await getAllCaseStudies();

  return <CaseStudiesManager initialData={caseStudies} />;
}
