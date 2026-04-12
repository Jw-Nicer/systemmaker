import { test, describe } from "vitest";
import assert from "node:assert/strict";
import {
  chatReducer,
  createInitialChatState,
  isPreviewPlanComplete,
} from "@/hooks/useSSEChat";
import { createPreviewPlan } from "@/tests/fixtures/preview-plan";

// ---------------------------------------------------------------------------
// isPreviewPlanComplete
// ---------------------------------------------------------------------------

describe("isPreviewPlanComplete", () => {
  test("returns true when all 5 required sections are present", () => {
    const plan = createPreviewPlan();
    assert.equal(isPreviewPlanComplete(plan), true);
  });

  test("returns true even without roadmap (optional)", () => {
    const plan = createPreviewPlan();
    const { roadmap: _, ...rest } = plan;
    assert.equal(isPreviewPlanComplete(rest), true);
  });

  test("returns false when intake is missing", () => {
    const plan = createPreviewPlan();
    const { intake: _, ...rest } = plan;
    assert.equal(isPreviewPlanComplete(rest), false);
  });

  test("returns false when workflow is missing", () => {
    const plan = createPreviewPlan();
    const { workflow: _, ...rest } = plan;
    assert.equal(isPreviewPlanComplete(rest), false);
  });

  test("returns false when automation is missing", () => {
    const plan = createPreviewPlan();
    const { automation: _, ...rest } = plan;
    assert.equal(isPreviewPlanComplete(rest), false);
  });

  test("returns false when dashboard is missing", () => {
    const plan = createPreviewPlan();
    const { dashboard: _, ...rest } = plan;
    assert.equal(isPreviewPlanComplete(rest), false);
  });

  test("returns false when ops_pulse is missing", () => {
    const plan = createPreviewPlan();
    const { ops_pulse: _, ...rest } = plan;
    assert.equal(isPreviewPlanComplete(rest), false);
  });

  test("returns false for empty object", () => {
    assert.equal(isPreviewPlanComplete({}), false);
  });
});

// ---------------------------------------------------------------------------
// createInitialChatState
// ---------------------------------------------------------------------------

describe("createInitialChatState", () => {
  test("starts in gathering phase", () => {
    const state = createInitialChatState();
    assert.equal(state.phase, "gathering");
  });

  test("starts with empty messages", () => {
    const state = createInitialChatState();
    assert.deepEqual(state.messages, []);
  });

  test("starts not streaming", () => {
    const state = createInitialChatState();
    assert.equal(state.isStreaming, false);
  });

  test("starts with no error", () => {
    const state = createInitialChatState();
    assert.equal(state.error, null);
  });

  test("starts with empty extracted data", () => {
    const state = createInitialChatState();
    assert.deepEqual(state.extracted, {});
  });
});

// ---------------------------------------------------------------------------
// chatReducer
// ---------------------------------------------------------------------------

