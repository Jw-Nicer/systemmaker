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
  assert.equal(
    mapRefineSectionKeyToPlanSection("roadmap"),
    "implementation_sequencer"
  );
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

test("applyRefinedSection replaces intake section", () => {
  const plan = createPreviewPlan();
  const refined = { ...plan.intake, clarified_problem: "Updated problem" };
  const updated = applyRefinedSection(plan, "intake", refined);
  assert.deepEqual(updated.intake, refined);
  assert.deepEqual(updated.workflow, plan.workflow);
});

test("applyRefinedSection replaces workflow section", () => {
  const plan = createPreviewPlan();
  const refined = { ...plan.workflow, required_fields: ["new_field"] };
  const updated = applyRefinedSection(plan, "workflow", refined);
  assert.deepEqual(updated.workflow, refined);
  assert.deepEqual(updated.intake, plan.intake);
});

test("applyRefinedSection replaces automation section", () => {
  const plan = createPreviewPlan();
  const refined = { ...plan.automation, alerts: [] };
  const updated = applyRefinedSection(plan, "automation", refined);
  assert.deepEqual(updated.automation, refined);
  assert.deepEqual(updated.dashboard, plan.dashboard);
});

test("applyRefinedSection replaces ops_pulse section", () => {
  const plan = createPreviewPlan();
  const refined = { ...plan.ops_pulse, questions: ["New question?"] };
  const updated = applyRefinedSection(plan, "ops_pulse", refined);
  assert.deepEqual(updated.ops_pulse, refined);
  assert.deepEqual(updated.workflow, plan.workflow);
});

test("applyRefinedSection maps implementation_sequencer to roadmap property", () => {
  const plan = createPreviewPlan();
  const refined = { ...plan.roadmap, total_estimated_weeks: 6 };
  const updated = applyRefinedSection(
    plan,
    "implementation_sequencer",
    refined
  );
  assert.deepEqual(updated.roadmap, refined);
  assert.deepEqual(updated.intake, plan.intake);
});
