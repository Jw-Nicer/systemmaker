import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { assertUniqueSlug } from "../lib/firestore/slug-utils";

describe("assertUniqueSlug", () => {
  it("is exported as a function", () => {
    assert.strictEqual(typeof assertUniqueSlug, "function");
  });

  it("accepts collection, slug, and optional excludeId parameters", () => {
    // assertUniqueSlug(collection, slug, excludeId?)
    assert.strictEqual(assertUniqueSlug.length, 3);
  });
});
