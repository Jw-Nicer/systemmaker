import { getAdminDb } from "@/lib/firebase/admin";
import type { CaseStudy } from "@/types/case-study";

export async function getPublishedCaseStudies(): Promise<CaseStudy[]> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("case_studies")
      .where("is_published", "==", true)
      .orderBy("sort_order", "asc")
      .get();

    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as CaseStudy);
  } catch {
    // Index may not exist yet or collection is empty
    return [];
  }
}

export async function getCaseStudyBySlug(
  slug: string
): Promise<CaseStudy | null> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("case_studies")
      .where("slug", "==", slug)
      .where("is_published", "==", true)
      .limit(1)
      .get();

    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() } as CaseStudy;
  } catch {
    return null;
  }
}

export async function getIndustries(
  caseStudies: CaseStudy[]
): Promise<string[]> {
  const industries = new Set(caseStudies.map((cs) => cs.industry));
  return Array.from(industries).sort();
}
