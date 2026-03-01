import { getAdminDb } from "@/lib/firebase/admin";
import type { IndustryPage } from "@/types/industry-page";

export async function getPublishedIndustryPages(): Promise<IndustryPage[]> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("industry_pages")
      .where("is_published", "==", true)
      .orderBy("sort_order", "asc")
      .get();

    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as IndustryPage);
  } catch {
    return [];
  }
}

export async function getIndustryPageBySlug(
  slug: string
): Promise<IndustryPage | null> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("industry_pages")
      .where("slug", "==", slug)
      .where("is_published", "==", true)
      .limit(1)
      .get();

    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() } as IndustryPage;
  } catch {
    return null;
  }
}
