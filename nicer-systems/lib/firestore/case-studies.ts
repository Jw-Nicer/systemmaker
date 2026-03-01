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

export async function getRelatedCaseStudies(
  current: CaseStudy,
  limit = 3
): Promise<CaseStudy[]> {
  try {
    const all = await getPublishedCaseStudies();
    const others = all.filter((cs) => cs.id !== current.id);

    // Score by: same industry (2 pts) + each shared tool (1 pt)
    const scored = others.map((cs) => {
      let score = 0;
      if (cs.industry === current.industry) score += 2;
      for (const tool of cs.tools) {
        if (current.tools.includes(tool)) score += 1;
      }
      return { cs, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.cs);
  } catch {
    return [];
  }
}

export async function getIndustries(
  caseStudies: CaseStudy[]
): Promise<string[]> {
  const industries = new Set(caseStudies.map((cs) => cs.industry));
  return Array.from(industries).sort();
}
