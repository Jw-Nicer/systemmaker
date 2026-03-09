import type { Page } from "@playwright/test";

export async function clickAndWaitForUrl(
  page: Page,
  locator: ReturnType<Page["locator"]>,
  pattern: RegExp
) {
  await Promise.all([
    page.waitForURL(pattern, { timeout: 15_000 }),
    locator.click(),
  ]);
}
