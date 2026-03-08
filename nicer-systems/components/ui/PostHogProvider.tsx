"use client";

import { useEffect } from "react";
import { initAnalytics, syncAnalyticsPreference } from "@/lib/analytics";
import { ANALYTICS_CONSENT_EVENT } from "@/lib/analytics-consent";

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initAnalytics();

    const handleConsentChange = () => {
      syncAnalyticsPreference();
    };

    window.addEventListener(ANALYTICS_CONSENT_EVENT, handleConsentChange);
    window.addEventListener("storage", handleConsentChange);

    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_EVENT, handleConsentChange);
      window.removeEventListener("storage", handleConsentChange);
    };
  }, []);

  return <>{children}</>;
}
