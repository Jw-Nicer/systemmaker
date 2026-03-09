import { expect, test } from "@playwright/test";

test.describe("Plan sharing", () => {
  test("invalid plan ID shows 404 page", async ({ page }) => {
    await page.goto("/plan/nonexistent-plan-id-12345");

    // Custom 404 page
    await expect(
      page.getByRole("heading", { name: "Page not found" })
    ).toBeVisible();
  });

  test.describe("with seeded plan", () => {
    const planId = process.env.E2E_PLAN_ID;

    test.skip(!planId, "Requires E2E_PLAN_ID env var pointing to a real plan");

    test("plan page renders sections and CTA", async ({ page }) => {
      await page.goto(`/plan/${planId}`);

      // Plan content should be visible
      await expect(page.getByText(/Preview Plan/i)).toBeVisible();

      // Share buttons
      await expect(page.getByRole("button", { name: /Copy link/i })).toBeVisible();

      // CTA back to homepage
      await expect(
        page.getByRole("link", { name: /Preview Plan/i })
      ).toBeVisible();
    });
  });
});
