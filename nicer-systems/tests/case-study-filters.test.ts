import { describe, test } from "vitest";
import assert from "node:assert/strict";
import {
  matchesCaseStudyFilters,
  collectResultCategories,
  collectWorkflowTypes,
} from "@/lib/marketing/case-study-filters";
import type { CaseStudy } from "@/types/case-study";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeCS(overrides: Partial<CaseStudy>): CaseStudy {
  return {
    id: "fx-1",
    title: "Test Study",
    slug: "test-study",
    client_name: "Acme",
    industry: "Construction",
    workflow_type: "",
    tools: ["Procore"],
    challenge: "Manual scheduling",
    solution: "Automated dispatch",
    metrics: [],
    result_categories: [],
    thumbnail_url: "",
    status: "published",
    is_published: true,
    published_at: null,
    created_at: "2026-04-11T00:00:00.000Z",
    updated_at: "2026-04-11T00:00:00.000Z",
    sort_order: 0,
    ...overrides,
  };
}

const fixtures: CaseStudy[] = [
  makeCS({
    id: "a",
    industry: "Construction",
    workflow_type: "Scheduling",
    result_categories: ["time_saved", "visibility_gained"],
  }),
  makeCS({
    id: "b",
    industry: "Construction",
    workflow_type: "Billing",
    result_categories: ["cost_reduction"],
  }),
  makeCS({
    id: "c",
    industry: "Healthcare",
    workflow_type: "Intake",
    result_categories: ["error_reduction", "compliance_achieved"],
  }),
  makeCS({
    id: "d",
    industry: "Healthcare",
    workflow_type: "",
    result_categories: [],
  }),
  makeCS({
    id: "e",
    industry: "Legal",
    workflow_type: "Intake",
    result_categories: ["time_saved"],
  }),
];

// ---------------------------------------------------------------------------
// matchesCaseStudyFilters
// ---------------------------------------------------------------------------

describe("matchesCaseStudyFilters", () => {
  test("passes everything through when all filters are 'All'", () => {
    const result = fixtures.filter((cs) =>
      matchesCaseStudyFilters(cs, {
        industry: "All",
        workflowType: "All",
        resultCategory: "All",
      })
    );
    assert.equal(result.length, fixtures.length);
  });

  test("filters by industry only", () => {
    const result = fixtures.filter((cs) =>
      matchesCaseStudyFilters(cs, {
        industry: "Construction",
        workflowType: "All",
        resultCategory: "All",
      })
    );
    assert.deepEqual(
      result.map((r) => r.id),
      ["a", "b"]
    );
  });

  test("filters by workflow type only", () => {
    const result = fixtures.filter((cs) =>
      matchesCaseStudyFilters(cs, {
        industry: "All",
        workflowType: "Intake",
        resultCategory: "All",
      })
    );
    assert.deepEqual(
      result.map((r) => r.id),
      ["c", "e"]
    );
  });

  test("filters by result category only", () => {
    const result = fixtures.filter((cs) =>
      matchesCaseStudyFilters(cs, {
        industry: "All",
        workflowType: "All",
        resultCategory: "time_saved",
      })
    );
    assert.deepEqual(
      result.map((r) => r.id),
      ["a", "e"]
    );
  });

  test("combines all three filters (AND semantics)", () => {
    // Healthcare + Intake + error_reduction → only "c"
    const result = fixtures.filter((cs) =>
      matchesCaseStudyFilters(cs, {
        industry: "Healthcare",
        workflowType: "Intake",
        resultCategory: "error_reduction",
      })
    );
    assert.deepEqual(
      result.map((r) => r.id),
      ["c"]
    );
  });

  test("returns empty array when filters match nothing", () => {
    const result = fixtures.filter((cs) =>
      matchesCaseStudyFilters(cs, {
        industry: "Legal",
        workflowType: "Billing",
        resultCategory: "All",
      })
    );
    assert.equal(result.length, 0);
  });

  test("case study with empty workflow_type never matches a specific workflow filter", () => {
    // Study "d" has workflow_type: "". It should never match a specific filter value.
    const result = fixtures.filter((cs) =>
      matchesCaseStudyFilters(cs, {
        industry: "All",
        workflowType: "Intake",
        resultCategory: "All",
      })
    );
    assert.ok(!result.some((r) => r.id === "d"));
  });

  test("case study with empty result_categories never matches a specific result filter", () => {
    const result = fixtures.filter((cs) =>
      matchesCaseStudyFilters(cs, {
        industry: "All",
        workflowType: "All",
        resultCategory: "time_saved",
      })
    );
    assert.ok(!result.some((r) => r.id === "d"));
  });

  test("handles undefined result_categories (legacy docs) gracefully", () => {
    const legacy = makeCS({
      id: "legacy",
      result_categories: undefined as never, // simulate stale Firestore doc
    });
    // With specific result filter → should not match
    assert.equal(
      matchesCaseStudyFilters(legacy, {
        industry: "All",
        workflowType: "All",
        resultCategory: "time_saved",
      }),
      false
    );
    // With "All" result filter → should match
    assert.equal(
      matchesCaseStudyFilters(legacy, {
        industry: "All",
        workflowType: "All",
        resultCategory: "All",
      }),
      true
    );
  });
});

