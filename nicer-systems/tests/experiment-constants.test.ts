import { test } from "vitest";
import assert from "node:assert/strict";

import {
  EXPERIMENT_TARGETS,
  VALID_EXPERIMENT_TARGETS,
  type ExperimentTarget,
} from "../lib/constants/experiments";

test("EXPERIMENT_TARGETS contains expected values", () => {
  assert.deepEqual([...EXPERIMENT_TARGETS], [
    "hero_headline",
    "hero_cta",
    "final_cta",
  ]);
});

test("VALID_EXPERIMENT_TARGETS Set matches array", () => {
  assert.equal(VALID_EXPERIMENT_TARGETS.size, EXPERIMENT_TARGETS.length);
  for (const target of EXPERIMENT_TARGETS) {
    assert.ok(VALID_EXPERIMENT_TARGETS.has(target));
  }
});

test("VALID_EXPERIMENT_TARGETS rejects unknown targets", () => {
  assert.equal(VALID_EXPERIMENT_TARGETS.has("nonexistent"), false);
  assert.equal(VALID_EXPERIMENT_TARGETS.has(""), false);
});

test("ExperimentTarget type is a union of known targets", () => {
  // Type-level check: these should compile without error
  const t1: ExperimentTarget = "hero_headline";
  const t2: ExperimentTarget = "hero_cta";
  const t3: ExperimentTarget = "final_cta";
  assert.ok(t1 && t2 && t3);
});
