import { expect, test, type Page } from "@playwright/test";

function encodeSSE(
  type: "message" | "phase_change" | "done",
  data: Record<string, unknown>
) {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function mockPreviewPlanCompletion(page: Page) {
  await page.route("**/api/agent/chat", async (route) => {
    const body = [
      encodeSSE("phase_change", { from: "gathering", to: "complete" }),
      encodeSSE("message", {
        content:
          "Your Preview Plan is ready! Want me to email it to you? Just share your name and email, and I'll send the full plan to your inbox.",
        email_capture: true,
      }),
      encodeSSE("done", {}),
    ].join("");

    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: {
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
      body,
    });
  });
}

test("privacy page renders legal content and links to terms", async ({ page }) => {
  await page.goto("/privacy");

  await expect(page).toHaveTitle(/Privacy Policy/i);
  await expect(
    page.getByRole("heading", {
      name: /Privacy policy for inquiries, preview plans, and site analytics/i,
    })
  ).toBeVisible();
  await expect(page.getByText("Last updated")).toBeVisible();

  await page.getByRole("link", { name: "Terms of Service" }).first().click();
  await expect(page).toHaveURL(/\/terms$/);
});

test("terms page renders legal content and links to privacy and contact", async ({ page }) => {
  await page.goto("/terms");

  await expect(page).toHaveTitle(/Terms of Service/i);
  await expect(
    page.getByRole("heading", {
      name: /Terms for using the site, preview plans, and public plan links/i,
    })
  ).toBeVisible();
  await expect(page.getByText("Last updated")).toBeVisible();

  await page.getByRole("link", { name: "Privacy Policy" }).first().click();
  await expect(page).toHaveURL(/\/privacy$/);

  await page.goto("/terms");
  await page.getByRole("link", { name: "Contact Us" }).first().click();
  await expect(page).toHaveURL(/\/contact$/);
});

test("footer legal links route correctly from the homepage", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("contentinfo").getByRole("link", { name: "Privacy Policy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);

  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Terms" }).click();
  await expect(page).toHaveURL(/\/terms$/);
});

test("contact page disclosure links route to privacy and terms", async ({ page }) => {
  await page.goto("/contact");

  const disclosure = page.locator("p", {
    hasText: "By sending details, you agree we may use this information",
  });

  await expect(disclosure).toBeVisible();

  await disclosure.getByRole("link", { name: "Privacy Policy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);

  await page.goto("/contact");
  await page.locator("p", {
    hasText: "By sending details, you agree we may use this information",
  }).getByRole("link", { name: "Terms" }).click();
  await expect(page).toHaveURL(/\/terms$/);
});

test("preview-plan email capture shows a working privacy link", async ({ page }) => {
  await mockPreviewPlanCompletion(page);
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /Build a preview plan/i })
  ).toBeVisible();

  await page.getByPlaceholder("Type your answer...").fill("We run manual logistics intake.");
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(
    page.getByRole("button", { name: "Email me the preview plan" })
  ).toBeVisible();

  await page.locator("p", {
    hasText: "We use these details to send your plan and follow up on your request.",
  }).getByRole("link", { name: "Privacy Policy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
});

test("analytics stay off until consent is granted and preferences persist", async ({ page }) => {
  let analyticsRequests = 0;

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

  await page.getByRole("link", { name: "Book a Scoping Call" }).first().click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect.poll(() => analyticsRequests).toBeGreaterThan(0);

  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Allow analytics tracking/i })
  ).toHaveCount(0);
});