// ---------------------------------------------------------------------------
// collectResultCategories
// ---------------------------------------------------------------------------

describe("collectResultCategories", () => {
  test("returns unique categories across the list", () => {
    const result = collectResultCategories(fixtures);
    assert.equal(result.length, 5);
    assert.ok(result.includes("time_saved"));
    assert.ok(result.includes("visibility_gained"));
    assert.ok(result.includes("cost_reduction"));
    assert.ok(result.includes("error_reduction"));
    assert.ok(result.includes("compliance_achieved"));
  });

  test("excludes categories from case studies with empty arrays", () => {
    const subset = [fixtures[3]]; // only "d" which has no categories
    assert.deepEqual(collectResultCategories(subset), []);
  });

  test("handles undefined result_categories (legacy docs) without throwing", () => {
    const legacy = [
      makeCS({ id: "l1", result_categories: undefined as never }),
      makeCS({ id: "l2", result_categories: ["time_saved"] }),
    ];
    const result = collectResultCategories(legacy);
    assert.deepEqual(result, ["time_saved"]);
  });

  test("returns empty array for empty input", () => {
    assert.deepEqual(collectResultCategories([]), []);
  });
});

// ---------------------------------------------------------------------------
// collectWorkflowTypes
// ---------------------------------------------------------------------------

describe("collectWorkflowTypes", () => {
  test("returns unique sorted workflow types", () => {
    const result = collectWorkflowTypes(fixtures);
    assert.deepEqual(result, ["Billing", "Intake", "Scheduling"]);
  });

  test("excludes empty / whitespace-only workflow types", () => {
    const withBlanks = [
      makeCS({ id: "1", workflow_type: "Scheduling" }),
      makeCS({ id: "2", workflow_type: "" }),
      makeCS({ id: "3", workflow_type: "   " }),
      makeCS({ id: "4", workflow_type: "Billing" }),
    ];
    assert.deepEqual(collectWorkflowTypes(withBlanks), ["Billing", "Scheduling"]);
  });

  test("is sorted alphabetically", () => {
    const unsorted = [
      makeCS({ id: "1", workflow_type: "Zebra" }),
      makeCS({ id: "2", workflow_type: "Alpha" }),
      makeCS({ id: "3", workflow_type: "Mango" }),
    ];
    assert.deepEqual(collectWorkflowTypes(unsorted), ["Alpha", "Mango", "Zebra"]);
  });

  test("returns empty array for empty input", () => {
    assert.deepEqual(collectWorkflowTypes([]), []);
  });

  test("handles undefined workflow_type gracefully", () => {
    const legacy = [makeCS({ id: "1", workflow_type: undefined as never })];
    assert.deepEqual(collectWorkflowTypes(legacy), []);
  });
});
