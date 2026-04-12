import type { CaseStudy, ResultCategory } from "@/types/case-study";

export interface CaseStudyFilterState {
  industry: string;
  workflowType: string;
  resultCategory: ResultCategory | "All";
}

/**
 * Pure filter predicate for case studies. Pulled out of
 * `CaseStudiesListClient.tsx` and `ProofOfWorkClient.tsx` so the same
 * logic can be unit tested without a DOM.
 *
 * "All" on any dimension means "do not filter on this dimension".
 * Unknown/empty fields on the case study are treated as non-matches
 * against any specific filter value (so they only appear when the
 * filter is "All").
 */
export function matchesCaseStudyFilters(
  cs: CaseStudy,
  filters: CaseStudyFilterState
): boolean {
  if (filters.industry !== "All" && cs.industry !== filters.industry) {
    return false;
  }
  if (
    filters.workflowType !== "All" &&
    cs.workflow_type !== filters.workflowType
  ) {
    return false;
  }
  if (
    filters.resultCategory !== "All" &&
    !(cs.result_categories ?? []).includes(filters.resultCategory)
  ) {
    return false;
  }
  return true;
}

/**
 * Collect the set of result categories that actually appear in a list
 * of case studies. Used by the filter UI so the chip set reflects the
 * data instead of showing every possible value from the static taxonomy.
 */
export function collectResultCategories(
  caseStudies: CaseStudy[]
): ResultCategory[] {
  const seen = new Set<ResultCategory>();
  for (const cs of caseStudies) {
    for (const cat of cs.result_categories ?? []) {
      seen.add(cat);
    }
  }
  return Array.from(seen);
}

/**
 * Collect the set of non-empty workflow_type values present in a list
 * of case studies, sorted alphabetically. Used by the server component
 * to build the workflow filter chip list.
 */
export function collectWorkflowTypes(caseStudies: CaseStudy[]): string[] {
  const seen = new Set<string>();
  for (const cs of caseStudies) {
    const wt = cs.workflow_type?.trim();
    if (wt) seen.add(wt);
  }
  return Array.from(seen).sort();
}
