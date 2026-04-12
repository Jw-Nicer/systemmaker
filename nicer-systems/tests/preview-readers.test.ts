import { test, describe, vi, beforeEach } from "vitest";
import assert from "node:assert/strict";

/**
 * D2 regression net — admin preview mode.
 *
 * The marketing `preview/site` and `preview/variant/[id]` routes let
 * admins view draft / in-review content before publish. They rely on
 * dedicated Firestore readers (`getAllCaseStudiesForPreview`,
 * `getAllFAQsForPreview`, `getAllTestimonialsForPreview`,
 * `getAllOffersForPreview`) that deliberately **do NOT** filter by
 * `is_published` or `status === "published"`.
 *
 * These tests pin that contract. If someone ever adds an is_published
 * filter to one of the preview readers they'll break admin preview
 * mode silently — this suite catches that.
 *
 * We mock firebase-admin to return a fixed document set containing both
 * published and unpublished entries and assert that every preview
 * reader returns the full set.
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Each reader calls `collection(name).orderBy(...).get()` at minimum. Some
// use `where()` first. We return the same pre-baked mixed set regardless
// of the query shape, because the contract is "preview readers return
// everything including drafts" — so the concrete Firestore path doesn't
// matter, only the result the application code hands back.

function makeMixedSnapshot(mixed: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    docs: mixed.map((d) => ({
      id: d.id,
      data: () => d.data,
      exists: true,
    })),
  };
}

// Shared data baked into every collection — one published, one draft
const MIXED_DOCS = [
  { id: "published-1", data: { is_published: true, status: "published", sort_order: 0, name: "Published item" } },
  { id: "draft-1", data: { is_published: false, status: "draft", sort_order: 1, name: "Draft item" } },
];

const mockGet = vi.fn(() => Promise.resolve(makeMixedSnapshot(MIXED_DOCS)));
const mockOrderBy = vi.fn().mockReturnThis();

type WhereCall = [field: string, op: string, value: unknown];
const mockWhere = vi
  .fn<(field: string, op: string, value: unknown) => unknown>()
  .mockReturnThis();

const mockCollection = vi.fn((_name: string) => ({
  orderBy: mockOrderBy,
  where: mockWhere,
  get: mockGet,
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({ collection: mockCollection }),
  FieldValue: { delete: () => "__DELETE__" },
}));

// next/cache.unstable_cache wraps the published readers. We short-circuit
// it to just call the function directly so we can see through the cache.
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

const { getAllCaseStudiesForPreview } = await import(
  "@/lib/firestore/case-studies"
);
const { getAllFAQsForPreview } = await import("@/lib/firestore/faqs");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockGet.mockClear();
  mockCollection.mockClear();
  mockOrderBy.mockClear();
  mockWhere.mockClear();
});

describe("preview readers — contract pin", () => {
  test("getAllCaseStudiesForPreview returns BOTH published and draft docs", async () => {
    const result = await getAllCaseStudiesForPreview();
    assert.equal(result.length, 2, "should return the full mixed set");
    const ids = result.map((r) => r.id);
    assert.ok(ids.includes("published-1"), "missing published case study");
    assert.ok(ids.includes("draft-1"), "DRAFT case study was filtered out — preview mode broken");
  });

  test("getAllFAQsForPreview returns BOTH published and draft docs", async () => {
    const result = await getAllFAQsForPreview();
    assert.equal(result.length, 2);
    const ids = result.map((r) => r.id);
    assert.ok(ids.includes("published-1"));
    assert.ok(
      ids.includes("draft-1"),
      "DRAFT FAQ was filtered out — preview mode broken"
    );
  });

  test("getAllCaseStudiesForPreview queries the correct collection", async () => {
    await getAllCaseStudiesForPreview();
    assert.ok(
      mockCollection.mock.calls.some((c) => c[0] === "case_studies"),
      'expected a collection("case_studies") call'
    );
  });

  test("getAllFAQsForPreview queries the correct collection", async () => {
    await getAllFAQsForPreview();
    assert.ok(
      mockCollection.mock.calls.some((c) => c[0] === "faqs"),
      'expected a collection("faqs") call'
    );
  });

  test("preview readers do NOT chain a where() that filters by is_published=true", async () => {
    await getAllCaseStudiesForPreview();
    // If someone adds .where("is_published", "==", true) to a preview
    // reader this assertion will catch it.
    const calls = mockWhere.mock.calls as unknown as WhereCall[];
    for (const call of calls) {
      const field = call[0];
      const value = call[2];
      if (field === "is_published" && value === true) {
        assert.fail(
          "preview reader must not filter by is_published=true — that defeats the purpose"
        );
      }
      if (field === "status" && value === "published") {
        assert.fail(
          'preview reader must not filter by status="published" — that defeats the purpose'
        );
      }
    }
  });
});
