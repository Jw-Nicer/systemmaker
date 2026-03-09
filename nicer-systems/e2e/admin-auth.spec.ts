import { expect, test } from "@playwright/test";

test.describe("Admin authentication", () => {
  test("login page renders form", async ({ page }) => {
    await page.goto("/admin/login");

    await expect(
      page.getByRole("heading", { name: "Nicer Admin" })
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
    await expect(page.getByText("Sign in to manage your site")).toBeVisible();
  });

  test("unauthenticated visit to /admin redirects to login", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/admin\/login/, { timeout: 15_000 });

    await expect(
      page.getByRole("heading", { name: "Nicer Admin" })
    ).toBeVisible();
  });

  test("submitting invalid credentials shows error", async ({ page }) => {
    // Mock Firebase Auth REST API to return error
    await page.route("**/identitytoolkit.googleapis.com/**", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: 400,
            message: "INVALID_LOGIN_CREDENTIALS",
          },
        }),
      });
    });

    await page.goto("/admin/login");

    await page.getByLabel("Email").fill("wrong@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Error message should appear
    await expect(
      page.locator("p", { hasText: /invalid|failed|error/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("login form shows loading state during submission", async ({ page }) => {
    // Intercept both the Firebase Auth REST call AND the session API
    // to keep the form in loading state long enough to observe it.
    await page.route("**/identitytoolkit/**", async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: 400, message: "INVALID_LOGIN_CREDENTIALS" },
        }),
      });
    });

    await page.goto("/admin/login");

    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password").fill("password123");

    // Click and immediately check for loading state
    await page.getByRole("button", { name: "Sign In" }).click();

    // The button should show loading text while Firebase auth is pending
    await expect(
      page.getByRole("button", { name: "Signing in..." })
    ).toBeVisible({ timeout: 5_000 });
  });
});
