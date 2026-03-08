import { test } from "vitest";
import assert from "node:assert/strict";
import { matchesIndustryKey, toIndustryKey } from "@/lib/marketing/industry-key";

test("toIndustryKey normalizes display names into slug-like keys", () => {
  assert.equal(toIndustryKey("Property Management"), "property-management");
  assert.equal(toIndustryKey(" HVAC Services 2025 "), "hvac-services-2025");
});

test("matchesIndustryKey matches display names against slug candidates", () => {
  assert.equal(matchesIndustryKey("Property Management", ["property-management"]), true);
  assert.equal(matchesIndustryKey("Field Services", ["logistics", "field-services"]), true);
  assert.equal(matchesIndustryKey("Healthcare", ["medical", "finance"]), false);
});
