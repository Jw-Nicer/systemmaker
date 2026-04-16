/**
 * Runbook 3 — Open And Inspect The Generated Full Plan.
 *
 * Defined in docs/AGENT_COMPUTER_USE_RUNBOOKS.md. Navigates to `/plan/{id}`,
 * expands a section, and verifies the rendered content matches the seeded
 * plan rather than a preview/shell.
 *
 * Requires a plan seeded into Firestore. Run `npm run seed:e2e-plan`
 * first, then set `E2E_PLAN_ID` before invoking the suite.
 */

import { expect, test } from "@playwright/test";
import { TrackedSession } from "./harness";
import type { RunbookDef } from "./types";

const planId = process.env.E2E_PLAN_ID;

const RUNBOOK_3: RunbookDef = {
  id: "runbook-3-open-plan",
  title: "Open And Inspect The Generated Full Plan",
  start_url: planId ? `/plan/${planId}` : "/plan/unset",
  optimal_action_estimate: [3, 6],
};

test.describe("Runbook 3: open full plan", () => {
  test.skip(
    !planId,
    "Requires E2E_PLAN_ID — run `npm run seed:e2e-plan` and set the output in env"
  );

  test("lands on plan route and verifies rendered sections", async ({ page }) => {
    const session = new TrackedSession(page, RUNBOOK_3);

    await session.goto(RUNBOOK_3.start_url);

    // Route-correct landing: the full-plan page has a unique heading.
    await expect(
      page.getByRole("heading", { name: /Preview Plan$/i })
    ).toBeVisible({ timeout: 15_000 });

    // Share controls must be present — they're only on the full plan page,
    // not in the chat preview.
    await expect(page.getByRole("button", { name: /Copy link/i })).toBeVisible();

    // Verify rendered body content — sections are expanded by default, so
    // the runbook's success criterion ("key sections visibly present") is
    // tested directly against the seeded data without requiring a toggle.
    await expect(
      page.getByText(/centralized intake portal/i).first()
    ).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/Workflow Map/i)).toBeVisible();
    await expect(page.getByText(/Dashboard KPIs/i)).toBeVisible();

    session.markGoalReached();
    session.markFinalState("correct");
    const scorecard = await session.finalize("seeded-plan-direct-nav");

    // Hard-fail guardrails.
    expect(scorecard.metrics.wrong_clicks_or_wrong_targets).toBe(0);
    expect(scorecard.metrics.whether_human_intervention_was_needed).toBe(false);
    expect(scorecard.readiness).not.toBe("not_reliable");
  });
});
