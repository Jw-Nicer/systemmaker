/**
 * Runbook 7 — Complete A Primary Flow On Mobile Viewport.
 *
 * Defined in docs/AGENT_COMPUTER_USE_RUNBOOKS.md. Re-runs the chat intake
 * happy path from a `390x844` viewport to verify responsive navigation,
 * scroll handling, and the mobile CTA surface. The runbook doc permits
 * up to `1.5x` the desktop optimal path, so the estimate here is widened
 * accordingly.
 */

import { expect, test } from "@playwright/test";
import { dismissConsentBanner } from "../helpers/consent";
import { buildFullPlanSSE, buildGatheringReply } from "../helpers/sse";
import { mockAgentChatSequence, mockEventsAPI } from "../helpers/api-mocks";
import { TrackedSession } from "./harness";
import type { RunbookDef } from "./types";

const RUNBOOK_7: RunbookDef = {
  id: "runbook-7-mobile-intake",
  title: "Complete A Primary Flow On Mobile Viewport",
  // Desktop optimal was 6-10 (runbook 1). Mobile gets 1.5x headroom per doc.
  optimal_action_estimate: [8, 15],
  start_url: "/",
};

test.describe("Runbook 7: primary flow on mobile viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await mockEventsAPI(page);
  });

  test("reaches plan-ready state on a 390x844 viewport", async ({ page }) => {
    await mockAgentChatSequence(page, [
      buildGatheringReply("What tools do you currently use?"),
      buildFullPlanSSE("computer-use-plan-mobile"),
    ]);

    const session = new TrackedSession(page, RUNBOOK_7);

    await session.goto(RUNBOOK_7.start_url);
    await dismissConsentBanner(page);

    const input = page.getByPlaceholder("Type your answer...");

    // Scroll the chat input into view — common mobile requirement.
    await input.scrollIntoViewIfNeeded();
    session.note("Scrolled chat input into view on mobile viewport");

    const sendBtn = page.getByRole("button", { name: "Send message" });

    await session.fill(input, "Small property management shop, 30 people.", {
      what: "chat-input (turn 1)",
    });
    await session.click(sendBtn, { what: "send-btn (turn 1)" });

    await expect(page.getByText("What tools do you currently use?")).toBeVisible({
      timeout: 10_000,
    });

    await session.fill(input, "Mostly AppFolio, Slack, and email.", {
      what: "chat-input (turn 2)",
    });
    await session.click(sendBtn, { what: "send-btn (turn 2)" });

    await expect(
      page.getByText("Bottleneck analysis complete", { exact: true })
    ).toBeVisible({ timeout: 15_000 });

    const emailBtn = page.getByRole("button", { name: "Email me the preview plan" });
    await emailBtn.scrollIntoViewIfNeeded();
    await expect(emailBtn).toBeVisible({ timeout: 15_000 });

    session.markGoalReached();
    session.markFinalState("correct");
    const scorecard = await session.finalize("mobile-390x844-happy-path");

    // Hard-fail guardrails from the runbook doc.
    expect(scorecard.metrics.wrong_clicks_or_wrong_targets).toBe(0);
    expect(scorecard.metrics.whether_human_intervention_was_needed).toBe(false);
    expect(scorecard.readiness).not.toBe("not_reliable");
  });
});
