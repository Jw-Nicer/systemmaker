import { expect, type Page } from "@playwright/test";

export async function dismissConsentBanner(page: Page) {
  const declineButton = page.getByRole("button", { name: "Decline" });

  // The consent banner may render after hydration (useEffect sets isOpen),
  // so wait briefly for it to potentially appear.
  try {
    await declineButton.waitFor({ state: "visible", timeout: 3_000 });
    await declineButton.click();
    await expect(declineButton).toBeHidden();
  } catch {
    // Banner didn't appear — consent was already set or user already declined
  }
}
