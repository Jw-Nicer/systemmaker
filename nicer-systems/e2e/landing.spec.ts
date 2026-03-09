import { expect, test } from "@playwright/test";
import { dismissConsentBanner } from "./helpers/consent";
import { clickAndWaitForUrl } from "./helpers/navigation";
import { mockEventsAPI } from "./helpers/api-mocks";

test.describe("Landing page", () => {
  test("loads with hero and key sections", async ({ page }) => {
    await page.goto("/");
    await dismissConsentBanner(page);

    // Hero
    await expect(
      page.getByRole("heading", { name: /Tell us the problem/i }).first()
    ).toBeVisible();

    // See It Work
    await expect(
      page.getByRole("heading", { name: /Build a preview plan/i })
    ).toBeVisible();

    // Navigation links to all sections
    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link", { name: "Demo" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "How it works" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Pricing" })).toBeVisible();

    // Footer
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("hero Book a Scoping Call CTA navigates to /contact", async ({ page }) => {
    await page.goto("/");
    await dismissConsentBanner(page);

    await clickAndWaitForUrl(
      page,
      page.getByRole("link", { name: "Book a Scoping Call" }).first(),
      /\/contact$/
    );
  });

  test("hero Get a Preview Plan CTA scrolls to #see-it-work", async ({ page }) => {
    await page.goto("/");
    await dismissConsentBanner(page);

    await page.getByRole("link", { name: "Get a Preview Plan" }).first().click();
    await page.waitForTimeout(800); // scroll animation
    await expect(page.locator("#see-it-work")).toBeInViewport();
  });

  test("FAQ accordion expands and collapses", async ({ page }) => {
    await page.goto("/");
    await dismissConsentBanner(page);

    // FAQ section is a server component that depends on Firestore.
    // Wait for it with a longer timeout, skip if not available.
    const faqSection = page.locator("#faq");
    try {
      await faqSection.waitFor({ state: "attached", timeout: 20_000 });
    } catch {
      test.skip(true, "FAQ section not rendered (Firestore may be unavailable)");
      return;
    }
    await faqSection.scrollIntoViewIfNeeded();

    // Find the first FAQ toggle button
    const firstButton = faqSection.getByRole("button").first();
    await expect(firstButton).toBeVisible();

    // Click to expand — the answer div should appear
    await firstButton.click();
    const answerContainer = faqSection.locator("div.rounded-b-\\[20px\\]").first();
    await expect(answerContainer).toBeVisible({ timeout: 5_000 });

    // Click again to collapse
    await firstButton.click();
    await expect(answerContainer).toBeHidden({ timeout: 5_000 });
  });

  test("SeeItWork section shows agent chat input", async ({ page }) => {
    await page.goto("/");
    await dismissConsentBanner(page);

    await expect(
      page.getByRole("heading", { name: /Build a preview plan/i })
    ).toBeVisible();

    // Agent chat component loads dynamically
    await expect(page.getByPlaceholder("Type your answer...")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("footer contains navigation links", async ({ page }) => {
    await page.goto("/");
    await dismissConsentBanner(page);

    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("link", { name: "Privacy Policy" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Terms" })).toBeVisible();
  });

  test("landing page fires analytics events after consent", async ({ page }) => {
    let eventCount = 0;

    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, "sendBeacon", {
        configurable: true,
        value: undefined,
      });
    });

    await page.route("**/api/events", async (route) => {
      eventCount++;
      await route.fulfill({ status: 204, body: "" });
    });

    await page.goto("/");

    // No events before consent
    await page.waitForTimeout(500);
    expect(eventCount).toBe(0);

    // Grant consent
    await page.getByRole("button", { name: "Allow analytics" }).click();

    // Navigate to trigger event
    await page.getByRole("link", { name: "Get a Preview Plan" }).first().click();

    await expect.poll(() => eventCount).toBeGreaterThan(0);
  });

  test("page has correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Nicer Systems/i);
  });
});
