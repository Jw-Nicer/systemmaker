/**
 * Runbook 2 — Recover From Chat Stall Or Slow Stream.
 *
 * Defined in docs/AGENT_COMPUTER_USE_RUNBOOKS.md. Uses a 500 response on
 * the first send to put the chat into its visible failure state, then
 * exercises the "Start over" recovery affordance and confirms the chat
 * returns to a usable state for a fresh message.
 *
 * Choice of failure mode: the server returning a clean 500 is a
 * deterministic analogue to the stalled/degraded stream case. The chat
 * component surfaces the same error UI (with Try again + Start over) for
 * both true stalls (SSE timeout) and hard failures, so the recovery path
 * under test is identical.
 */

import { expect, test } from "@playwright/test";
import { dismissConsentBanner } from "../helpers/consent";
import { buildGatheringReply } from "../helpers/sse";
import { mockEventsAPI } from "../helpers/api-mocks";
import { TrackedSession } from "./harness";
import type { RunbookDef } from "./types";

const RUNBOOK_2: RunbookDef = {
  id: "runbook-2-stall-recovery",
  title: "Recover From Chat Stall Or Slow Stream",
  start_url: "/",
  optimal_action_estimate: [4, 8],
};

test.describe("Runbook 2: stall recovery", () => {
  test.beforeEach(async ({ page }) => {
    await mockEventsAPI(page);
  });

  test("detects failure, uses Start over, sends a fresh message", async ({ page }) => {
    // First call → 500 (simulates stall/failure).
    // Second call → normal gathering reply (recovery target).
    let callIndex = 0;
    await page.route("**/api/agent/chat", async (route) => {
      if (callIndex === 0) {
        callIndex++;
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal server error" }),
        });
        return;
      }
      callIndex++;
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: { "Cache-Control": "no-cache", Connection: "keep-alive" },
        body: buildGatheringReply("Got it — what tools are you using today?"),
      });
    });

    const session = new TrackedSession(page, RUNBOOK_2);

    await session.goto(RUNBOOK_2.start_url);
    await dismissConsentBanner(page);

    const input = page.getByPlaceholder("Type your answer...");
    const sendBtn = page.getByRole("button", { name: "Send message" });

    // Turn 1: triggers the 500 → visible error state.
    await session.fill(input, "We run a 30-person logistics team.", {
      what: "chat-input (turn 1)",
    });
    await session.click(sendBtn, { what: "send-btn (turn 1)" });

    const errorBanner = page.locator("[class*=red]", {
      hasText: /error|failed|something went wrong/i,
    });
    await expect(errorBanner.first()).toBeVisible({ timeout: 10_000 });
    session.recordStall("Chat surfaced failure banner after first send");

    // Recovery: click Start over — the visible failure-state affordance.
    const startOverBtn = page.getByRole("button", { name: /^Start over$/ }).first();
    await session.click(startOverBtn, { what: "start-over", recovery: true });

    // After reset, the error banner should be gone and input should be usable.
    await expect(errorBanner).toHaveCount(0);
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();

    // Turn 2 after recovery — the fresh message should get a reply.
    await session.fill(input, "Logistics ops, 30 people.", {
      what: "chat-input (post-recovery)",
    });
    await session.click(sendBtn, { what: "send-btn (post-recovery)" });

    await expect(
      page.getByText("Got it — what tools are you using today?")
    ).toBeVisible({ timeout: 10_000 });

    session.markGoalReached();
    session.markFinalState("correct");
    const scorecard = await session.finalize("500-error-recovery");

    // Hard-fail guardrails from the runbook doc.
    expect(scorecard.metrics.whether_human_intervention_was_needed).toBe(false);
    expect(scorecard.metrics.recovery_attempts).toBeLessThanOrEqual(2);
    // Stall is expected (one) — more than one means the recovery itself stalled.
    expect(scorecard.metrics.stalls_or_timeouts).toBeLessThanOrEqual(1);
    expect(scorecard.readiness).not.toBe("not_reliable");
  });
});
