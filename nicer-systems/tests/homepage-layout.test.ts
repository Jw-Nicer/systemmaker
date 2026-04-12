import { describe, test } from "vitest";
import assert from "node:assert/strict";
import {
  HOMEPAGE_SECTION_KEYS,
  DEFAULT_HOMEPAGE_LAYOUT,
  SECTION_REGISTRY,
  type HomepageLayout,
  type HomepageSectionKey,
} from "@/types/homepage-layout";
import {
  resolveHomepageLayout,
  visibleHomepageSections,
} from "@/lib/marketing/homepage-layout-resolver";
import { homepageLayoutSchema } from "@/lib/validation";

/**
 * D1 regression net — homepage section toggles + ordering.
 *
 * Pins:
 *  - The canonical section key set + default layout
 *  - Merge semantics (missing keys backfilled, unknown keys dropped,
 *    duplicates deduped, sort_order normalized)
 *  - Schema validation boundaries
 *  - Visibility filtering
 */

// ---------------------------------------------------------------------------
// Section registry contract
// ---------------------------------------------------------------------------

describe("HOMEPAGE_SECTION_KEYS and DEFAULT_HOMEPAGE_LAYOUT", () => {
  test("default layout has exactly one entry per section key", () => {
    assert.equal(
      DEFAULT_HOMEPAGE_LAYOUT.sections.length,
      HOMEPAGE_SECTION_KEYS.length
    );
    const seen = new Set(DEFAULT_HOMEPAGE_LAYOUT.sections.map((s) => s.key));
    assert.equal(seen.size, HOMEPAGE_SECTION_KEYS.length);
    for (const key of HOMEPAGE_SECTION_KEYS) {
      assert.ok(seen.has(key), `default layout missing key="${key}"`);
    }
  });

  test("default layout sections are all enabled by default", () => {
    for (const s of DEFAULT_HOMEPAGE_LAYOUT.sections) {
      assert.equal(
        s.enabled,
        true,
        `section ${s.key} should be enabled by default`
      );
    }
  });

  test("default layout sort_orders are 0..N-1 with no gaps", () => {
    const orders = DEFAULT_HOMEPAGE_LAYOUT.sections.map((s) => s.sort_order);
    const expected = Array.from({ length: orders.length }, (_, i) => i);
    assert.deepEqual(orders, expected);
  });

  test("SECTION_REGISTRY has an entry for every section key", () => {
    for (const key of HOMEPAGE_SECTION_KEYS) {
      const entry = SECTION_REGISTRY[key];
      assert.ok(entry, `missing registry entry for key="${key}"`);
      assert.ok(entry.label.length > 0, `empty label for key="${key}"`);
      assert.ok(
        entry.description.length > 0,
        `empty description for key="${key}"`
      );
      assert.equal(typeof entry.recommended, "boolean");
    }
  });
});

// ---------------------------------------------------------------------------
// resolveHomepageLayout — merge + normalize
// ---------------------------------------------------------------------------

