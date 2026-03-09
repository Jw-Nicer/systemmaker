import { getAdminDb } from "@/lib/firebase/admin";
import { unstable_cache } from "next/cache";
import type { FAQ } from "@/types/faq";
import { serializeDoc } from "./serialize";

export const getPublishedFAQs = unstable_cache(
  async (): Promise<FAQ[]> => {
    try {
      const db = getAdminDb();
      const snap = await db
        .collection("faqs")
        .where("is_published", "==", true)
        .orderBy("sort_order", "asc")
        .get();

      return snap.docs.map((doc) => serializeDoc<FAQ>(doc));
    } catch (err) {
      console.error("[firestore] getPublishedFAQs failed:", err);
      return [];
    }
  },
  ["published-faqs"],
  { revalidate: 60, tags: ["faqs"] }
);

export async function getAllFAQsForPreview(): Promise<FAQ[]> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("faqs")
      .orderBy("sort_order", "asc")
      .get();
    return snap.docs.map((doc) => serializeDoc<FAQ>(doc));
  } catch (err) {
    console.error("[firestore] getAllFAQsForPreview failed:", err);
    return [];
  }
}
