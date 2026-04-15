import { expect, test } from "@playwright/test";
import { dismissConsentBanner } from "./helpers/consent";
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
    await expect(nav.getByRole("link", { name: "Preview Plan" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "How it works" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Pricing" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Case Studies" })).toBeVisible();

    // Footer
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("hero Book a Scoping Call CTA opens the booking modal", async ({ page }) => {
    await page.goto("/");
    await dismissConsentBanner(page);

    await page.getByRole("button", { name: "Book a Scoping Call" }).first().click();
    await expect(page.getByRole("heading", { name: /Book your scoping call/i })).toBeVisible();
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
    await expect(firstButton).toHaveAttribute("aria-expanded", "false");

    // Click to expand — the answer div should appear
    await firstButton.click();
    const answerContainer = faqSection.locator("div.rounded-b-\\[20px\\]").first();
    await expect(answerContainer).toBeVisible({ timeout: 5_000 });
    await expect(firstButton).toHaveAttribute("aria-expanded", "true");

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
    await expect(page.getByText(/processed to generate your preview plan/i)).toBeVisible();
  });

  test("visible case study cards lead to working detail pages", async ({ page }) => {
    await page.goto("/case-studies");
    await dismissConsentBanner(page);

    const slugs = [
      "dispatch-workflow-rebuilt",
      "recruiting-handoffs-cleaned-up",
      "referral-intake-mapped",
    ];

    for (const slug of slugs) {
      const response = await page.goto(`/case-studies/${slug}`);
      expect(response?.status(), `Unexpected status for ${slug}`).toBe(200);
      await expect(page.getByRole("heading").first()).toBeVisible();
    }
  });

  test("footer contains navigation links", async ({ page }) => {
    await page.goto("/");
    await dismissConsentBanner(page);

    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("link", { name: "FAQ" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Privacy Policy" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Terms" })).toBeVisible();
  });

  test("primary marketing routes load without same-origin document or asset 404s", async ({ page }) => {
    const failures = new Set<string>();
    const isAppOrigin = (url: URL) => url.hostname === "127.0.0.1";

    page.on("response", (response) => {
      const request = response.request();
      const resourceType = request.resourceType();
      const url = new URL(response.url());

      if (!isAppOrigin(url)) {
        return;
      }

      if (!["document", "script", "stylesheet"].includes(resourceType)) {
        return;
      }

      if (response.status() >= 400) {
        failures.add(`${response.status()} ${resourceType} ${url.pathname}`);
      }
    });

    for (const route of ["/", "/faq", "/privacy", "/terms", "/case-studies", "/contact"]) {
      const response = await page.goto(route);
      expect(response?.status(), `Unexpected status for ${route}`).toBe(200);
      await dismissConsentBanner(page);
    }

    expect([...failures]).toEqual([]);
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
