export const ANALYTICS_CONSENT_STORAGE_KEY = "ns-analytics-consent";
export const ANALYTICS_CONSENT_EVENT = "ns-analytics-consent-changed";
export const ANALYTICS_CONSENT_OPEN_EVENT = "ns-analytics-consent-open";

export type AnalyticsConsentStatus = "granted" | "denied" | "unset";

export function getAnalyticsConsentStatus(): AnalyticsConsentStatus {
  if (typeof window === "undefined") {
    return "unset";
  }

  const stored = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
  return stored === "granted" || stored === "denied" ? stored : "unset";
}

export function hasAnalyticsConsent() {
  return getAnalyticsConsentStatus() === "granted";
}

export function setAnalyticsConsentStatus(
  value: Exclude<AnalyticsConsentStatus, "unset">
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, value);
  window.dispatchEvent(
    new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: value })
  );
}

export function requestAnalyticsConsentManagerOpen() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(ANALYTICS_CONSENT_OPEN_EVENT));
}