describe("resolveHomepageLayout", () => {
  test("null input returns the default layout", () => {
    const result = resolveHomepageLayout(null);
    assert.equal(result.sections.length, HOMEPAGE_SECTION_KEYS.length);
    assert.deepEqual(
      result.sections.map((s) => s.key),
      DEFAULT_HOMEPAGE_LAYOUT.sections.map((s) => s.key)
    );
  });

  test("undefined input returns the default layout", () => {
    const result = resolveHomepageLayout(undefined);
    assert.equal(result.sections.length, HOMEPAGE_SECTION_KEYS.length);
  });

  test("empty stored.sections returns the default layout", () => {
    const result = resolveHomepageLayout({ sections: [] });
    assert.equal(result.sections.length, HOMEPAGE_SECTION_KEYS.length);
  });

  test("preserves custom ordering from stored layout", () => {
    const stored: HomepageLayout = {
      sections: [
        { key: "faq", enabled: true, sort_order: 0 },
        { key: "hero", enabled: true, sort_order: 1 },
      ],
    };
    const result = resolveHomepageLayout(stored);
    // faq should come first, hero second, everything else after (in
    // their default order) because we backfill missing keys with their
    // default sort_orders.
    const keys = result.sections.map((s) => s.key);
    const faqIdx = keys.indexOf("faq");
    const heroIdx = keys.indexOf("hero");
    assert.ok(
      faqIdx < heroIdx,
      `faq should precede hero (faq=${faqIdx}, hero=${heroIdx})`
    );
  });

  test("backfills missing section keys from defaults", () => {
    const stored: HomepageLayout = {
      sections: [{ key: "hero", enabled: false, sort_order: 0 }],
    };
    const result = resolveHomepageLayout(stored);
    const keys = new Set(result.sections.map((s) => s.key));
    for (const key of HOMEPAGE_SECTION_KEYS) {
      assert.ok(keys.has(key), `missing backfilled key="${key}"`);
    }
  });

  test("preserves the disabled flag from the stored layout", () => {
    const stored: HomepageLayout = {
      sections: [{ key: "testimonials", enabled: false, sort_order: 2 }],
    };
    const result = resolveHomepageLayout(stored);
    const testimonials = result.sections.find((s) => s.key === "testimonials");
    assert.ok(testimonials);
    assert.equal(testimonials!.enabled, false);
  });

  test("drops unknown section keys from the stored layout", () => {
    // Simulate a stale Firestore doc from a previous deploy that had a
    // section key the current code no longer knows about.
    const stored = {
      sections: [
        { key: "hero", enabled: true, sort_order: 0 },
        { key: "unknown_section", enabled: true, sort_order: 1 },
      ],
    } as unknown as HomepageLayout;
    const result = resolveHomepageLayout(stored);
    const keys = result.sections.map((s) => s.key);
    assert.ok(!keys.includes("unknown_section" as HomepageSectionKey));
    // Must still have all canonical keys
    assert.equal(result.sections.length, HOMEPAGE_SECTION_KEYS.length);
  });

  test("dedupes duplicate section keys, first occurrence wins", () => {
    const stored: HomepageLayout = {
      sections: [
        { key: "hero", enabled: true, sort_order: 0 },
        { key: "hero", enabled: false, sort_order: 99 }, // duplicate — should be dropped
      ],
    };
    const result = resolveHomepageLayout(stored);
    const heros = result.sections.filter((s) => s.key === "hero");
    assert.equal(heros.length, 1);
    assert.equal(heros[0].enabled, true, "first occurrence should win");
  });

  test("normalizes sort_order to 0..N-1 after merging", () => {
    const stored: HomepageLayout = {
      sections: [
        { key: "hero", enabled: true, sort_order: 50 },
        { key: "faq", enabled: true, sort_order: 100 },
      ],
    };
    const result = resolveHomepageLayout(stored);
    const orders = result.sections.map((s) => s.sort_order);
    const expected = Array.from({ length: orders.length }, (_, i) => i);
    assert.deepEqual(orders, expected);
  });

  test("ties on sort_order are broken by the default-layout position", () => {
    const stored: HomepageLayout = {
      sections: [
        { key: "pricing", enabled: true, sort_order: 0 },
        { key: "faq", enabled: true, sort_order: 0 },
      ],
    };
    const result = resolveHomepageLayout(stored);
    // In the default layout, pricing (sort_order 8) precedes faq (9),
    // so the tie-break should put pricing first.
    const keys = result.sections.map((s) => s.key);
    const pricingIdx = keys.indexOf("pricing");
    const faqIdx = keys.indexOf("faq");
    assert.ok(
      pricingIdx < faqIdx,
      `pricing should precede faq on tie-break (pricing=${pricingIdx}, faq=${faqIdx})`
    );
  });

  test("preserves updated_at from stored layout when present", () => {
    const stored: HomepageLayout = {
      sections: [],
      updated_at: "2026-04-11T00:00:00.000Z",
    };
    const result = resolveHomepageLayout(stored);
    assert.equal(result.updated_at, "2026-04-11T00:00:00.000Z");
  });

  test("handles missing / non-string keys gracefully without throwing", () => {
    const garbage = {
      sections: [
        null,
        undefined,
        { key: null },
        { key: 42 },
        { key: "hero", enabled: "yes", sort_order: "one" },
      ],
    } as unknown as HomepageLayout;
    const result = resolveHomepageLayout(garbage);
    // Should still return a valid layout with all canonical keys
    assert.equal(result.sections.length, HOMEPAGE_SECTION_KEYS.length);
    // The "hero" entry with garbage values should still be merged, with
    // enabled coerced via Boolean("yes") = true and sort_order defaulted to 0
    const hero = result.sections.find((s) => s.key === "hero");
    assert.ok(hero);
    assert.equal(hero!.enabled, true);
  });
});

