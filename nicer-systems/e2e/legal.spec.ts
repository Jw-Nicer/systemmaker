import { expect, test } from "@playwright/test";
import { dismissConsentBanner } from "./helpers/consent";
import { clickAndWaitForUrl } from "./helpers/navigation";
import { mockPreviewPlanCompletion } from "./helpers/sse";

test("privacy page renders legal content and links to terms", async ({ page }) => {
  await page.goto("/privacy");
  await dismissConsentBanner(page);

  await expect(page).toHaveTitle(/Privacy Policy/i);
  await expect(
    page.getByRole("heading", {
      name: /Privacy policy for inquiries, preview plans, and site analytics/i,
    })
  ).toBeVisible();
  await expect(page.getByText("Last updated")).toBeVisible();

  await clickAndWaitForUrl(
    page,
    page.getByRole("link", { name: "Terms of Service" }).first(),
    /\/terms$/
  );
});

test("legacy privacy-policy route redirects to /privacy", async ({ page }) => {
  const response = await page.goto("/privacy-policy");
  await dismissConsentBanner(page);

  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page).toHaveTitle(/Privacy Policy/i);
});

test("faq page renders placeholder content", async ({ page }) => {
  await page.goto("/faq");
  await dismissConsentBanner(page);

  await expect(page).toHaveTitle(/FAQ/i);
  await expect(
    page.getByRole("heading", { name: /Got questions\? We've got answers\./i })
  ).toBeVisible();

  const faqSection = page.locator("#faq");
  await expect(faqSection).toBeVisible();
  await expect(faqSection.getByRole("button").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Try the Demo" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Contact us/i })).toBeVisible();
});

test("case studies page renders published studies or the fallback empty state instead of 404", async ({ page }) => {
  const response = await page.goto("/case-studies");
  await dismissConsentBanner(page);

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Case Studies/i);

  const emptyState = page.getByText(/Case studies coming soon/i);
  const liveStudyLinks = page.locator('a[href^="/case-studies/"]');

  if (await emptyState.count()) {
    await expect(emptyState).toBeVisible();
    await expect(
      page.getByRole("link", { name: "See a live preview plan" })
    ).toBeVisible();
  } else {
    await expect(liveStudyLinks.first()).toBeVisible();
  }
});

test("terms page renders legal content and links to privacy and contact", async ({ page }) => {
  await page.goto("/terms");
  await dismissConsentBanner(page);

  await expect(page).toHaveTitle(/Terms of Service/i);
  await expect(
    page.getByRole("heading", {
      name: /Terms for using the site, preview plans, and public plan links/i,
    })
  ).toBeVisible();
  await expect(page.getByText("Last updated")).toBeVisible();

  await clickAndWaitForUrl(
    page,
    page.getByRole("link", { name: "Privacy Policy" }).first(),
    /\/privacy$/
  );

  await page.goto("/terms");
  await clickAndWaitForUrl(
    page,
    page.getByRole("link", { name: "Contact Us" }).first(),
    /\/contact$/
  );
});

test("footer legal links route correctly from the homepage", async ({ page }) => {
  await page.goto("/");
  await dismissConsentBanner(page);

  // Scroll footer into view first
  const footer = page.getByRole("contentinfo");
  await footer.scrollIntoViewIfNeeded();

  await clickAndWaitForUrl(
    page,
    footer.getByRole("link", { name: "Privacy Policy" }),
    /\/privacy$/
  );

  await page.goto("/");
  await dismissConsentBanner(page);
  const footer2 = page.getByRole("contentinfo");
  await footer2.scrollIntoViewIfNeeded();

  await clickAndWaitForUrl(
    page,
    footer2.getByRole("link", { name: "FAQ" }),
    /\/faq$/
  );

  await page.goto("/");
  await dismissConsentBanner(page);
  const footer3 = page.getByRole("contentinfo");
  await footer3.scrollIntoViewIfNeeded();

  await clickAndWaitForUrl(
    page,
    footer3.getByRole("link", { name: "Terms" }),
    /\/terms$/
  );
});

test("contact page disclosure links route to privacy and terms", async ({ page }) => {
  await page.goto("/contact");
  await dismissConsentBanner(page);

  const disclosure = page.locator("p", {
    hasText: "By sending details, you agree we may use this information",
  });

  await expect(disclosure).toBeVisible();

  await clickAndWaitForUrl(
    page,
    disclosure.getByRole("link", { name: "Privacy Policy" }),
    /\/privacy$/
  );

  await page.goto("/contact");
  await clickAndWaitForUrl(
    page,
    page.locator("p", {
      hasText: "By sending details, you agree we may use this information",
    }).getByRole("link", { name: "Terms" }),
    /\/terms$/
  );
});

test("preview-plan email capture shows a working privacy link", async ({ page }) => {
  await mockPreviewPlanCompletion(page);
  await page.goto("/");
  await dismissConsentBanner(page);

  await expect(
    page.getByRole("heading", { name: /Build a preview plan/i })
  ).toBeVisible();

  await page.getByPlaceholder("Type your answer...").fill("We run manual logistics intake.");
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(
    page.getByRole("button", { name: "Email me the preview plan" })
  ).toBeVisible();

  await clickAndWaitForUrl(
    page,
    page.locator("p", {
      hasText: "We use these details to send your plan and follow up on your request.",
    }).getByRole("link", { name: "Privacy Policy" }),
    /\/privacy$/
  );
});

test("analytics stay off until consent is granted and preferences persist", async ({ page }) => {
  let analyticsRequests = 0;

  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, "sendBeacon", {
      configurable: true,
      value: undefined,
    });
  });

  await page.route("**/api/events", async (route) => {
    analyticsRequests += 1;
    await route.fulfill({ status: 204, body: "" });
  });

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Allow analytics tracking/i })
  ).toBeVisible();

  await page.waitForTimeout(500);
  expect(analyticsRequests).toBe(0);

  await page.getByRole("button", { name: "Allow analytics" }).click();
  await expect(
    page.getByRole("heading", { name: /Allow analytics tracking/i })
  ).toBeHidden();

  await page.getByRole("link", { name: "Get a Preview Plan" }).first().click();
  await expect.poll(() => analyticsRequests).toBeGreaterThan(0);

  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Allow analytics tracking/i })
  ).toHaveCount(0);

  await page.goto("/privacy");
  await page.getByRole("button", { name: "Manage Privacy Preferences" }).click();
  await expect(
    page.getByRole("heading", { name: /Update analytics preference/i })
  ).toBeVisible();
});
