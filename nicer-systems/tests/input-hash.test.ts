import { test, describe } from "vitest";
import assert from "node:assert/strict";
import { hashAgentInput, normalizeAgentInput } from "@/lib/agents/input-hash";

describe("normalizeAgentInput", () => {
  test("lowercases and trims all fields", () => {
    const result = normalizeAgentInput({
      industry: "  Property Management  ",
      bottleneck: "  We lose leads in EMAIL tag  ",
      current_tools: "Buildium, AppFolio",
      urgency: "HIGH",
    });
    assert.equal(result.industry, "property management");
    assert.equal(result.bottleneck, "we lose leads in email tag");
    assert.equal(result.urgency, "high");
  });

  test("collapses sentinel values to empty string", () => {
    const result = normalizeAgentInput({
      industry: "Unknown",
      bottleneck: "Not specified",
      current_tools: "N/A",
    });
    assert.equal(result.industry, "");
    assert.equal(result.bottleneck, "");
    assert.equal(result.current_tools, "");
  });

  test("sorts and deduplicates tools", () => {
    const result = normalizeAgentInput({
      industry: "Healthcare",
      bottleneck: "Slow intake",
      current_tools: "Zapier, Google Sheets, zapier, Airtable",
    });
    assert.equal(result.current_tools, "airtable,google sheets,zapier");
  });

  test("handles undefined / empty input gracefully", () => {
    const result = normalizeAgentInput({
      industry: "",
      bottleneck: "",
      current_tools: "",
    });
    assert.equal(result.industry, "");
    assert.equal(result.bottleneck, "");
    assert.equal(result.current_tools, "");
    assert.equal(result.urgency, "");
    assert.equal(result.volume, "");
  });
});

describe("hashAgentInput", () => {
  test("returns 64-char hex digest for valid input", () => {
    const hash = hashAgentInput({
      industry: "Property Management",
      bottleneck: "Leads fall through the cracks",
      current_tools: "Buildium",
    });
    assert.equal(hash.length, 64);
    assert.match(hash, /^[a-f0-9]{64}$/);
  });

  test("returns empty string when both industry and bottleneck are empty", () => {
    assert.equal(
      hashAgentInput({ industry: "", bottleneck: "", current_tools: "Zapier" }),
      ""
    );
  });

  test("returns empty string when sentinels are used", () => {
    assert.equal(
      hashAgentInput({
        industry: "Unknown",
        bottleneck: "Not specified",
        current_tools: "",
      }),
      ""
    );
  });

  test("is stable across whitespace and case variations", () => {
    const a = hashAgentInput({
      industry: "property management",
      bottleneck: "we lose leads in email tag",
      current_tools: "Buildium, AppFolio",
    });
    const b = hashAgentInput({
      industry: "  Property Management  ",
      bottleneck: "  We Lose Leads in Email Tag  ",
      current_tools: "appfolio, buildium",
    });
    assert.equal(a, b);
  });

  test("different inputs produce different hashes", () => {
    const a = hashAgentInput({
      industry: "Healthcare",
      bottleneck: "Patient intake is slow",
      current_tools: "",
    });
    const b = hashAgentInput({
      industry: "Healthcare",
      bottleneck: "Billing cycle takes 45 days",
      current_tools: "",
    });
    assert.notEqual(a, b);
  });

  test("urgency and volume affect the hash", () => {
    const base = {
      industry: "Staffing",
      bottleneck: "Candidate tracking",
      current_tools: "",
    };
    const a = hashAgentInput({ ...base, urgency: "high" });
    const b = hashAgentInput({ ...base, urgency: "low" });
    assert.notEqual(a, b);
  });
});
