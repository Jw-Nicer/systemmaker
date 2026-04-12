import { describe, test } from "vitest";
import assert from "node:assert/strict";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
} from "@/types/lead";
import type { LeadStatus } from "@/types/lead";

/**
 * 5D regression net — pins the lead pipeline statuses, their labels, and
 * their color classes so nothing silently regresses when someone adds,
 * renames, or reorders a disposition.
 */

// Keep this in sync with LEAD_STATUSES in types/lead.ts. If you change
// one, this test will force you to update the other.
const EXPECTED_STATUSES = [
  "new",
  "qualified",
  "nurture",
  "later",
  "booked",
  "closed",
  "unqualified",
  "lost",
] as const;

describe("LEAD_STATUSES enum", () => {
  test("contains every expected status in the expected order", () => {
    assert.deepEqual(LEAD_STATUSES, EXPECTED_STATUSES);
  });

  test("has exactly 8 statuses after the 5D expansion", () => {
    // GAPS 5D originally described 5 statuses. The enum has since grown
    // to 8 (including the new `later` disposition). Pinning the count
    // means a future refactor that deletes a status without replacing
    // it forces this test to fail — which is the signal we want.
    assert.equal(LEAD_STATUSES.length, 8);
  });

  test("every status is unique", () => {
    const unique = new Set(LEAD_STATUSES);
    assert.equal(unique.size, LEAD_STATUSES.length);
  });

  test("includes the 3 dispositions GAPS 5D asked about", () => {
    // GAPS mentioned: nurture (automated cadence), later (deferred
    // follow-up), qualified (cleared for booking). All three must exist.
    assert.ok((LEAD_STATUSES as readonly string[]).includes("nurture"));
    assert.ok((LEAD_STATUSES as readonly string[]).includes("later"));
    assert.ok((LEAD_STATUSES as readonly string[]).includes("qualified"));
  });
});

describe("LEAD_STATUS_LABELS", () => {
  test("has a label for every status", () => {
    for (const status of LEAD_STATUSES) {
      assert.ok(
        typeof LEAD_STATUS_LABELS[status] === "string" &&
          LEAD_STATUS_LABELS[status].length > 0,
        `missing or empty label for status="${status}"`
      );
    }
  });

  test("labels are Title Case", () => {
    for (const status of LEAD_STATUSES) {
      const label = LEAD_STATUS_LABELS[status];
      assert.equal(
        label.charAt(0),
        label.charAt(0).toUpperCase(),
        `label "${label}" should start with an uppercase letter`
      );
    }
  });

  test("does not contain labels for unknown statuses", () => {
    // Exhaustive record check — no stale keys
    const labelKeys = Object.keys(LEAD_STATUS_LABELS);
    for (const key of labelKeys) {
      assert.ok(
        (LEAD_STATUSES as readonly string[]).includes(key),
        `label key "${key}" is not in LEAD_STATUSES`
      );
    }
  });
});

describe("LEAD_STATUS_COLORS", () => {
  test("has a color class for every status (no silent fallbacks)", () => {
    // The admin components used to define their own partial color maps
    // that only covered 2 of 7 statuses, leaving everything else falling
    // back to a generic neutral. Centralizing the map and testing every
    // status has a concrete entry prevents that regression.
    for (const status of LEAD_STATUSES) {
      assert.ok(
        typeof LEAD_STATUS_COLORS[status] === "string" &&
          LEAD_STATUS_COLORS[status].length > 0,
        `missing or empty color for status="${status}"`
      );
    }
  });

  test("every color class has border + background + text (full pill)", () => {
    // Each entry must set all three visual dimensions so the pill is
    // internally consistent and readable. A bare background without a
    // matching text color reads as garbage.
    for (const status of LEAD_STATUSES) {
      const classes = LEAD_STATUS_COLORS[status];
      assert.ok(
        /\bborder-/.test(classes),
        `status="${status}" color missing border- class`
      );
      assert.ok(
        /\bbg-/.test(classes),
        `status="${status}" color missing bg- class`
      );
      assert.ok(
        /\btext-/.test(classes),
        `status="${status}" color missing text- class`
      );
    }
  });

  test("does not contain colors for unknown statuses", () => {
    const colorKeys = Object.keys(LEAD_STATUS_COLORS);
    for (const key of colorKeys) {
      assert.ok(
        (LEAD_STATUSES as readonly string[]).includes(key),
        `color key "${key}" is not in LEAD_STATUSES`
      );
    }
  });
});

describe("LeadStatus type exhaustiveness", () => {
  test("the LeadStatus type covers every LEAD_STATUSES value", () => {
    // Compile-time check: assign each status to a typed variable. If
    // anyone ever narrows LeadStatus without updating LEAD_STATUSES this
    // test will stop typechecking.
    for (const s of LEAD_STATUSES) {
      const typed: LeadStatus = s;
      assert.ok(typed);
    }
  });
});
