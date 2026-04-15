import { expect, test } from "@playwright/test";
import { dismissConsentBanner } from "./helpers/consent";
import {
  mockAgentChatSequence,
  mockSendEmailAPI,
  mockEventsAPI,
  buildGatheringReply,
  buildFullPlanSSE,
  encodeSSE,
} from "./helpers/api-mocks";

test.describe("Agent chat", () => {
  test("shows welcome message and accepts user input", async ({ page }) => {
    await mockAgentChatSequence(page, [buildGatheringReply("What industry are you in?")]);
    await page.goto("/");
    await dismissConsentBanner(page);

    // Welcome message
    await expect(
      page.getByText(/preview-plan agent/i)
    ).toBeVisible({ timeout: 10_000 });

    // Input is ready
    const input = page.getByPlaceholder("Type your answer...");
    await expect(input).toBeVisible();

    // Send a message
    await input.fill("We run a logistics operation.");
    await page.getByRole("button", { name: "Send message" }).click();

    // User message appears
    await expect(page.getByText("We run a logistics operation.")).toBeVisible();
  });

  test("gathering phase: user sends message and receives agent response", async ({ page }) => {
    await mockAgentChatSequence(page, [
      buildGatheringReply("Got it! What tools do you currently use for intake?"),
    ]);

    await page.goto("/");
    await dismissConsentBanner(page);

    await page.getByPlaceholder("Type your answer...").fill("We handle freight intake manually.");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(
      page.getByText("Got it! What tools do you currently use for intake?")
    ).toBeVisible();
  });

  test("full chat flow: gathering through complete with plan sections", async ({ page }) => {
    await mockAgentChatSequence(page, [
      // Call 1: gathering reply
      buildGatheringReply("What tools do you use?"),
      // Call 2: another gathering reply then jump to building
      buildFullPlanSSE("test-plan-e2e"),
    ]);

    await page.goto("/");
    await dismissConsentBanner(page);

    // Send first message
    await page.getByPlaceholder("Type your answer...").fill("Logistics intake is manual.");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.getByText("What tools do you use?")).toBeVisible();

    // Send second message — triggers full plan build
    await page.getByPlaceholder("Type your answer...").fill("Excel and email.");
    await page.getByRole("button", { name: "Send message" }).click();

    // Plan sections stream in
    await expect(page.getByText("Bottleneck analysis complete", { exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Workflow mapped", { exact: true })).toBeVisible();
    await expect(page.getByText("KPIs defined", { exact: true })).toBeVisible();

    // Email capture appears
    await expect(
      page.getByRole("button", { name: "Email me the preview plan" })
    ).toBeVisible();
  });

  test("email capture form submits successfully", async ({ page }) => {
    let emailSent = false;
    await mockAgentChatSequence(page, [buildFullPlanSSE()]);
    await page.route("**/api/agent/send-email", async (route) => {
      emailSent = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });
    await mockEventsAPI(page);

    await page.goto("/");
    await dismissConsentBanner(page);

    // Trigger chat to complete phase
    await page.getByPlaceholder("Type your answer...").fill("Manual logistics intake.");
    await page.getByRole("button", { name: "Send message" }).click();

    // Wait for email capture button
    const emailButton = page.getByRole("button", { name: "Email me the preview plan" });
    await expect(emailButton).toBeVisible({ timeout: 10_000 });

    // Fill email capture form
    await page.getByPlaceholder("Your name").fill("Test User");
    await page.getByPlaceholder("you@company.com").fill("test@example.com");
    await emailButton.click();

    // Email capture form disappears after successful send
    await expect(emailButton).toBeHidden({ timeout: 5_000 });

    // Verify the API was called
    expect(emailSent).toBe(true);
  });

  test("chat input is disabled during building phase", async ({ page }) => {
    // Use a building phase that doesn't complete immediately
    const hangingBuild = [
      encodeSSE("phase_change", { from: "confirming", to: "building" }),
      encodeSSE("plan_section", {
        section: "intake",
        label: "Bottleneck analysis complete",
        content: JSON.stringify({ clarified_problem: "Slow intake." }),
      }),
      // No done event — simulates ongoing build
    ].join("");

    await mockAgentChatSequence(page, [hangingBuild]);
    await page.goto("/");
    await dismissConsentBanner(page);

    await page.getByPlaceholder("Type your answer...").fill("Test message.");
    await page.getByRole("button", { name: "Send message" }).click();

    // Wait for building state
    await expect(page.getByPlaceholder("Building your plan...")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("chat displays error when API returns 500", async ({ page }) => {
    await page.route("**/api/agent/chat", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });

    await page.goto("/");
    await dismissConsentBanner(page);

    await page.getByPlaceholder("Type your answer...").fill("Test message.");
    await page.getByRole("button", { name: "Send message" }).click();

    // Error should be visible in the chat area
    await expect(
      page.locator("[class*=red]", { hasText: /error|failed|something went wrong/i })
    ).toBeVisible({ timeout: 5_000 });
  });
});
