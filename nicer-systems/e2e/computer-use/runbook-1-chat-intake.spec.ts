/**
 * Runbook 1 — Complete Agent Chat Intake From Landing Page.
 *
 * Defined in docs/AGENT_COMPUTER_USE_RUNBOOKS.md. The harness drives the
 * happy-path intake through the deterministic SSE mock and records a
 * scorecard under test-results/computer-use/.
 */

import { expect, test } from "@playwright/test";
import { dismissConsentBanner } from "../helpers/consent";
import {
  buildGatheringReply,
  buildFullPlanSSE,
} from "../helpers/sse";
import { mockAgentChatSequence, mockEventsAPI } from "../helpers/api-mocks";
import { TrackedSession } from "./harness";
import type { RunbookDef } from "./types";

const RUNBOOK_1: RunbookDef = {
  id: "runbook-1-chat-intake",
  title: "Complete Agent Chat Intake From Landing Page",
  start_url: "/",
  optimal_action_estimate: [6, 10],
};

test.describe("Runbook 1: chat intake", () => {
  test.beforeEach(async ({ page }) => {
    await mockEventsAPI(page);
  });

  test("happy path: reaches plan-ready state within optimal band", async ({ page }) => {
    await mockAgentChatSequence(page, [
      buildGatheringReply("What tools do you currently use?"),
      buildFullPlanSSE("computer-use-plan-1"),
    ]);

    const session = new TrackedSession(page, RUNBOOK_1);

    await session.goto(RUNBOOK_1.start_url);
    await dismissConsentBanner(page);

    await expect(page.getByText(/preview-plan agent/i)).toBeVisible({ timeout: 10_000 });

    const input = page.getByPlaceholder("Type your answer...");
    const sendBtn = page.getByRole("button", { name: "Send message" });

    await session.fill(input, "We run a 30-person property management shop.", {
      what: "chat-input (turn 1)",
    });
    await session.click(sendBtn, { what: "send-btn (turn 1)" });

    await expect(page.getByText("What tools do you currently use?")).toBeVisible({
      timeout: 10_000,
    });

    await session.fill(input, "Mostly AppFolio, Slack, and a lot of email.", {
      what: "chat-input (turn 2)",
    });
    await session.click(sendBtn, { what: "send-btn (turn 2)" });

    // Wait for the full plan to finish streaming — this is the pass condition
    // for the runbook's "build-ready or completed preview-plan state".
    await expect(page.getByText("Bottleneck analysis complete", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("button", { name: "Email me the preview plan" })
    ).toBeVisible({ timeout: 15_000 });

    session.markGoalReached();
    session.markFinalState("correct");
    const scorecard = await session.finalize("happy-path");

    // Hard-fail guardrails from the runbook doc.
    expect(scorecard.metrics.wrong_clicks_or_wrong_targets).toBe(0);
    expect(scorecard.metrics.whether_human_intervention_was_needed).toBe(false);
    expect(scorecard.readiness).not.toBe("not_reliable");
  });
});
