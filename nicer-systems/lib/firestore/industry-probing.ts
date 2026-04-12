/**
 * Industry probing — server-side reader with in-process TTL cache.
 *
 * The chat agent calls into this every gathering/confirming turn, so we
 * cache the snapshot in-process to avoid re-fetching on every request.
 * Mutations from the admin UI invalidate the cache via
 * `invalidateIndustryProbingCache()`.
 *
 * The cache snapshot has two indexes:
 *  - byKey: lowercase slug → entry
 *  - byAlias: lowercase alias → canonical slug
 *
 * The chat agent does its own .toLowerCase().trim() before lookup.
 */
import { getAdminDb } from "@/lib/firebase/admin";
import type { IndustryProbing } from "@/types/industry-probing";
import { serializeDoc } from "./serialize";

export interface IndustryProbingSnapshot {
  byKey: Map<string, IndustryProbing>;
  byAlias: Map<string, string>;
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let _cache: IndustryProbingSnapshot | null = null;
let _inFlight: Promise<IndustryProbingSnapshot> | null = null;

function buildSnapshot(entries: IndustryProbing[]): IndustryProbingSnapshot {
  const byKey = new Map<string, IndustryProbing>();
  const byAlias = new Map<string, string>();

  for (const entry of entries) {
    if (!entry.is_published) continue;
    const slug = (entry.slug ?? "").toLowerCase().trim();
    if (!slug) continue;
    byKey.set(slug, entry);
    for (const alias of entry.aliases ?? []) {
      const a = alias.toLowerCase().trim();
      if (a && !byAlias.has(a)) byAlias.set(a, slug);
    }
  }

  return { byKey, byAlias, fetchedAt: Date.now() };
}

/**
 * Fetch all published industry-probing entries from Firestore and build
 * an indexed snapshot. Returns a cached copy when fresh; coalesces
 * concurrent calls into a single in-flight fetch.
 *
 * On Firestore failure: returns the previous cached snapshot if available,
 * otherwise an empty snapshot. The chat agent will then fall back to the
 * hardcoded INDUSTRY_PROBING_FALLBACK in conversation.ts.
 */
export async function getIndustryProbingsFromFirestore(): Promise<IndustryProbingSnapshot> {
  const now = Date.now();
  if (_cache && now - _cache.fetchedAt < CACHE_TTL_MS) {
    return _cache;
  }
  if (_inFlight) return _inFlight;

  _inFlight = (async () => {
    try {
      const db = getAdminDb();
      const snap = await db
        .collection("industry_probing")
        .where("is_published", "==", true)
        .get();
      const entries = snap.docs.map((doc) => serializeDoc<IndustryProbing>(doc));
      const next = buildSnapshot(entries);
      _cache = next;
      return next;
    } catch (err) {
      console.error("[firestore] getIndustryProbingsFromFirestore failed:", err);
      // Keep returning the stale cache if we have one — better than nothing.
      if (_cache) return _cache;
      const empty: IndustryProbingSnapshot = {
        byKey: new Map(),
        byAlias: new Map(),
        fetchedAt: now,
      };
      _cache = empty;
      return empty;
    } finally {
      _inFlight = null;
    }
  })();

  return _inFlight;
}

/**
 * Synchronously read the current cached snapshot without triggering a
 * fetch. Used by the chat agent's prompt builders, which run sync. Call
 * `getIndustryProbingsFromFirestore()` once at the top of the request
 * handler (await) to make sure the cache is warm before this is called.
 *
 * Returns null if the cache has never been populated.
 */
export function getCachedIndustryProbings(): IndustryProbingSnapshot | null {
  return _cache;
}

/**
 * Invalidate the in-process cache. Called from server actions after
 * create/update/delete so the next chat turn picks up the change without
 * waiting for the TTL to expire.
 */
export function invalidateIndustryProbingCache(): void {
  _cache = null;
  _inFlight = null;
}

/** Test-only: replace the cache with a fixed snapshot. */
export function _setIndustryProbingCacheForTests(
  entries: IndustryProbing[]
): void {
  _cache = buildSnapshot(entries);
}

/** Test-only: read the raw cache for assertions. */
export function _peekIndustryProbingCache(): IndustryProbingSnapshot | null {
  return _cache;
}

/** Admin reader — returns ALL entries (published or not), no caching. */
export async function getAllIndustryProbingsForAdmin(): Promise<IndustryProbing[]> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("industry_probing")
      .orderBy("sort_order", "asc")
      .get();
    return snap.docs.map((doc) => serializeDoc<IndustryProbing>(doc));
  } catch (err) {
    console.error("[firestore] getAllIndustryProbingsForAdmin failed:", err);
    return [];
  }
}
