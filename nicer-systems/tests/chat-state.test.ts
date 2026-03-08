import { test } from "vitest";
import assert from "node:assert/strict";
import { chatReducer, createInitialChatState } from "@/hooks/useSSEChat";
import { createPreviewPlan } from "@/tests/fixtures/preview-plan";

test("chatReducer stores extracted intake updates without adding an empty message", () => {
  const initial = createInitialChatState();

  const updated = chatReducer(initial, {
    type: "UPDATE_EXTRACTED",
    extracted: {
      industry: "Logistics",
      bottleneck: "Manual dispatch tracking",
      current_tools: "Sheets and phone calls",
    },
  });

  assert.deepEqual(updated.extracted, {
    industry: "Logistics",
    bottleneck: "Manual dispatch tracking",
    current_tools: "Sheets and phone calls",
  });
  assert.equal(updated.messages.length, 0);
});

test("chatReducer assembles a complete plan from streamed sections", () => {
  const plan = createPreviewPlan();
  let state = createInitialChatState();

  state = chatReducer(state, {
    type: "PLAN_SECTION",
    section: "intake",
    label: "Bottleneck analysis complete",
    content: JSON.stringify(plan.intake),
  });
  state = chatReducer(state, {
    type: "PLAN_SECTION",
    section: "workflow",
    label: "Workflow mapping complete",
    content: JSON.stringify(plan.workflow),
  });
  state = chatReducer(state, {
    type: "PLAN_SECTION",
    section: "automation",
    label: "Automation design complete",
    content: JSON.stringify(plan.automation),
  });
  state = chatReducer(state, {
    type: "PLAN_SECTION",
    section: "dashboard",
    label: "Dashboard KPIs complete",
    content: JSON.stringify(plan.dashboard),
  });
  state = chatReducer(state, {
    type: "PLAN_SECTION",
    section: "ops_pulse",
    label: "Ops pulse complete",
    content: JSON.stringify(plan.ops_pulse),
  });

  assert.deepEqual(state.plan, plan);
  assert.equal(state.messages.length, 5);
});

test("chatReducer tolerates pending plan section events with null content", () => {
  const initial = createInitialChatState();

  const updated = chatReducer(initial, {
    type: "PLAN_SECTION",
    section: "workflow",
    label: "Mapping workflow stages...",
    content: null,
  });

  assert.equal(updated.plan, undefined);
  assert.deepEqual(updated.streamedPlan, {});
  assert.equal(updated.messages.length, 1);
  assert.equal(updated.messages[0]?.content, "");
});

test("chatReducer preserves email capture metadata on assistant messages", () => {
  const initial = createInitialChatState();

  const updated = chatReducer(initial, {
    type: "STREAM_MESSAGE",
    content: "Your Preview Plan is ready. Share your email and I will send it.",
    email_capture: true,
  });

  assert.equal(updated.messages.length, 1);
  assert.equal(updated.messages[0]?.email_capture, true);
});
