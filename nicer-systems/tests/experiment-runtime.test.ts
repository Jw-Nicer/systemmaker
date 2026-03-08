import test from "node:test";
import assert from "node:assert/strict";
import {
  getResolvedExperimentValue,
  normalizeExperimentCopy,
} from "@/lib/experiments/runtime";
import type { Experiment } from "@/types/experiment";

test("normalizeExperimentCopy ignores empty strings", () => {
  assert.equal(normalizeExperimentCopy("   "), undefined);
  assert.equal(normalizeExperimentCopy(" Hello "), "Hello");
});

test("getResolvedExperimentValue returns the completed winner value", () => {
  const experiment: Experiment = {
    id: "exp_1",
    name: "Hero headline test",
    target: "hero_headline",
    status: "completed",
    winner: "variant_a",
    variants: [
      { key: "control", label: "Control", value: "Default headline", weight: 50 },
      { key: "variant_a", label: "Variant A", value: "Faster scheduling", weight: 50 },
    ],
  };

  assert.equal(getResolvedExperimentValue(experiment, "control"), "Faster scheduling");
});

test("getResolvedExperimentValue falls back when the assigned copy is blank", () => {
  const experiment: Experiment = {
    id: "exp_2",
    name: "Hero CTA test",
    target: "hero_cta",
    status: "running",
    variants: [
      { key: "control", label: "Control", value: "Book a call", weight: 50 },
      { key: "variant_a", label: "Variant A", value: "   ", weight: 50 },
    ],
  };

  assert.equal(getResolvedExperimentValue(experiment, "variant_a"), undefined);
});

test("getResolvedExperimentValue ignores stopped experiments without a winner", () => {
  const experiment: Experiment = {
    id: "exp_3",
    name: "Stopped CTA test",
    target: "hero_cta",
    status: "stopped",
    variants: [
      { key: "control", label: "Control", value: "Book a call", weight: 50 },
      { key: "variant_a", label: "Variant A", value: "Schedule a review", weight: 50 },
    ],
  };

  assert.equal(getResolvedExperimentValue(experiment, "variant_a"), "Schedule a review");
});
