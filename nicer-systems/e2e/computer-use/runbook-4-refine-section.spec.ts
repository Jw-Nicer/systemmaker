/**
 * Runbook 4 — Refine One Plan Section And Apply It.
 *
 * Defined in docs/AGENT_COMPUTER_USE_RUNBOOKS.md. Navigates to a seeded
 * plan, opens the Scope section's refiner, triggers a refinement via a
 * suggestion chip, waits for the refined content, applies it, and
 * verifies the section's rendered content updated.
 *
 * Refine + apply APIs are mocked so the scenario is deterministic and
 * does not depend on a live Gemini key. Firestore writes for the Apply
 * step are intercepted at the route level so the seeded doc stays clean.
 *
 * Requires E2E_PLAN_ID (see runbook 3 for setup).
 */

import { expect, test } from "@playwright/test";
import { encodeSSE } from "../helpers/sse";
import { TrackedSession } from "./harness";
import type { RunbookDef } from "./types";

const planId = process.env.E2E_PLAN_ID;

const RUNBOOK_4: RunbookDef = {
  id: "runbook-4-refine-section",
  title: "Refine One Plan Section And Apply It",
  start_url: planId ? `/plan/${planId}` : "/plan/unset",
  optimal_action_estimate: [6, 12],
};

const REFINED_INTAKE = {
  clarified_problem:
    "Maintenance requests arrive through phone and email; we now want automatic tenant acknowledgement within 2 minutes.",
  assumptions: [
    "Team of 10–15 coordinators handle ~120 requests/week",
    "Existing stack: AppFolio, Gmail, Google Sheets",
  ],
  constraints: [
    "No engineering resources on staff",
    "Tenants prefer email and SMS over phone",
  ],
  suggested_scope:
    "Build a centralized intake portal that auto-acknowledges within 2 minutes and routes to the right vendor.",
};

test.describe("Runbook 4: refine section and apply", () => {
  test.skip(!planId, "Requires E2E_PLAN_ID — run `npm run seed:e2e-plan` first");

  test("opens refiner, applies a refinement, verifies updated content", async ({ page }) => {
    // Mock the refine preview stream.
    await page.route("**/api/agent/refine", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: { "Cache-Control": "no-cache", Connection: "keep-alive" },
        body: [
          encodeSSE("message", { content: JSON.stringify(REFINED_INTAKE) }),
          encodeSSE("done", {}),
        ].join(""),
      });
    });

    // Mock the apply endpoint so we don't mutate the seeded Firestore doc.
    // The response must include `refined_content` — the hook stringifies it
    // and passes it back to the parent via `onRefined`, which is what
    // flips saveStatus to "saved".
    await page.route("**/api/agent/refine/apply", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          version: 2,
          refined_content: REFINED_INTAKE,
        }),
      });
    });

    const session = new TrackedSession(page, RUNBOOK_4);
    await session.goto(RUNBOOK_4.start_url);

    await expect(
      page.getByRole("heading", { name: /Preview Plan$/i })
    ).toBeVisible({ timeout: 15_000 });

    // Sections are expanded by default, so the scope body is already
    // visible — no toggle needed. Verify the original content before
    // invoking the refiner.
    await expect(page.getByText(/centralized intake portal/i).first()).toBeVisible();

    // Open the refiner on the scope section.
    const refineLink = page.getByRole("button", {
      name: /Refine this section/i,
    }).first();
    await session.click(refineLink, { what: "open-refiner" });
    await expect(page.getByText(/Refine Section/i)).toBeVisible();

    // Drive the refiner by typing into its input + clicking Send. This is
    // more reliable than a chip selector (chips are populated dynamically
    // from contextual suggestions) and mirrors how a real user would
    // dictate the change.
    const refineInput = page.getByPlaceholder(/improve this section/i);
    await session.fill(refineInput, "Make tenant acknowledgement 2 minutes max.", {
      what: "refine-feedback",
    });
    const sendBtn = page
      .getByRole("button", { name: /^Send$/ })
      .last();
    await session.click(sendBtn, { what: "refine-send" });

    // Wait for refinedContent — the "Apply changes" button only appears
    // after the stream completes.
    const applyBtn = page.getByRole("button", { name: /Apply changes/i });
    await expect(applyBtn).toBeVisible({ timeout: 10_000 });

    await session.click(applyBtn, { what: "apply-changes" });

    // Post-apply: the section's rendered content should reflect the
    // refinement, and the "Changes saved" banner confirms Firestore
    // persistence (mocked).
    await expect(page.getByText(/Changes saved/i)).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/auto-acknowledges within 2 minutes/i).first()
    ).toBeVisible({ timeout: 5_000 });

    session.markGoalReached();
    session.markFinalState("correct");
    const scorecard = await session.finalize("chip-refinement-apply");

    // Hard-fail guardrails.
    expect(scorecard.metrics.whether_human_intervention_was_needed).toBe(false);
    expect(scorecard.metrics.wrong_clicks_or_wrong_targets).toBe(0);
    expect(scorecard.readiness).not.toBe("not_reliable");
  });
});
