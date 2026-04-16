/**
 * Runbook 6 — Complete The Guided Audit Wizard.
 *
 * Defined in docs/AGENT_COMPUTER_USE_RUNBOOKS.md. Exercises the full 4-step
 * wizard including a validation-recovery path, and writes a scorecard under
 * test-results/computer-use/.
 */

import { expect, test } from "@playwright/test";
import { dismissConsentBanner } from "../helpers/consent";
import { mockEventsAPI } from "../helpers/api-mocks";
import { encodeSSE } from "../helpers/sse";
import { TrackedSession } from "./harness";
import type { RunbookDef } from "./types";

const RUNBOOK_6: RunbookDef = {
  id: "runbook-6-guided-audit",
  title: "Complete The Guided Audit Wizard",
  start_url: "/audit",
  optimal_action_estimate: [10, 18],
};

function buildAuditSSE(planId = "computer-use-audit-plan") {
  return [
    encodeSSE("plan_section", {
      section: "intake",
      label: "Bottleneck analysis complete",
      content: JSON.stringify({ clarified_problem: "Manual review slows intake." }),
    }),
    encodeSSE("plan_section", {
      section: "workflow",
      label: "Workflow mapped",
      content: JSON.stringify({ stages: [{ name: "Intake Review", owner_role: "Ops Lead" }] }),
    }),
    encodeSSE("plan_section", {
      section: "automation",
      label: "Automations configured",
      content: JSON.stringify({ automations: [{ trigger: "New application" }] }),
    }),
    encodeSSE("plan_section", {
      section: "dashboard",
      label: "KPIs defined",
      content: JSON.stringify({ kpis: [{ name: "Review cycle time" }] }),
    }),
    encodeSSE("plan_section", {
      section: "ops_pulse",
      label: "Ops Pulse ready",
      content: JSON.stringify({ sections: [{ title: "Weekly ops review" }] }),
    }),
    encodeSSE("plan_complete", {
      plan_id: planId,
      lead_id: "computer-use-audit-lead",
      share_url: `/plan/${planId}`,
      audit_summary: "Healthcare intake audit",
    }),
    encodeSSE("done", {}),
  ].join("");
}

async function mockAuditAPI(page: import("@playwright/test").Page) {
  await page.route("**/api/agent/audit", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: { "Cache-Control": "no-cache", Connection: "keep-alive" },
      body: buildAuditSSE(),
    });
  });
}

test.describe("Runbook 6: guided audit wizard", () => {
  test.beforeEach(async ({ page }) => {
    await mockEventsAPI(page);
    await mockAuditAPI(page);
  });

  test("happy path with one validation-recovery step", async ({ page }) => {
    const session = new TrackedSession(page, RUNBOOK_6);

    await session.goto(RUNBOOK_6.start_url);
    await dismissConsentBanner(page);

    await expect(page.getByRole("heading", { name: "Context" })).toBeVisible({
      timeout: 10_000,
    });

    // Intentionally trigger the runbook's "validation failure" recovery path
    // by advancing without filling required fields.
    const continueBtn = page.getByRole("button", { name: /^Continue$/i });
    await session.click(continueBtn, { what: "continue (premature)" });
    await expect(page.getByText("Industry is required")).toBeVisible();
    session.recordValidationError("Industry missing on step 1");

    // Recover: fill step 1 properly.
    await session.selectOption(page.getByLabel("Industry"), "Healthcare", {
      what: "industry",
      recovery: true,
    });
    await session.selectOption(
      page.getByLabel("Workflow type"),
      "Scheduling & Dispatch",
      { what: "workflow-type" }
    );
    await session.selectOption(page.getByLabel("Team size"), "6-15", {
      what: "team-size",
    });
    await session.click(
      page.getByRole("button", { name: "Some tools no integration" }),
      { what: "integration-state" }
    );
    await session.click(continueBtn, { what: "continue -> step 2" });

    await expect(page.getByRole("heading", { name: "Breakpoints" })).toBeVisible();

    await session.fill(
      page.getByLabel("What is the bottleneck?"),
      "Dispatch approvals still bounce between inboxes.",
      { what: "bottleneck" }
    );
    await session.fill(
      page.getByLabel("Which steps are still manual?"),
      "Coordinators copy updates into sheets and chase approvals manually.",
      { what: "manual-steps" }
    );
    await session.fill(
      page.getByLabel("Where do handoffs break?"),
      "Requests sit between dispatch and field teams without a clear owner.",
      { what: "handoffs" }
    );
    await session.fill(
      page.getByLabel("What is hard to see or report on?"),
      "Nobody can see aging requests or overdue follow-up.",
      { what: "reporting-gaps" }
    );
    await session.click(continueBtn, { what: "continue -> step 3" });

    await expect(page.getByRole("heading", { name: "Operating load" })).toBeVisible();

    await session.click(page.getByRole("button", { name: "Slack" }), {
      what: "tool-slack",
    });
    await session.click(page.getByRole("button", { name: "Airtable" }), {
      what: "tool-airtable",
    });
    await session.fill(page.getByLabel("Rough volume"), "120 requests per week", {
      what: "volume",
    });
    await session.selectOption(page.getByLabel("Urgency"), "high", {
      what: "urgency",
    });
    await session.selectOption(
      page.getByLabel("Time lost per week"),
      "10+ hours",
      { what: "time-lost" }
    );
    await session.click(continueBtn, { what: "continue -> step 4" });

    await expect(page.getByRole("heading", { name: "Target state" })).toBeVisible();

    await session.fill(
      page.getByLabel("What does a better system need to do?"),
      "Route requests automatically, flag stuck work, and surface a weekly dashboard.",
      { what: "target-state" }
    );

    await session.click(
      page.getByRole("button", { name: /Generate audit plan/i }),
      { what: "generate-plan" }
    );

    await expect(page.getByText("Guided audit complete")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("link", { name: /Open shareable plan/i })
    ).toBeVisible({ timeout: 5_000 });

    session.markGoalReached();
    session.markFinalState("correct");
    const scorecard = await session.finalize("happy-path-with-validation-recovery");

    // Hard-fail guardrails from the runbook doc.
    expect(scorecard.metrics.whether_human_intervention_was_needed).toBe(false);
    expect(scorecard.metrics.recovery_attempts).toBeLessThanOrEqual(2);
    expect(scorecard.readiness).not.toBe("not_reliable");
  });
});