// ---------------------------------------------------------------------------
// visibleHomepageSections
// ---------------------------------------------------------------------------

describe("visibleHomepageSections", () => {
  test("filters out disabled sections, preserves order", () => {
    const layout: HomepageLayout = {
      sections: [
        { key: "hero", enabled: true, sort_order: 0 },
        { key: "faq", enabled: false, sort_order: 1 },
        { key: "pricing", enabled: true, sort_order: 2 },
      ],
    };
    const visible = visibleHomepageSections(layout);
    assert.equal(visible.length, 2);
    assert.deepEqual(
      visible.map((s) => s.key),
      ["hero", "pricing"]
    );
  });

  test("returns empty array when every section is disabled", () => {
    const layout: HomepageLayout = {
      sections: DEFAULT_HOMEPAGE_LAYOUT.sections.map((s) => ({
        ...s,
        enabled: false,
      })),
    };
    assert.equal(visibleHomepageSections(layout).length, 0);
  });

  test("default layout is fully visible", () => {
    const visible = visibleHomepageSections(DEFAULT_HOMEPAGE_LAYOUT);
    assert.equal(visible.length, DEFAULT_HOMEPAGE_LAYOUT.sections.length);
  });
});

// ---------------------------------------------------------------------------
// Zod schema validation
// ---------------------------------------------------------------------------

describe("homepageLayoutSchema", () => {
  test("accepts a valid layout", () => {
    const input = {
      sections: DEFAULT_HOMEPAGE_LAYOUT.sections,
    };
    const result = homepageLayoutSchema.safeParse(input);
    assert.equal(result.success, true);
  });

  test("rejects an empty sections array", () => {
    const result = homepageLayoutSchema.safeParse({ sections: [] });
    assert.equal(result.success, false);
  });

  test("rejects a section with an unknown key", () => {
    const input = {
      sections: [
        { key: "nope", enabled: true, sort_order: 0 },
      ],
    };
    const result = homepageLayoutSchema.safeParse(input);
    assert.equal(result.success, false);
  });

  test("rejects negative sort_order", () => {
    const input = {
      sections: [{ key: "hero", enabled: true, sort_order: -1 }],
    };
    const result = homepageLayoutSchema.safeParse(input);
    assert.equal(result.success, false);
  });

  test("rejects non-integer sort_order", () => {
    const input = {
      sections: [{ key: "hero", enabled: true, sort_order: 1.5 }],
    };
    const result = homepageLayoutSchema.safeParse(input);
    assert.equal(result.success, false);
  });

  test("rejects non-boolean enabled", () => {
    const input = {
      sections: [{ key: "hero", enabled: "yes", sort_order: 0 }],
    };
    const result = homepageLayoutSchema.safeParse(input);
    assert.equal(result.success, false);
  });

  test("rejects missing required fields", () => {
    const result = homepageLayoutSchema.safeParse({
      sections: [{ key: "hero" }],
    });
    assert.equal(result.success, false);
  });

  test("accepts a partial layout (schema does not enforce completeness — the resolver does)", () => {
    // Deliberate design choice: the schema lets admins save a partial
    // layout because the resolver backfills missing keys on both read
    // and write. This test pins that boundary.
    const input = {
      sections: [{ key: "hero", enabled: true, sort_order: 0 }],
    };
    const result = homepageLayoutSchema.safeParse(input);
    assert.equal(result.success, true);
  });
});
