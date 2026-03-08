import test from "node:test";
import assert from "node:assert/strict";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  getAnalyticsConsentStatus,
  hasAnalyticsConsent,
  setAnalyticsConsentStatus,
} from "@/lib/analytics-consent";

class LocalStorageMock {
  #store = new Map<string, string>();

  getItem(key: string) {
    return this.#store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.#store.set(key, value);
  }

  removeItem(key: string) {
    this.#store.delete(key);
  }
}

function installWindow() {
  const events: string[] = [];
  const localStorage = new LocalStorageMock();
  const windowMock = {
    localStorage,
    dispatchEvent(event: Event) {
      events.push(event.type);
      return true;
    },
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: windowMock,
  });

  return { events, localStorage };
}

test("analytics consent defaults to unset without a stored choice", () => {
  const originalWindow = globalThis.window;
  delete (globalThis as { window?: Window }).window;

  assert.equal(getAnalyticsConsentStatus(), "unset");
  assert.equal(hasAnalyticsConsent(), false);

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: originalWindow,
  });
});

test("setAnalyticsConsentStatus persists granted consent and emits an event", () => {
  const originalWindow = globalThis.window;
  const { events, localStorage } = installWindow();

  setAnalyticsConsentStatus("granted");

  assert.equal(localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY), "granted");
  assert.equal(getAnalyticsConsentStatus(), "granted");
  assert.equal(hasAnalyticsConsent(), true);
  assert.equal(events.includes("ns-analytics-consent-changed"), true);

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: originalWindow,
  });
});