describe("chatReducer", () => {
  const init = createInitialChatState;

  describe("SEND_MESSAGE", () => {
    test("adds user message and sets streaming", () => {
      const state = chatReducer(init(), {
        type: "SEND_MESSAGE",
        message: "Hello",
      });
      assert.equal(state.messages.length, 1);
      assert.equal(state.messages[0].role, "user");
      assert.equal(state.messages[0].content, "Hello");
      assert.equal(state.isStreaming, true);
      assert.equal(state.error, null);
      assert.equal(state.streamingContent, "");
    });

    test("clears previous error", () => {
      const errState = chatReducer(init(), {
        type: "ERROR",
        message: "old error",
      });
      const state = chatReducer(errState, {
        type: "SEND_MESSAGE",
        message: "retry",
      });
      assert.equal(state.error, null);
    });
  });

  describe("STREAM_CHUNK", () => {
    test("appends to streamingContent", () => {
      let state = chatReducer(init(), {
        type: "SEND_MESSAGE",
        message: "Hi",
      });
      state = chatReducer(state, { type: "STREAM_CHUNK", content: "He" });
      state = chatReducer(state, { type: "STREAM_CHUNK", content: "llo" });
      assert.equal(state.streamingContent, "Hello");
    });
  });

  describe("STREAM_MESSAGE", () => {
    test("adds assistant message and clears streamingContent", () => {
      let state = chatReducer(init(), {
        type: "SEND_MESSAGE",
        message: "Hi",
      });
      state = chatReducer(state, { type: "STREAM_CHUNK", content: "partial" });
      state = chatReducer(state, {
        type: "STREAM_MESSAGE",
        content: "Full response",
      });
      assert.equal(state.messages.length, 2); // user + assistant
      assert.equal(state.messages[1].role, "assistant");
      assert.equal(state.messages[1].content, "Full response");
      assert.equal(state.streamingContent, "");
    });

    test("sets email_capture flag on message", () => {
      const state = chatReducer(init(), {
        type: "STREAM_MESSAGE",
        content: "Enter your email",
        email_capture: true,
      });
      assert.equal(state.messages[0].email_capture, true);
    });

    test("sets share_link on message when provided", () => {
      const state = chatReducer(init(), {
        type: "STREAM_MESSAGE",
        content: "Your Preview Plan is ready!",
        email_capture: true,
        share_link: "/plan/abc123",
      });
      assert.equal(state.messages[0].share_link, "/plan/abc123");
      assert.equal(state.messages[0].email_capture, true);
    });

    test("share_link works on auto-sent messages without email_capture", () => {
      const state = chatReducer(init(), {
        type: "STREAM_MESSAGE",
        content: "Your Preview Plan is ready! I've sent a copy to ...",
        share_link: "/plan/xyz789",
      });
      assert.equal(state.messages[0].share_link, "/plan/xyz789");
      assert.equal(state.messages[0].email_capture, undefined);
    });

    test("share_link is undefined when not provided", () => {
      const state = chatReducer(init(), {
        type: "STREAM_MESSAGE",
        content: "regular message",
      });
      assert.equal(state.messages[0].share_link, undefined);
    });
  });

  describe("UPDATE_EXTRACTED", () => {
    test("merges extracted data", () => {
      let state = chatReducer(init(), {
        type: "UPDATE_EXTRACTED",
        extracted: { industry: "healthcare" },
      });
      state = chatReducer(state, {
        type: "UPDATE_EXTRACTED",
        extracted: { bottleneck: "manual intake" },
      });
      assert.equal(state.extracted.industry, "healthcare");
      assert.equal(state.extracted.bottleneck, "manual intake");
    });

    test("overwrites existing keys", () => {
      let state = chatReducer(init(), {
        type: "UPDATE_EXTRACTED",
        extracted: { industry: "healthcare" },
      });
      state = chatReducer(state, {
        type: "UPDATE_EXTRACTED",
        extracted: { industry: "finance" },
      });
      assert.equal(state.extracted.industry, "finance");
    });
  });

  describe("PHASE_CHANGE", () => {
    test("updates phase", () => {
      const state = chatReducer(init(), {
        type: "PHASE_CHANGE",
        from: "gathering",
        to: "confirming",
      });
      assert.equal(state.phase, "confirming");
    });
  });

  describe("PLAN_SECTION", () => {
    test("adds section message and updates streamedPlan", () => {
      const sectionData = JSON.stringify({ clarified_problem: "Updated", assumptions: [], constraints: [], suggested_scope: "Test" });
      const state = chatReducer(init(), {
        type: "PLAN_SECTION",
        section: "intake",
        label: "Analyzing...",
        content: sectionData,
      });
      assert.equal(state.messages.length, 1);
      assert.equal(state.messages[0].plan_section, "intake");
      assert.deepEqual(state.streamedPlan.intake, JSON.parse(sectionData));
    });

    test("maps implementation_sequencer to roadmap key", () => {
      const roadmapData = JSON.stringify({ phases: [], critical_path: "test", total_estimated_weeks: 2 });
      const state = chatReducer(init(), {
        type: "PLAN_SECTION",
        section: "implementation_sequencer",
        label: "Building roadmap...",
        content: roadmapData,
      });
      assert.deepEqual(state.streamedPlan.roadmap, JSON.parse(roadmapData));
    });

    test("handles null content (progress update)", () => {
      const state = chatReducer(init(), {
        type: "PLAN_SECTION",
        section: "intake",
        label: "Starting...",
        content: null,
      });
      assert.equal(state.messages.length, 1);
      assert.equal(state.streamedPlan.intake, undefined);
    });

    test("handles invalid JSON content gracefully", () => {
      const state = chatReducer(init(), {
        type: "PLAN_SECTION",
        section: "intake",
        label: "Partial...",
        content: "{invalid json",
      });
      // Should not crash — message still added
      assert.equal(state.messages.length, 1);
    });

    test("sets plan when all 5 sections are complete", () => {
      const plan = createPreviewPlan();
      let state = init();

      state = chatReducer(state, {
        type: "PLAN_SECTION",
        section: "intake",
        label: "Done",
        content: JSON.stringify(plan.intake),
      });
      assert.equal(state.plan, undefined);

      state = chatReducer(state, {
        type: "PLAN_SECTION",
        section: "workflow",
        label: "Done",
        content: JSON.stringify(plan.workflow),
      });
      state = chatReducer(state, {
        type: "PLAN_SECTION",
        section: "automation",
        label: "Done",
        content: JSON.stringify(plan.automation),
      });
      state = chatReducer(state, {
        type: "PLAN_SECTION",
        section: "dashboard",
        label: "Done",
        content: JSON.stringify(plan.dashboard),
      });
      assert.equal(state.plan, undefined);

      state = chatReducer(state, {
        type: "PLAN_SECTION",
        section: "ops_pulse",
        label: "Done",
        content: JSON.stringify(plan.ops_pulse),
      });
      // Now plan should be set
      assert.ok(state.plan);
      assert.deepEqual(state.plan!.intake, plan.intake);
    });
  });

  describe("PLAN_COMPLETE", () => {
    test("sets plan_id, lead_id, and share_url", () => {
      const state = chatReducer(init(), {
        type: "PLAN_COMPLETE",
        plan_id: "plan-1",
        lead_id: "lead-1",
        share_url: "/plan/plan-1",
      });
      assert.equal(state.plan_id, "plan-1");
      assert.equal(state.lead_id, "lead-1");
      assert.equal(state.share_url, "/plan/plan-1");
    });
  });

  describe("SET_PLAN", () => {
    test("sets both plan and streamedPlan", () => {
      const plan = createPreviewPlan();
      const state = chatReducer(init(), { type: "SET_PLAN", plan });
      assert.deepEqual(state.plan, plan);
      assert.deepEqual(state.streamedPlan, plan);
    });
  });

  describe("MARK_EMAIL_CAPTURED", () => {
    test("flips email_auto_sent and merges name + email into extracted", () => {
      const state = chatReducer(init(), {
        type: "MARK_EMAIL_CAPTURED",
        name: "Jane Doe",
        email: "jane@acme.com",
      });
      assert.equal(state.email_auto_sent, true);
      assert.equal(state.extracted.name, "Jane Doe");
      assert.equal(state.extracted.email, "jane@acme.com");
    });

    test("preserves prior extracted fields when capturing", () => {
      const seeded = {
        ...init(),
        extracted: { industry: "legal", bottleneck: "intake forms" },
      };
      const state = chatReducer(seeded, {
        type: "MARK_EMAIL_CAPTURED",
        name: "John",
        email: "john@firm.com",
      });
      assert.equal(state.extracted.industry, "legal");
      assert.equal(state.extracted.bottleneck, "intake forms");
      assert.equal(state.extracted.name, "John");
      assert.equal(state.extracted.email, "john@firm.com");
    });

    test("does not overwrite existing name/email with empty strings", () => {
      const seeded = {
        ...init(),
        extracted: { name: "Existing Name", email: "existing@example.com" },
      };
      const state = chatReducer(seeded, {
        type: "MARK_EMAIL_CAPTURED",
        name: "",
        email: "",
      });
      assert.equal(state.email_auto_sent, true);
      assert.equal(state.extracted.name, "Existing Name");
      assert.equal(state.extracted.email, "existing@example.com");
    });
  });

  describe("STREAM_DONE", () => {
    test("sets isStreaming to false", () => {
      let state = chatReducer(init(), {
        type: "SEND_MESSAGE",
        message: "Hi",
      });
      state = chatReducer(state, { type: "STREAM_DONE" });
      assert.equal(state.isStreaming, false);
    });

    test("flushes buffered streamingContent as assistant message", () => {
      let state = chatReducer(init(), {
        type: "SEND_MESSAGE",
        message: "Hi",
      });
      state = chatReducer(state, {
        type: "STREAM_CHUNK",
        content: "buffered text",
      });
      state = chatReducer(state, { type: "STREAM_DONE" });

      assert.equal(state.streamingContent, "");
      const lastMsg = state.messages[state.messages.length - 1];
      assert.equal(lastMsg.role, "assistant");
      assert.equal(lastMsg.content, "buffered text");
    });

    test("does not add empty message when no buffered content", () => {
      let state = chatReducer(init(), {
        type: "SEND_MESSAGE",
        message: "Hi",
      });
      state = chatReducer(state, { type: "STREAM_DONE" });
      // Only the user message
      assert.equal(state.messages.length, 1);
    });
  });

  describe("ERROR", () => {
    test("sets error and stops streaming", () => {
      let state = chatReducer(init(), {
        type: "SEND_MESSAGE",
        message: "Hi",
      });
      state = chatReducer(state, {
        type: "ERROR",
        message: "Connection lost",
      });
      assert.equal(state.error, "Connection lost");
      assert.equal(state.isStreaming, false);
      assert.equal(state.streamingContent, "");
    });
  });

  describe("CLEAR_ERROR", () => {
    test("clears error", () => {
      let state = chatReducer(init(), {
        type: "ERROR",
        message: "oops",
      });
      state = chatReducer(state, { type: "CLEAR_ERROR" });
      assert.equal(state.error, null);
    });
  });

  describe("RESET", () => {
    test("returns to initial state", () => {
      let state = chatReducer(init(), {
        type: "SEND_MESSAGE",
        message: "Hi",
      });
      state = chatReducer(state, {
        type: "PHASE_CHANGE",
        from: "gathering",
        to: "building",
      });
      state = chatReducer(state, { type: "RESET" });
      assert.equal(state.phase, "gathering");
      assert.deepEqual(state.messages, []);
      assert.equal(state.isStreaming, false);
      assert.equal(state.error, null);
    });
  });
});
