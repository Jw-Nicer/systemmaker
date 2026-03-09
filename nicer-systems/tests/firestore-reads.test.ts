import { test, describe } from "vitest";
import assert from "node:assert/strict";
import {
  getRelatedCaseStudies,
  getIndustries,
} from "@/lib/firestore/case-studies";
import type { CaseStudy } from "@/types/case-study";

// getRelatedCaseStudies and getIndustries are pure functions that don't
// need Firestore — they operate on already-fetched data. We test these
// directly without mocking.

const makeCaseStudy = (overrides: Partial<CaseStudy> = {}): CaseStudy => ({
  id: "cs-1",
  title: "Test Study",
  slug: "test-study",
  client_name: "Test Client",
  industry: "healthcare",
  tools: ["Slack", "Airtable"],
  challenge: "Manual intake",
  solution: "Automated forms",
  metrics: [],
  thumbnail_url: "",
  sort_order: 0,
  is_published: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("getRelatedCaseStudies", () => {
  const current = makeCaseStudy({ id: "cs-1", industry: "healthcare", tools: ["Slack", "Airtable"] });

  test("returns empty when no other studies exist", () => {
    assert.deepEqual(getRelatedCaseStudies(current, [current]), []);
  });

  test("returns empty when no studies share industry or tools", () => {
    const unrelated = makeCaseStudy({ id: "cs-2", industry: "finance", tools: ["SAP"] });
    assert.deepEqual(getRelatedCaseStudies(current, [current, unrelated]), []);
  });

  test("ranks same-industry studies higher", () => {
    const sameIndustry = makeCaseStudy({ id: "cs-2", industry: "healthcare", tools: ["SAP"] });
    const sameTool = makeCaseStudy({ id: "cs-3", industry: "finance", tools: ["Slack"] });
    const results = getRelatedCaseStudies(current, [current, sameIndustry, sameTool]);
    assert.equal(results[0].id, "cs-2"); // industry match = 2 pts > tool match = 1 pt
  });

  test("shared tools add points", () => {
    const twoTools = makeCaseStudy({ id: "cs-2", industry: "finance", tools: ["Slack", "Airtable"] });
    const oneIndustry = makeCaseStudy({ id: "cs-3", industry: "healthcare", tools: ["SAP"] });
    const results = getRelatedCaseStudies(current, [current, twoTools, oneIndustry]);
    // twoTools = 2 pts (2 tools), oneIndustry = 2 pts (industry). Same score, order by array position
    assert.equal(results.length, 2);
  });

  test("respects limit parameter", () => {
    const studies = [
      current,
      makeCaseStudy({ id: "cs-2", industry: "healthcare", tools: ["X"] }),
      makeCaseStudy({ id: "cs-3", industry: "healthcare", tools: ["Y"] }),
      makeCaseStudy({ id: "cs-4", industry: "healthcare", tools: ["Z"] }),
      makeCaseStudy({ id: "cs-5", industry: "healthcare", tools: ["W"] }),
    ];
    const results = getRelatedCaseStudies(current, studies, 2);
    assert.equal(results.length, 2);
  });

  test("defaults to limit of 3", () => {
    const studies = [
      current,
      makeCaseStudy({ id: "cs-2", industry: "healthcare", tools: ["X"] }),
      makeCaseStudy({ id: "cs-3", industry: "healthcare", tools: ["Y"] }),
      makeCaseStudy({ id: "cs-4", industry: "healthcare", tools: ["Z"] }),
      makeCaseStudy({ id: "cs-5", industry: "healthcare", tools: ["W"] }),
    ];
    const results = getRelatedCaseStudies(current, studies);
    assert.equal(results.length, 3);
  });

  test("excludes the current study from results", () => {
    const other = makeCaseStudy({ id: "cs-2", industry: "healthcare", tools: ["Slack"] });
    const results = getRelatedCaseStudies(current, [current, other]);
    assert.ok(results.every((r) => r.id !== current.id));
  });
});

describe("getIndustries", () => {
  test("returns empty array for empty input", () => {
    assert.deepEqual(getIndustries([]), []);
  });

  test("extracts unique industries sorted alphabetically", () => {
    const studies = [
      makeCaseStudy({ id: "1", industry: "healthcare" }),
      makeCaseStudy({ id: "2", industry: "finance" }),
      makeCaseStudy({ id: "3", industry: "healthcare" }),
      makeCaseStudy({ id: "4", industry: "education" }),
    ];
    assert.deepEqual(getIndustries(studies), ["education", "finance", "healthcare"]);
  });

  test("returns single industry when all same", () => {
    const studies = [
      makeCaseStudy({ id: "1", industry: "healthcare" }),
      makeCaseStudy({ id: "2", industry: "healthcare" }),
    ];
    assert.deepEqual(getIndustries(studies), ["healthcare"]);
  });
});
