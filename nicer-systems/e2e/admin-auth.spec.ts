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
    // Delay the Firebase Auth response to observe loading state
    await page.route("**/identitytoolkit.googleapis.com/**", async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
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
    await page.getByRole("button", { name: "Sign In" }).click();

    // Should show loading text
    await expect(
      page.getByRole("button", { name: "Signing in..." })
    ).toBeVisible();
  });
});
