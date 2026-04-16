/**
 * Runbook 5 — Share, Export, Or Email The Plan.
 *
 * Defined in docs/AGENT_COMPUTER_USE_RUNBOOKS.md. Navigates to a seeded
 * plan and exercises the Copy-link share flow end-to-end, confirming the
 * visible success state ("Copied!") and the clipboard contents.
 *
 * Copy link is the simplest of the outbound actions (no modal, no
 * downstream email/PDF service dependency) — it validates the runbook's
 * core requirement: "completes one outbound plan action with visible
 * confirmation". Email and PDF can be added as sibling scenarios.
 *
 * Requires E2E_PLAN_ID (see runbook 3 for setup).
 */

import { expect, test } from "@playwright/test";
import { TrackedSession } from "./harness";
import type { RunbookDef } from "./types";

const planId = process.env.E2E_PLAN_ID;

const RUNBOOK_5: RunbookDef = {
  id: "runbook-5-share-plan",
  title: "Share, Export, Or Email The Plan",
  start_url: planId ? `/plan/${planId}` : "/plan/unset",
  optimal_action_estimate: [3, 8],
};

test.describe("Runbook 5: share plan via copy link", () => {
  test.skip(!planId, "Requires E2E_PLAN_ID — run `npm run seed:e2e-plan` first");

  // Grant clipboard permissions so navigator.clipboard.writeText resolves.
  test.use({
    permissions: ["clipboard-read", "clipboard-write"],
  });

  test("copies the plan URL and confirms the success state", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const session = new TrackedSession(page, RUNBOOK_5);
    await session.goto(RUNBOOK_5.start_url);

    await expect(
      page.getByRole("heading", { name: /Preview Plan$/i })
    ).toBeVisible({ timeout: 15_000 });

    const copyBtn = page.getByRole("button", { name: /Copy link/i });
    await expect(copyBtn).toBeVisible();

    await session.click(copyBtn, { what: "copy-link" });

    // Visible success confirmation — the runbook's key assertion.
    await expect(page.getByText(/Copied/i)).toBeVisible({ timeout: 5_000 });

    // Verify the clipboard actually received the plan URL — protects
    // against "claims completion without confirming the UI outcome".
    const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardContent).toContain(`/plan/${planId}`);

    session.markGoalReached();
    session.markFinalState("correct");
    const scorecard = await session.finalize("copy-link");

    // Hard-fail guardrails.
    expect(scorecard.metrics.whether_human_intervention_was_needed).toBe(false);
    expect(scorecard.metrics.wrong_clicks_or_wrong_targets).toBe(0);
    expect(scorecard.readiness).not.toBe("not_reliable");
  });
});
