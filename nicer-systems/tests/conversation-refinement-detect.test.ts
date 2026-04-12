import { test, describe } from "vitest";
import assert from "node:assert/strict";
import { detectRefinementIntent } from "@/lib/agents/conversation";

describe("detectRefinementIntent", () => {
  test("detects refinement intent with workflow section hint", () => {
    const result = detectRefinementIntent("Can you change the workflow stages?");
    assert.ok(result.detected);
    assert.equal(result.sectionHint, "workflow");
  });

  test("detects refinement intent with automation section hint", () => {
    const result = detectRefinementIntent("I want to improve the automations");
    assert.ok(result.detected);
    assert.equal(result.sectionHint, "automation");
  });

  test("detects refinement intent with dashboard/KPI hint", () => {
    const result = detectRefinementIntent("Can you add more detail to the KPIs?");
    assert.ok(result.detected);
    assert.equal(result.sectionHint, "dashboard");
  });

  test("detects refinement intent with roadmap hint", () => {
    const result = detectRefinementIntent("The timeline seems too long, can you shorten it?");
    assert.ok(result.detected);
    assert.equal(result.sectionHint, "implementation_sequencer");
  });

  test("detects refinement intent with proposal hint", () => {
    const result = detectRefinementIntent("Can you refine the ROI estimate?");
    assert.ok(result.detected);
    assert.equal(result.sectionHint, "proposal_writer");
  });

  test("detects generic refinement intent without section hint", () => {
    const result = detectRefinementIntent("This is too vague, can you improve it?");
    assert.ok(result.detected);
    assert.equal(result.sectionHint, undefined);
  });

  test("does not detect refinement intent in normal questions", () => {
    const result = detectRefinementIntent("How long will the implementation take?");
    assert.ok(!result.detected);
  });

  test("does not detect refinement intent in simple affirmations", () => {
    const result = detectRefinementIntent("Looks good, thanks!");
    assert.ok(!result.detected);
  });

  test("includes the message as feedback", () => {
    const msg = "Can you simplify the workflow stages?";
    const result = detectRefinementIntent(msg);
    assert.ok(result.detected);
    assert.equal(result.feedback, msg);
  });

  test("detects redo keyword", () => {
    const result = detectRefinementIntent("Can you redo the ops pulse section?");
    assert.ok(result.detected);
    assert.equal(result.sectionHint, "ops_pulse");
  });
});
