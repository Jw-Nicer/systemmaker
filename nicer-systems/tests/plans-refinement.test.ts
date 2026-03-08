import { test } from "vitest";
import assert from "node:assert/strict";
import {
  applyRefinedSection,
  mapRefineSectionKeyToPlanSection,
} from "@/lib/plans/refinement";
import { createPreviewPlan } from "@/tests/fixtures/preview-plan";

test("mapRefineSectionKeyToPlanSection maps UI keys to plan sections", () => {
  assert.equal(mapRefineSectionKeyToPlanSection("scope"), "intake");
  assert.equal(mapRefineSectionKeyToPlanSection("workflow"), "workflow");
  assert.equal(mapRefineSectionKeyToPlanSection("kpis"), "dashboard");
  assert.equal(mapRefineSectionKeyToPlanSection("alerts"), "automation");
  assert.equal(mapRefineSectionKeyToPlanSection("actions"), "ops_pulse");
});

test("applyRefinedSection replaces only the targeted section", () => {
  const plan = createPreviewPlan();
  const refinedDashboard = {
    ...plan.dashboard,
    kpis: [
      {
        name: "First-pass yield",
        definition: "Requests validated without rework",
        why_it_matters: "Shows process quality",
      },
    ],
  };

  const updated = applyRefinedSection(plan, "dashboard", refinedDashboard);

  assert.deepEqual(updated.dashboard, refinedDashboard);
  assert.deepEqual(updated.intake, plan.intake);
  assert.deepEqual(updated.workflow, plan.workflow);
  assert.deepEqual(updated.automation, plan.automation);
  assert.deepEqual(updated.ops_pulse, plan.ops_pulse);
});
