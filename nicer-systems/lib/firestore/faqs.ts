import { getAdminDb } from "@/lib/firebase/admin";
import { unstable_cache } from "next/cache";
import type { FAQ } from "@/types/faq";

export const getPublishedFAQs = unstable_cache(
  async (): Promise<FAQ[]> => {
    try {
      const db = getAdminDb();
      const snap = await db
        .collection("faqs")
        .where("is_published", "==", true)
        .orderBy("sort_order", "asc")
        .get();

      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as FAQ);
    } catch {
      return [];
    }
  },
  ["published-faqs"],
  { revalidate: 60, tags: ["faqs"] }
);
