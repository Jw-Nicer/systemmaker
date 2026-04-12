/**
 * Homepage layout — Firestore reader.
 *
 * Stored at `site_settings/homepage_layout` as a single doc so we don't
 * spawn a new collection just for a 1-doc config. Uses `unstable_cache`
 * for cross-request caching; the tag `homepage-layout` is invalidated
 * from the admin server actions on update.
 */
import { getAdminDb } from "@/lib/firebase/admin";
import { unstable_cache } from "next/cache";
import {
  DEFAULT_HOMEPAGE_LAYOUT,
  type HomepageLayout,
} from "@/types/homepage-layout";
import { resolveHomepageLayout } from "@/lib/marketing/homepage-layout-resolver";

const COLLECTION = "site_settings";
const DOC_ID = "homepage_layout";

async function fetchStoredLayout(): Promise<HomepageLayout | null> {
  try {
    const db = getAdminDb();
    const doc = await db.collection(COLLECTION).doc(DOC_ID).get();
    if (!doc.exists) return null;
    const data = doc.data();
    if (!data || !Array.isArray(data.sections)) return null;
    return {
      sections: data.sections,
      updated_at:
        typeof data.updated_at === "string"
          ? data.updated_at
          : data.updated_at?.toDate?.().toISOString(),
    };
  } catch (err) {
    console.error("[firestore] fetchStoredLayout failed:", err);
    return null;
  }
}

/**
 * Get the effective homepage layout (Firestore value merged on top of
 * defaults). Cached for 5 minutes per request group. The marketing
 * landing page calls this on every render.
 */
export const getHomepageLayout = unstable_cache(
  async (): Promise<HomepageLayout> => {
    const stored = await fetchStoredLayout();
    return resolveHomepageLayout(stored);
  },
  ["homepage-layout"],
  { revalidate: 300, tags: ["homepage-layout"] }
);

/**
 * Admin reader — skips the cache so edits show up immediately when the
 * admin opens the layout page after saving.
 */
export async function getHomepageLayoutForAdmin(): Promise<HomepageLayout> {
  const stored = await fetchStoredLayout();
  return resolveHomepageLayout(stored);
}

/**
 * Write the layout back. Called from the server action after
 * validation. Caller is responsible for cache invalidation
 * (revalidateTag("homepage-layout")).
 */
export async function writeHomepageLayout(
  layout: HomepageLayout
): Promise<void> {
  const db = getAdminDb();
  await db
    .collection(COLLECTION)
    .doc(DOC_ID)
    .set(
      {
        sections: layout.sections,
        updated_at: new Date().toISOString(),
      },
      { merge: false } // atomic full replace
    );
}

/**
 * Reset to the canonical default layout (what page.tsx used to
 * hardcode). Used by the "Reset to defaults" button in admin.
 */
export async function resetHomepageLayoutToDefault(): Promise<void> {
  await writeHomepageLayout(DEFAULT_HOMEPAGE_LAYOUT);
}
