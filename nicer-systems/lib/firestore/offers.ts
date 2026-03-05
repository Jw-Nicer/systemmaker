import { getAdminDb } from "@/lib/firebase/admin";
import { unstable_cache } from "next/cache";
import type { Offer } from "@/types/offer";

export const getPublishedOffers = unstable_cache(
  async (): Promise<Offer[]> => {
    try {
      const db = getAdminDb();
      const snap = await db
        .collection("offers")
        .where("is_published", "==", true)
        .orderBy("sort_order", "asc")
        .get();

      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Offer);
    } catch {
      return [];
    }
  },
  ["published-offers"],
  { revalidate: 60, tags: ["offers"] }
);
