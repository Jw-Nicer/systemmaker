import { test } from "vitest";
import assert from "node:assert/strict";
import { buildPlanRefinementUpdate } from "@/lib/firestore/plans";
import { createPreviewPlan } from "@/tests/fixtures/preview-plan";

test("buildPlanRefinementUpdate updates preview_plan and serializes version content", () => {
  const plan = createPreviewPlan();
  const refinedOpsPulse = {
    ...plan.ops_pulse,
    actions: [
      {
        priority: "medium",
        owner_role: "Coordinator",
        action: "Review overdue requests every morning",
      },
    ],
  };

  const update = buildPlanRefinementUpdate(plan, {
    version: 2,
    section: "ops_pulse",
    content: refinedOpsPulse,
    feedback: "Make the next steps more realistic for a small team.",
  });

  assert.equal(update.version, 2);
  assert.deepEqual(update.preview_plan.ops_pulse, refinedOpsPulse);
  assert.equal(
    update.versionEntry.content,
    JSON.stringify(refinedOpsPulse)
  );
  assert.equal(update.versionEntry.section, "ops_pulse");
  assert.equal(
    update.versionEntry.feedback,
    "Make the next steps more realistic for a small team."
  );
  assert.ok(Date.parse(update.versionEntry.created_at));
});
