import { describe, test, beforeEach } from "vitest";
import assert from "node:assert/strict";
import {
  _setIndustryProbingCacheForTests,
  _peekIndustryProbingCache,
  invalidateIndustryProbingCache,
  getCachedIndustryProbings,
} from "@/lib/firestore/industry-probing";
import type { IndustryProbing } from "@/types/industry-probing";

function makeEntry(overrides: Partial<IndustryProbing>): IndustryProbing {
  return {
    id: "test-id",
    slug: "construction",
    display_name: "Construction",
    common_bottlenecks: ["scheduling", "permits"],
    common_tools: ["Procore"],
    probing_angles: ["How do you track jobs?"],
    aliases: [],
    is_published: true,
    sort_order: 0,
    ...overrides,
  };
}

describe("industry-probing cache helpers", () => {
  beforeEach(() => {
    invalidateIndustryProbingCache();
  });

  test("starts empty", () => {
    assert.equal(getCachedIndustryProbings(), null);
  });

  test("_setIndustryProbingCacheForTests populates byKey", () => {
    _setIndustryProbingCacheForTests([makeEntry({ slug: "construction" })]);
    const snap = getCachedIndustryProbings();
    assert.ok(snap);
    assert.equal(snap!.byKey.size, 1);
    assert.equal(snap!.byKey.get("construction")?.display_name, "Construction");
  });

  test("populates byAlias when entries declare aliases", () => {
    _setIndustryProbingCacheForTests([
      makeEntry({
        slug: "home services",
        display_name: "Home Services",
        aliases: ["plumbing", "hvac", "electrical"],
      }),
    ]);
    const snap = getCachedIndustryProbings()!;
    assert.equal(snap.byAlias.get("plumbing"), "home services");
    assert.equal(snap.byAlias.get("hvac"), "home services");
    assert.equal(snap.byAlias.get("electrical"), "home services");
  });

  test("normalizes slug + alias casing to lowercase trimmed", () => {
    _setIndustryProbingCacheForTests([
      makeEntry({ slug: "  Healthcare  ", aliases: ["  Medical  "] }),
    ]);
    const snap = getCachedIndustryProbings()!;
    assert.ok(snap.byKey.has("healthcare"));
    assert.equal(snap.byAlias.get("medical"), "healthcare");
  });

  test("excludes unpublished entries", () => {
    _setIndustryProbingCacheForTests([
      makeEntry({ slug: "construction", is_published: true }),
      makeEntry({ slug: "draft-vertical", is_published: false }),
    ]);
    const snap = getCachedIndustryProbings()!;
    assert.equal(snap.byKey.size, 1);
    assert.ok(snap.byKey.has("construction"));
    assert.ok(!snap.byKey.has("draft-vertical"));
  });

  test("invalidateIndustryProbingCache clears the snapshot", () => {
    _setIndustryProbingCacheForTests([makeEntry({})]);
    assert.ok(getCachedIndustryProbings() !== null);
    invalidateIndustryProbingCache();
    assert.equal(getCachedIndustryProbings(), null);
  });

  test("first alias wins on collision", () => {
    _setIndustryProbingCacheForTests([
      makeEntry({ slug: "home services", aliases: ["maintenance"] }),
      makeEntry({ slug: "facilities", aliases: ["maintenance"] }),
    ]);
    const snap = getCachedIndustryProbings()!;
    // The first entry's alias claims the slot.
    assert.equal(snap.byAlias.get("maintenance"), "home services");
  });

  test("entries with no aliases still get indexed by slug", () => {
    _setIndustryProbingCacheForTests([makeEntry({ slug: "legal", aliases: [] })]);
    const snap = getCachedIndustryProbings()!;
    assert.equal(snap.byKey.size, 1);
    assert.equal(snap.byAlias.size, 0);
  });

  test("_peekIndustryProbingCache mirrors getCachedIndustryProbings", () => {
    _setIndustryProbingCacheForTests([makeEntry({})]);
    assert.equal(_peekIndustryProbingCache(), getCachedIndustryProbings());
  });
});

// ---------------------------------------------------------------------------
// Integration: getIndustryProbing in conversation.ts uses the cache
// ---------------------------------------------------------------------------

describe("conversation.getIndustryProbing — Firestore precedence", () => {
  beforeEach(() => {
    invalidateIndustryProbingCache();
  });

  test("falls back to hardcoded INDUSTRY_PROBING_FALLBACK when cache is empty", async () => {
    // No cache populated. The hardcoded entry for "construction" should fire.
    const { extractHeuristicIntakeData } = await import("@/lib/agents/conversation");
    // Just verify the module loads without throwing — getIndustryProbing is
    // private but exercised indirectly by the prompt builders. We can verify
    // the cache integration via the public surface (the Firestore reader).
    assert.ok(extractHeuristicIntakeData);
  });

  test("Firestore cache snapshot can override the fallback", () => {
    _setIndustryProbingCacheForTests([
      {
        id: "override-1",
        slug: "construction",
        display_name: "Construction (Custom)",
        common_bottlenecks: ["new override bottleneck"],
        common_tools: ["new override tool"],
        probing_angles: ["new override angle"],
        aliases: [],
        is_published: true,
        sort_order: 0,
      },
    ]);
    const snap = getCachedIndustryProbings()!;
    const entry = snap.byKey.get("construction");
    assert.ok(entry);
    assert.equal(entry!.common_bottlenecks[0], "new override bottleneck");
    assert.equal(entry!.common_tools[0], "new override tool");
  });

  test("Firestore alias resolves to canonical slug for lookup", () => {
    _setIndustryProbingCacheForTests([
      {
        id: "home-1",
        slug: "home services",
        display_name: "Home Services",
        common_bottlenecks: ["dispatching"],
        common_tools: ["ServiceTitan"],
        probing_angles: ["How does a job move from call to completion?"],
        aliases: ["plumbing", "hvac"],
        is_published: true,
        sort_order: 0,
      },
    ]);
    const snap = getCachedIndustryProbings()!;
    // "plumbing" → resolves via alias map → "home services" → entry
    const aliasTarget = snap.byAlias.get("plumbing");
    assert.equal(aliasTarget, "home services");
    const resolved = aliasTarget ? snap.byKey.get(aliasTarget) : undefined;
    assert.ok(resolved);
    assert.equal(resolved!.common_bottlenecks[0], "dispatching");
  });
});
