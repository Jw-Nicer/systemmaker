import { test } from "vitest";
import assert from "node:assert/strict";

import { getExperimentWinnerRecommendation } from "@/lib/experiments/recommendation";
import type { ExperimentVariant } from "@/types/experiment";
import type { ExperimentExposureSummary } from "@/types/analytics";

const variants: ExperimentVariant[] = [
  { key: "control", label: "Control", value: "A", weight: 50 },
  { key: "variant_a", label: "Variant A", value: "B", weight: 50 },
];

test("getExperimentWinnerRecommendation prefers lead rate when leads exist", () => {
  const summary: ExperimentExposureSummary = {
    experimentId: "exp_1",
    experimentName: "Hero test",
    target: "hero_headline",
    exposures: 40,
    leads: 6,
    bookings: 1,
    leadConversionRate: 15,
    bookingRate: 2.5,
    lastSeen: "2026-03-08T00:00:00.000Z",
    variants: [
      {
        key: "control",
        label: "Control",
        exposures: 20,
        share: 50,
        leads: 2,
        bookings: 1,
        leadConversionRate: 10,
        bookingRate: 5,
      },
      {
        key: "variant_a",
        label: "Variant A",
        exposures: 20,
        share: 50,
        leads: 4,
        bookings: 0,
        leadConversionRate: 20,
        bookingRate: 0,
      },
    ],
  };

  const recommendation = getExperimentWinnerRecommendation(summary, variants);

  assert.ok(recommendation);
  assert.equal(recommendation.variantKey, "variant_a");
  assert.equal(recommendation.metric, "lead_rate");
  assert.equal(recommendation.rate, 20);
});

test("getExperimentWinnerRecommendation falls back to booking rate when no leads exist", () => {
  const summary: ExperimentExposureSummary = {
    experimentId: "exp_2",
    experimentName: "CTA test",
    target: "hero_cta",
    exposures: 30,
    leads: 0,
    bookings: 3,
    leadConversionRate: 0,
    bookingRate: 10,
    lastSeen: "2026-03-08T00:00:00.000Z",
    variants: [
      {
        key: "control",
        label: "Control",
        exposures: 15,
        share: 50,
        leads: 0,
        bookings: 1,
        leadConversionRate: 0,
        bookingRate: 6.7,
      },
      {
        key: "variant_a",
        label: "Variant A",
        exposures: 15,
        share: 50,
        leads: 0,
        bookings: 2,
        leadConversionRate: 0,
        bookingRate: 13.3,
      },
    ],
  };

  const recommendation = getExperimentWinnerRecommendation(summary, variants);

  assert.ok(recommendation);
  assert.equal(recommendation.variantKey, "variant_a");
  assert.equal(recommendation.metric, "booking_rate");
  assert.equal(recommendation.rate, 13.3);
});

test("getExperimentWinnerRecommendation returns null when there is no conversion signal", () => {
  const summary: ExperimentExposureSummary = {
    experimentId: "exp_3",
    experimentName: "Empty test",
    target: "final_cta",
    exposures: 10,
    leads: 0,
    bookings: 0,
    leadConversionRate: 0,
    bookingRate: 0,
    lastSeen: "2026-03-08T00:00:00.000Z",
    variants: [
      {
        key: "control",
        label: "Control",
        exposures: 5,
        share: 50,
        leads: 0,
        bookings: 0,
        leadConversionRate: 0,
        bookingRate: 0,
      },
      {
        key: "variant_a",
        label: "Variant A",
        exposures: 5,
        share: 50,
        leads: 0,
        bookings: 0,
        leadConversionRate: 0,
        bookingRate: 0,
      },
    ],
  };

  assert.equal(getExperimentWinnerRecommendation(summary, variants), null);
});
