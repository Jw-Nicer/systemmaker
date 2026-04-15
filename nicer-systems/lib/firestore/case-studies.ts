import { getAdminDb } from "@/lib/firebase/admin";
import { unstable_cache } from "next/cache";
import type { CaseStudy } from "@/types/case-study";
import { FALLBACK_CASE_STUDIES } from "@/lib/marketing/fallback-case-studies";
import { serializeDoc } from "./serialize";

export const getPublishedCaseStudies = unstable_cache(
  async (): Promise<CaseStudy[]> => {
    try {
      const db = getAdminDb();
      const snap = await db
        .collection("case_studies")
        .orderBy("sort_order", "asc")
        .get();

      return snap.docs
        .map((doc) => serializeDoc<CaseStudy>(doc))
        .filter((doc) => doc.status === "published");
    } catch (err) {
      console.error("[firestore] getPublishedCaseStudies failed:", err);
      return [];
    }
  },
  ["published-case-studies"],
  { revalidate: 60, tags: ["case-studies"] }
);

export async function getCaseStudyBySlug(
  slug: string
): Promise<CaseStudy | null> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("case_studies")
      .where("slug", "==", slug)
      .where("status", "==", "published")
      .limit(1)
      .get();

    if (snap.empty) return null;
    return serializeDoc<CaseStudy>(snap.docs[0]);
  } catch (err) {
    console.error("[firestore] getCaseStudyBySlug failed:", err);
    return null;
  }
}

export function getRelatedCaseStudies(
  current: CaseStudy,
  allStudies: CaseStudy[],
  limit = 3
): CaseStudy[] {
  const others = allStudies.filter((cs) => cs.id !== current.id);

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
}

export async function getAllCaseStudiesForPreview(): Promise<CaseStudy[]> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("case_studies")
      .orderBy("sort_order", "asc")
      .get();
    return snap.docs.map((doc) => serializeDoc<CaseStudy>(doc));
  } catch (err) {
    console.error("[firestore] getAllCaseStudiesForPreview failed:", err);
    return [];
  }
}

export function getIndustries(caseStudies: CaseStudy[]): string[] {
  const industries = new Set(caseStudies.map((cs) => cs.industry));
  return Array.from(industries).sort();
}

export function getPublicCaseStudies(caseStudies: CaseStudy[]): CaseStudy[] {
  return caseStudies.length > 0 ? caseStudies : FALLBACK_CASE_STUDIES;
}

export async function getResolvedPublicCaseStudies(): Promise<CaseStudy[]> {
  return getPublicCaseStudies(await getPublishedCaseStudies());
}

export async function getResolvedCaseStudyBySlug(
  slug: string
): Promise<CaseStudy | null> {
  const liveCaseStudy = await getCaseStudyBySlug(slug);
  if (liveCaseStudy) {
    return liveCaseStudy;
  }

  return FALLBACK_CASE_STUDIES.find((caseStudy) => caseStudy.slug === slug) ?? null;
}
