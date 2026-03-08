import { getAdminDb } from "@/lib/firebase/admin";
import { isReservedMarketingSlug } from "@/lib/marketing/reserved-slugs";

/**
 * Assert that a slug is unique within a given Firestore collection.
 * Throws if the slug is reserved or already taken by another document.
 */
export async function assertUniqueSlug(
  collection: string,
  slug: string,
  excludeId?: string
) {
  if (isReservedMarketingSlug(slug)) {
    throw new Error(`The slug "${slug}" is reserved and cannot be used.`);
  }

  const db = getAdminDb();
  const snap = await db
    .collection(collection)
    .where("slug", "==", slug)
    .limit(5)
    .get();

  const conflict = snap.docs.find((doc) => doc.id !== excludeId);
  if (conflict) {
    throw new Error(`A record with the slug "${slug}" already exists.`);
  }
}
