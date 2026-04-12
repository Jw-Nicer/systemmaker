/**
 * Pure homepage-layout resolution helpers.
 *
 * Separated from the Firestore reader so the merging + validation
 * logic can be unit tested without a live database.
 */
import {
  DEFAULT_HOMEPAGE_LAYOUT,
  HOMEPAGE_SECTION_KEYS,
  type HomepageLayout,
  type HomepageSection,
  type HomepageSectionKey,
} from "@/types/homepage-layout";

/**
 * Merge a (possibly stale / partial / corrupt) stored layout on top of
 * the canonical defaults and return a complete, well-formed layout.
 *
 * Rules:
 *  1. Every key in HOMEPAGE_SECTION_KEYS must appear in the output
 *     exactly once — missing keys are added from the default (enabled).
 *  2. Unknown keys in the stored layout are dropped (defensive against
 *     schema drift during deploys).
 *  3. Duplicate keys in the stored layout are deduped, first occurrence
 *     wins (deterministic, stable across admin saves).
 *  4. The output is sorted by sort_order ascending. When two sections
 *     share a sort_order, their relative order is stable.
 *  5. sort_order values are renormalized to 0..N-1 in the output so the
 *     admin UI always sees a tight range.
 */
export function resolveHomepageLayout(
  stored: HomepageLayout | null | undefined
): HomepageLayout {
  const allKeys = new Set<HomepageSectionKey>(HOMEPAGE_SECTION_KEYS);
  const merged = new Map<HomepageSectionKey, HomepageSection>();

  // Seed from defaults so nothing is ever missing.
  for (const s of DEFAULT_HOMEPAGE_LAYOUT.sections) {
    merged.set(s.key, { ...s });
  }

  // Overlay stored entries (dedupe by first occurrence).
  if (stored?.sections) {
    const seenInStored = new Set<HomepageSectionKey>();
    for (const s of stored.sections) {
      if (!s || typeof s.key !== "string") continue;
      const key = s.key as HomepageSectionKey;
      if (!allKeys.has(key)) continue; // unknown key — drop
      if (seenInStored.has(key)) continue; // duplicate — keep first
      seenInStored.add(key);
      merged.set(key, {
        key,
        enabled: Boolean(s.enabled),
        sort_order: typeof s.sort_order === "number" ? s.sort_order : 0,
      });
    }
  }

  // Sort by sort_order, breaking ties by the default-layout position
  // (so sections with identical sort_orders keep their canonical ordering).
  const defaultIndex = new Map<HomepageSectionKey, number>();
  DEFAULT_HOMEPAGE_LAYOUT.sections.forEach((s, i) => {
    defaultIndex.set(s.key, i);
  });

  const ordered = Array.from(merged.values()).sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return (defaultIndex.get(a.key) ?? 0) - (defaultIndex.get(b.key) ?? 0);
  });

  // Renormalize sort_order to 0..N-1.
  const normalized = ordered.map((s, i) => ({ ...s, sort_order: i }));

  return { sections: normalized, updated_at: stored?.updated_at };
}

/**
 * Return only the sections that should actually render, in order.
 * Filters out disabled sections and preserves the resolved ordering.
 */
export function visibleHomepageSections(layout: HomepageLayout): HomepageSection[] {
  return layout.sections.filter((s) => s.enabled);
}
