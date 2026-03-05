import { getAdminDb } from "@/lib/firebase/admin";
import { unstable_cache } from "next/cache";
import type { LandingVariant } from "@/types/variant";

export const getPublishedVariants = unstable_cache(
  async (): Promise<LandingVariant[]> => {
    try {
      const db = getAdminDb();
      const snap = await db
        .collection("variants")
        .where("is_published", "==", true)
        .orderBy("sort_order", "asc")
        .get();

      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as LandingVariant);
    } catch {
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
      const doc = snap.docs[0];
      return { id: doc.id, ...doc.data() } as LandingVariant;
    } catch {
      return null;
    }
  },
  ["variant-by-slug"],
  { revalidate: 300, tags: ["variants"] }
);
