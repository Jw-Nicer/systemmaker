import { expect, test, type Request } from "@playwright/test";
import { dismissConsentBanner } from "./helpers/consent";
import { mockLeadsAPI, mockLeadsAPIError, mockEventsAPI } from "./helpers/api-mocks";

test.describe("Contact page", () => {
  test("renders form with required fields and CTAs", async ({ page }) => {
    await page.goto("/contact");
    await dismissConsentBanner(page);

    await expect(
      page.getByRole("heading", { name: /Choose the next step/i })
    ).toBeVisible();

    // Required fields
    await expect(page.getByLabel("Name *")).toBeVisible();
    await expect(page.getByLabel("Email *")).toBeVisible();
    await expect(page.getByLabel("Company *")).toBeVisible();

    // Optional fields
    await expect(page.getByLabel("Urgency")).toBeVisible();
    await expect(page.getByLabel("Bottleneck")).toBeVisible();
    await expect(page.getByLabel("Current tools")).toBeVisible();

    // Submit button
    await expect(page.getByRole("button", { name: "Send details" })).toBeVisible();

    // Option cards
    await expect(
      page.getByRole("heading", { name: "Book a Scoping Call" }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Run a Guided Audit first/i })
    ).toBeVisible();
  });

  test("submitting empty form shows validation errors", async ({ page }) => {
    await page.goto("/contact");
    await dismissConsentBanner(page);

    await page.getByRole("button", { name: "Send details" }).click();

    await expect(page.getByText("Name is required")).toBeVisible();
    await expect(page.getByText("Valid email is required")).toBeVisible();
    await expect(page.getByText("Company is required")).toBeVisible();
    await expect(page.getByLabel("Name *")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Email *")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Company *")).toHaveAttribute("aria-invalid", "true");
  });

  test("submitting invalid email shows validation error", async ({ page }) => {
    await page.goto("/contact");
    await dismissConsentBanner(page);

    await page.getByLabel("Name *").fill("Test User");
    await page.getByLabel("Email *").fill("not-an-email");
    await page.getByLabel("Company *").fill("Test Co");

    await page.getByRole("button", { name: "Send details" }).click();

    await expect(page.getByText("Valid email is required")).toBeVisible();
    // Name and company errors should NOT show
    await expect(page.getByText("Name is required")).toBeHidden();
    await expect(page.getByText("Company is required")).toBeHidden();
  });

  test("successful submission shows success state", async ({ page }) => {
    await mockLeadsAPI(page);
    await mockEventsAPI(page);
    await page.goto("/contact");
    await dismissConsentBanner(page);

    await page.getByLabel("Name *").fill("Test User");
    await page.getByLabel("Email *").fill("test@example.com");
    await page.getByLabel("Company *").fill("Test Co");

    await page.getByRole("button", { name: "Send details" }).click();

    // Success state
    await expect(page.getByText("Request received")).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/respond within 24 hours/i)
    ).toBeVisible();
  });

  test("server error shows error message", async ({ page }) => {
    await mockLeadsAPIError(page, 500, "Database error");
    await page.goto("/contact");
    await dismissConsentBanner(page);

    await page.getByLabel("Name *").fill("Test User");
    await page.getByLabel("Email *").fill("test@example.com");
    await page.getByLabel("Company *").fill("Test Co");

    await page.getByRole("button", { name: "Send details" }).click();

    await expect(
      page.getByText(/something went wrong|database error/i)
    ).toBeVisible();
  });

  test("form captures UTM params from URL", async ({ page }) => {
    const captured: Request[] = [];
    await mockLeadsAPI(page, { capture: captured });
    await mockEventsAPI(page);

    await page.goto("/contact?utm_source=google&utm_medium=cpc&utm_campaign=spring");
    await dismissConsentBanner(page);

    await page.getByLabel("Name *").fill("UTM User");
    await page.getByLabel("Email *").fill("utm@example.com");
    await page.getByLabel("Company *").fill("UTM Co");

    await page.getByRole("button", { name: "Send details" }).click();
    await expect(page.getByText("Request received")).toBeVisible();

    // Verify the API received UTM params
    expect(captured.length).toBeGreaterThan(0);
    const body = JSON.parse(captured[0].postData()!);
    expect(body.utm_source).toBe("google");
    expect(body.utm_medium).toBe("cpc");
    expect(body.utm_campaign).toBe("spring");
  });

  test("Book a Scoping Call card points to scheduling options or inline fallback", async ({ page }) => {
    await page.goto("/contact");
    await dismissConsentBanner(page);

    await expect(
      page.getByText(/schedule a 45-minute call|reply with scheduling options/i).first()
    ).toBeVisible();
  });

  test("button shows loading state during submission", async ({ page }) => {
    // Delay the API response to observe loading state
    await page.route("**/api/leads", async (route) => {
      await new Promise((r) => setTimeout(r, 1000));
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ lead_id: "test-1" }),
      });
    });
    await mockEventsAPI(page);

    await page.goto("/contact");
    await dismissConsentBanner(page);

    await page.getByLabel("Name *").fill("Test User");
    await page.getByLabel("Email *").fill("test@example.com");
    await page.getByLabel("Company *").fill("Test Co");

    await page.getByRole("button", { name: "Send details" }).click();

    // Should show loading text
    await expect(page.getByRole("button", { name: "Sending..." })).toBeVisible();
  });
});
