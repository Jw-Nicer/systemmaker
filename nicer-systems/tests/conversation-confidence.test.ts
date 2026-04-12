import { test, describe } from "vitest";
import assert from "node:assert/strict";
import { computeExtractionConfidence } from "@/lib/agents/conversation";
import type { ExtractedIntake } from "@/types/chat";

describe("computeExtractionConfidence", () => {
  test("returns 1.0 for fully populated extraction", () => {
    const extracted: ExtractedIntake = {
      industry: "Property Management",
      bottleneck: "We lose 30% of leads because email follow-ups are manual",
      current_tools: "Buildium, AppFolio, Google Sheets",
      urgency: "high",
      volume: "150 units",
    };
    const score = computeExtractionConfidence(extracted);
    assert.ok(score >= 0.99, `Expected >= 0.99, got ${score}`);
  });

  test("returns ~0.66 when one required field is missing", () => {
    const extracted: ExtractedIntake = {
      industry: "Healthcare",
      bottleneck: "Patient intake takes too long with manual forms",
    };
    const score = computeExtractionConfidence(extracted);
    assert.ok(score >= 0.6 && score < 0.7, `Expected 0.6-0.7, got ${score}`);
  });

  test("returns ~0.33 when two required fields are missing", () => {
    const extracted: ExtractedIntake = {
      industry: "Construction",
    };
    const score = computeExtractionConfidence(extracted);
    assert.ok(score >= 0.3 && score < 0.4, `Expected 0.3-0.4, got ${score}`);
  });

  test("returns 0 for empty extraction", () => {
    const extracted: ExtractedIntake = {};
    assert.equal(computeExtractionConfidence(extracted), 0);
  });

  test("penalizes suspiciously short industry (< 3 chars)", () => {
    const good: ExtractedIntake = { industry: "Healthcare" };
    const short: ExtractedIntake = { industry: "IT" };
    const goodScore = computeExtractionConfidence(good);
    const shortScore = computeExtractionConfidence(short);
    assert.ok(goodScore > shortScore, "Short industry should score lower");
  });

  test("penalizes suspiciously short bottleneck (< 10 chars)", () => {
    const good: ExtractedIntake = {
      bottleneck: "We lose 30% of leads to manual email follow-ups",
    };
    const short: ExtractedIntake = { bottleneck: "slow" };
    const goodScore = computeExtractionConfidence(good);
    const shortScore = computeExtractionConfidence(short);
    assert.ok(goodScore > shortScore, "Short bottleneck should score lower");
  });

  test("capped at 1.0 even with all optional fields", () => {
    const extracted: ExtractedIntake = {
      industry: "Property Management",
      bottleneck: "Lease renewals fall through the cracks every quarter",
      current_tools: "Buildium, Google Sheets",
      urgency: "high",
      volume: "200 units",
      email: "john@example.com",
      name: "John",
    };
    assert.ok(computeExtractionConfidence(extracted) <= 1.0);
  });

  test("below 0.7 threshold when bottleneck is short and tools missing", () => {
    const extracted: ExtractedIntake = {
      industry: "Healthcare",
      bottleneck: "slow",
    };
    const score = computeExtractionConfidence(extracted);
    assert.ok(score < 0.7, `Expected < 0.7, got ${score}`);
  });
});
