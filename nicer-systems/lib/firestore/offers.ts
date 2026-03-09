import { getAdminDb } from "@/lib/firebase/admin";
import { unstable_cache } from "next/cache";
import type { Offer } from "@/types/offer";
import { serializeDoc } from "./serialize";

export const getPublishedOffers = unstable_cache(
  async (): Promise<Offer[]> => {
    try {
      const db = getAdminDb();
      const snap = await db
        .collection("offers")
        .where("is_published", "==", true)
        .orderBy("sort_order", "asc")
        .get();

      return snap.docs.map((doc) => serializeDoc<Offer>(doc));
    } catch (err) {
      console.error("[firestore] getPublishedOffers failed:", err);
      return [];
    }
  },
  ["published-offers"],
  { revalidate: 60, tags: ["offers"] }
);

export async function getAllOffersForPreview(): Promise<Offer[]> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("offers")
      .orderBy("sort_order", "asc")
      .get();
    return snap.docs.map((doc) => serializeDoc<Offer>(doc));
  } catch (err) {
    console.error("[firestore] getAllOffersForPreview failed:", err);
    return [];
  }
}
