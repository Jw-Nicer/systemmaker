import { expect, test } from "@playwright/test";
import { dismissConsentBanner } from "./helpers/consent";
import { encodeSSE, mockEventsAPI } from "./helpers/api-mocks";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildAuditSSEResponse(planId = "test-audit-plan") {
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
      lead_id: "test-audit-lead",
      share_url: `/plan/${planId}`,
      audit_summary: "Healthcare intake audit",
    }),
    encodeSSE("done", {}),
  ].join("");
}

function buildAuditJSONResponse(planId = "test-audit-plan") {
  return {
    preview_plan: {
      intake: { clarified_problem: "Manual review slows intake." },
      workflow: { stages: [{ name: "Intake Review", owner_role: "Ops Lead" }] },
      automation: { automations: [{ trigger: "New application" }] },
      dashboard: { kpis: [{ name: "Review cycle time" }] },
      ops_pulse: { sections: [{ title: "Weekly ops review" }] },
    },
    lead_id: "test-audit-lead",
    plan_id: planId,
    share_url: `/plan/${planId}`,
    audit_summary: "Healthcare intake audit",
  };
}

async function mockAuditAPI(page: import("@playwright/test").Page, useSSE = true) {
  await page.route("**/api/agent/audit", async (route) => {
    if (useSSE) {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: { "Cache-Control": "no-cache", Connection: "keep-alive" },
        body: buildAuditSSEResponse(),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildAuditJSONResponse()),
      });
    }
  });
}

async function fillStep1(page: import("@playwright/test").Page) {
  await page.getByLabel("Industry").selectOption("Healthcare");
  await page.getByLabel("Workflow type").selectOption("Scheduling & Dispatch");
  await page.getByLabel("Team size").selectOption("6-15");
  await page.getByRole("button", { name: "Some tools no integration" }).click();
}

async function fillStep2(page: import("@playwright/test").Page) {
  await page.getByLabel("What is the bottleneck?").fill("Dispatch approvals still bounce between inboxes.");
  await page.getByLabel("Which steps are still manual?").fill("Coordinators copy updates into sheets and chase approvals manually.");
  await page.getByLabel("Where do handoffs break?").fill("Requests sit between dispatch and field teams without a clear owner.");
  await page.getByLabel("What is hard to see or report on?").fill("Nobody can see aging requests or overdue follow-up.");
}

async function fillStep3(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Slack" }).click();
  await page.getByRole("button", { name: "Airtable" }).click();
  await page.getByLabel("Rough volume").fill("120 requests per week");
  await page.getByLabel("Urgency").selectOption("high");
  await page.getByLabel("Time lost per week").selectOption("10+ hours");
}

async function completeAudit(page: import("@playwright/test").Page) {
  await fillStep1(page);
  await page.getByRole("button", { name: /^Continue$/i }).click();
  await expect(page.getByRole("heading", { name: "Breakpoints" })).toBeVisible();

  await fillStep2(page);
  await page.getByRole("button", { name: /^Continue$/i }).click();
  await expect(page.getByRole("heading", { name: "Operating load" })).toBeVisible();

  await fillStep3(page);
  await page.getByRole("button", { name: /^Continue$/i }).click();
  await expect(page.getByRole("heading", { name: "Target state" })).toBeVisible();

  await page.getByLabel("What does a better system need to do?").fill(
    "Route requests automatically, flag stuck work, and surface a weekly dashboard."
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Guided Audit Wizard", () => {
  test.beforeEach(async ({ page }) => {
    await mockEventsAPI(page);
    await mockAuditAPI(page);
  });

  test("renders the 4-step wizard with step navigation", async ({ page }) => {
    await page.goto("/audit");
    await dismissConsentBanner(page);

    // Step 1 is visible
    await expect(page.getByRole("heading", { name: "Context" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("1 of 4")).toBeVisible();

    // Back button is disabled on first step
    const backBtn = page.getByRole("button", { name: /back/i });
    await expect(backBtn).toBeDisabled();
  });

  test("validates required fields before advancing", async ({ page }) => {
    await page.goto("/audit");
    await dismissConsentBanner(page);

    // Try to advance without filling anything
    const continueBtn = page.getByRole("button", { name: /continue/i });
    await continueBtn.click();

    // Should show validation errors (stay on step 1)
    await expect(page.getByRole("heading", { name: "Context" })).toBeVisible();
    await expect(page.getByText("Industry is required")).toBeVisible();
    await expect(page.getByLabel(/Industry/)).toHaveAttribute("aria-invalid", "true");
  });

  test("navigates back to previous step", async ({ page }) => {
    await page.goto("/audit");
    await dismissConsentBanner(page);

    // Fill step 1 minimally and advance
    await fillStep1(page);
    await page.getByRole("button", { name: /^Continue$/i }).click();

    // Should be on step 2
    await expect(page.getByRole("heading", { name: "Breakpoints" })).toBeVisible({ timeout: 5_000 });

    // Go back
    await page.getByRole("button", { name: /^Back$/i }).click();
    await expect(page.getByRole("heading", { name: "Context" })).toBeVisible();
  });

  test("shows plan results after successful submission", async ({ page }) => {
    await page.goto("/audit");
    await dismissConsentBanner(page);

    await expect(page.getByRole("heading", { name: "Context" })).toBeVisible({ timeout: 10_000 });
    await completeAudit(page);
    await page.getByRole("button", { name: /Generate audit plan/i }).click();

    await expect(page.getByText("Guided audit complete")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: /Open shareable plan/i })).toBeVisible();
  });

  test("displays share link after plan generation", async ({ page }) => {
    // Mock a JSON response for simpler testing
    await page.route("**/api/agent/audit", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildAuditJSONResponse("share-test-plan")),
      });
    });

    await page.goto("/audit");
    await dismissConsentBanner(page);

    await expect(page.getByRole("heading", { name: "Context" })).toBeVisible({ timeout: 10_000 });
    await completeAudit(page);
    await page.getByRole("button", { name: /Generate audit plan/i }).click();

    await expect(page.getByRole("link", { name: /Open shareable plan/i })).toHaveAttribute(
      "href",
      "/plan/share-test-plan"
    );
  });
});
