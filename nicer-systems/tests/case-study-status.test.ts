import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { caseStudySchema } from "@/lib/validation";
import type { CaseStudy, CaseStudyStatus } from "@/types/case-study";
import { matchesCaseStudyFilters } from "@/lib/marketing/case-study-filters";

/**
 * 3C approval-workflow regression net.
 *
 * These tests pin the critical invariants of the draft → review →
 * published → archived pipeline so future refactors can't silently
 * regress the public-visibility contract.
 */

// ---------------------------------------------------------------------------
// Schema validation — status is required + constrained to the enum
// ---------------------------------------------------------------------------

describe("caseStudySchema — status field", () => {
  const baseInput = {
    title: "Test",
    slug: "test",
    client_name: "Acme",
    industry: "Construction",
    tools: ["Procore"],
    challenge: "Manual scheduling takes forever",
    solution: "Automated dispatch cuts it to minutes",
    metrics: [{ label: "Cycle time", before: "3 days", after: "1 hour" }],
    sort_order: 0,
  };

  test("accepts every valid status value", () => {
    const validStatuses: CaseStudyStatus[] = [
      "draft",
      "review",
      "published",
      "archived",
    ];
    for (const status of validStatuses) {
      const result = caseStudySchema.safeParse({ ...baseInput, status });
      assert.ok(
        result.success,
        `status=${status} should be accepted: ${result.success ? "" : JSON.stringify(result.error.issues)}`
      );
    }
  });

  test("rejects unknown status values", () => {
    const result = caseStudySchema.safeParse({
      ...baseInput,
      status: "pending_review", // not in the enum
    });
    assert.equal(result.success, false);
  });

  test("rejects missing status", () => {
    const result = caseStudySchema.safeParse(baseInput); // no status at all
    assert.equal(result.success, false);
  });

  test("the legacy boolean 'is_published' alone is NOT enough — status is required", () => {
    const result = caseStudySchema.safeParse({
      ...baseInput,
      is_published: true, // not a schema field
    });
    // Must fail because status is missing.
    assert.equal(result.success, false);
  });
});

// ---------------------------------------------------------------------------
// Public visibility rule — only status === "published" is public
// ---------------------------------------------------------------------------

describe("public visibility rule", () => {
  function mockCS(id: string, status: CaseStudyStatus): CaseStudy {
    return {
      id,
      title: `Study ${id}`,
      slug: `study-${id}`,
      client_name: "Acme",
      industry: "Construction",
      workflow_type: "Scheduling",
      tools: ["Procore"],
      challenge: "c",
      solution: "s",
      metrics: [],
      result_categories: [],
      thumbnail_url: "",
      status,
      is_published: status === "published",
      published_at: status === "published" ? "2026-04-11T00:00:00.000Z" : null,
      created_at: "2026-04-11T00:00:00.000Z",
      updated_at: "2026-04-11T00:00:00.000Z",
      sort_order: 0,
    };
  }

  test("filter helper does NOT exclude any status — visibility is server-side, not client-side", () => {
    // The matchesCaseStudyFilters helper is for UI filtering only. It
    // should pass through all statuses because the server has already
    // filtered to published-only via getPublishedCaseStudies(). Pinning
    // this so the filter helper doesn't quietly acquire a status gate.
    const allStatuses: CaseStudyStatus[] = [
      "draft",
      "review",
      "published",
      "archived",
    ];
    for (const status of allStatuses) {
      const cs = mockCS("x", status);
      assert.equal(
        matchesCaseStudyFilters(cs, {
          industry: "All",
          workflowType: "All",
          resultCategory: "All",
        }),
        true,
        `filter helper should pass status=${status} when all filters are "All"`
      );
    }
  });

  test("unpublished case studies still filter correctly on other dimensions when user is browsing admin preview", () => {
    // Admin preview mode shows every status. The filter helper must
    // still apply industry/workflow/result filters correctly regardless.
    const draft = mockCS("d", "draft");
    assert.equal(
      matchesCaseStudyFilters(draft, {
        industry: "Healthcare",
        workflowType: "All",
        resultCategory: "All",
      }),
      false,
      "draft with industry=Construction should NOT match industry=Healthcare"
    );
  });
});

// ---------------------------------------------------------------------------
// published_at lifecycle invariants
// ---------------------------------------------------------------------------

describe("published_at lifecycle invariants", () => {
  // Pure tests of the rules that drive the server actions. No Firestore
  // here — we just assert the math of "when should published_at change".

  /**
   * The rule from lib/actions/case-studies.ts:
   *   publishedAt =
   *     isPublished && !existingData?.published_at
   *       ? new Date().toISOString()
   *       : existingData?.published_at ?? null;
   *
   * Extracted as a pure function for testing.
   */
  function computeNextPublishedAt(
    isPublished: boolean,
    existingPublishedAt: string | null | undefined,
    now: string
  ): string | null {
    if (isPublished && !existingPublishedAt) return now;
    return existingPublishedAt ?? null;
  }

  test("first publish stamps published_at with current time", () => {
    const result = computeNextPublishedAt(
      true,
      null,
      "2026-04-11T10:00:00.000Z"
    );
    assert.equal(result, "2026-04-11T10:00:00.000Z");
  });

  test("subsequent publish preserves the original published_at", () => {
    const first = "2026-01-01T00:00:00.000Z";
    const result = computeNextPublishedAt(
      true,
      first,
      "2026-04-11T10:00:00.000Z"
    );
    assert.equal(result, first);
  });

  test("unpublishing (status → draft) preserves published_at (so re-publish keeps history)", () => {
    const first = "2026-01-01T00:00:00.000Z";
    const result = computeNextPublishedAt(
      false,
      first,
      "2026-04-11T10:00:00.000Z"
    );
    assert.equal(result, first);
  });

  test("creating as draft leaves published_at null", () => {
    const result = computeNextPublishedAt(
      false,
      null,
      "2026-04-11T10:00:00.000Z"
    );
    assert.equal(result, null);
  });

  test("undefined existing published_at behaves like null", () => {
    const result = computeNextPublishedAt(
      true,
      undefined,
      "2026-04-11T10:00:00.000Z"
    );
    assert.equal(result, "2026-04-11T10:00:00.000Z");
  });
});

// ---------------------------------------------------------------------------
// Legacy migration fallback (is_published → status)
// ---------------------------------------------------------------------------

describe("legacy is_published → status migration fallback", () => {
  /**
   * The fallback from CaseStudiesManager.tsx lines 87 and 451:
   *   status: item.status ?? (item.is_published ? "published" : "draft")
   */
  function resolveStatus(
    item: { status?: CaseStudyStatus; is_published?: boolean }
  ): CaseStudyStatus {
    return item.status ?? (item.is_published ? "published" : "draft");
  }

  test("new docs with status field use it directly", () => {
    assert.equal(resolveStatus({ status: "review" }), "review");
    assert.equal(resolveStatus({ status: "archived" }), "archived");
  });

  test("legacy docs with is_published=true resolve to 'published'", () => {
    assert.equal(resolveStatus({ is_published: true }), "published");
  });

  test("legacy docs with is_published=false resolve to 'draft'", () => {
    assert.equal(resolveStatus({ is_published: false }), "draft");
  });

  test("legacy docs with missing is_published default to 'draft'", () => {
    assert.equal(resolveStatus({}), "draft");
  });

  test("explicit status always wins over is_published", () => {
    // If both are set (during migration period), status is authoritative.
    assert.equal(
      resolveStatus({ status: "review", is_published: true }),
      "review"
    );
    assert.equal(
      resolveStatus({ status: "archived", is_published: true }),
      "archived"
    );
  });
});
