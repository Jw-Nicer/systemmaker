import { test, describe } from "vitest";
import assert from "node:assert/strict";
import { serializeDoc } from "@/lib/firestore/serialize";

/** Minimal fake that satisfies serializeDoc's interface. */
function fakeDoc(id: string, data: Record<string, unknown>) {
  return { id, data: () => data } as Parameters<typeof serializeDoc>[0];
}

/** Fake Firestore Timestamp with a toDate() method. */
function fakeTimestamp(iso: string) {
  return { toDate: () => new Date(iso) };
}

describe("serializeDoc", () => {
  test("adds id from doc.id", () => {
    const result = serializeDoc<{ id: string }>(fakeDoc("abc123", {}));
    assert.equal(result.id, "abc123");
  });

  test("passes through string values unchanged", () => {
    const result = serializeDoc<{ id: string; name: string }>(
      fakeDoc("1", { name: "Jane" })
    );
    assert.equal(result.name, "Jane");
  });

  test("passes through number values unchanged", () => {
    const result = serializeDoc<{ id: string; score: number }>(
      fakeDoc("1", { score: 42 })
    );
    assert.equal(result.score, 42);
  });

  test("passes through boolean values unchanged", () => {
    const result = serializeDoc<{ id: string; active: boolean }>(
      fakeDoc("1", { active: true })
    );
    assert.equal(result.active, true);
  });

  test("passes through null values unchanged", () => {
    const result = serializeDoc<{ id: string; note: null }>(
      fakeDoc("1", { note: null })
    );
    assert.equal(result.note, null);
  });

  test("passes through undefined values", () => {
    const result = serializeDoc<{ id: string; missing: undefined }>(
      fakeDoc("1", { missing: undefined })
    );
    assert.equal(result.missing, undefined);
  });

  test("converts Timestamp fields to ISO strings", () => {
    const result = serializeDoc<{ id: string; created_at: string }>(
      fakeDoc("1", { created_at: fakeTimestamp("2025-06-15T10:30:00.000Z") })
    );
    assert.equal(result.created_at, "2025-06-15T10:30:00.000Z");
  });

  test("converts multiple Timestamp fields", () => {
    const result = serializeDoc<{
      id: string;
      created_at: string;
      updated_at: string;
    }>(
      fakeDoc("1", {
        created_at: fakeTimestamp("2025-01-01T00:00:00.000Z"),
        updated_at: fakeTimestamp("2025-06-15T12:00:00.000Z"),
      })
    );
    assert.equal(result.created_at, "2025-01-01T00:00:00.000Z");
    assert.equal(result.updated_at, "2025-06-15T12:00:00.000Z");
  });

  test("does not convert plain objects without toDate", () => {
    const nested = { foo: "bar" };
    const result = serializeDoc<{ id: string; meta: { foo: string } }>(
      fakeDoc("1", { meta: nested })
    );
    assert.deepEqual(result.meta, nested);
  });

  test("handles mix of Timestamps and regular values", () => {
    const result = serializeDoc<{
      id: string;
      name: string;
      score: number;
      created_at: string;
    }>(
      fakeDoc("1", {
        name: "Test",
        score: 55,
        created_at: fakeTimestamp("2025-03-01T08:00:00.000Z"),
      })
    );
    assert.equal(result.name, "Test");
    assert.equal(result.score, 55);
    assert.equal(result.created_at, "2025-03-01T08:00:00.000Z");
  });

  test("handles arrays unchanged", () => {
    const result = serializeDoc<{ id: string; tags: string[] }>(
      fakeDoc("1", { tags: ["a", "b"] })
    );
    assert.deepEqual(result.tags, ["a", "b"]);
  });
});
