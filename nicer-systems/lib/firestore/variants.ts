import { getAdminDb } from "@/lib/firebase/admin";
import { unstable_cache } from "next/cache";
import type { LandingVariant } from "@/types/variant";
import { serializeDoc } from "./serialize";

export const getPublishedVariants = unstable_cache(
  async (): Promise<LandingVariant[]> => {
    try {
      const db = getAdminDb();
      const snap = await db
        .collection("variants")
        .where("is_published", "==", true)
        .orderBy("sort_order", "asc")
        .get();

      return snap.docs.map((doc) => serializeDoc<LandingVariant>(doc));
    } catch (err) {
      console.error("[firestore] getPublishedVariants failed:", err);
      return [];
    }
  },
  ["published-variants"],
  { revalidate: 300, tags: ["variants"] }
);

export const getVariantBySlug = unstable_cache(
  async (slug: string): Promise<LandingVariant | null> => {
    try {
      const db = getAdminDb();
      const snap = await db
        .collection("variants")
        .where("slug", "==", slug)
        .where("is_published", "==", true)
        .limit(1)
        .get();

      if (snap.empty) return null;
      return serializeDoc<LandingVariant>(snap.docs[0]);
    } catch (err) {
      console.error("[firestore] getVariantBySlug failed:", err);
      return null;
    }
  },
  ["variant-by-slug"],
  { revalidate: 300, tags: ["variants"] }
);

