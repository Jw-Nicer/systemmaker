"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ANALYTICS_CONSENT_EVENT,
  ANALYTICS_CONSENT_OPEN_EVENT,
  getAnalyticsConsentStatus,
  requestAnalyticsConsentManagerOpen,
  setAnalyticsConsentStatus,
  type AnalyticsConsentStatus,
} from "@/lib/analytics-consent";

export function PrivacyPreferencesButton({
  className = "text-sm text-[#f0e9db] transition-colors hover:text-white",
  children = "Privacy Preferences",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={requestAnalyticsConsentManagerOpen}
      className={className}
    >
      {children}
    </button>
  );
}

export function AnalyticsConsentBanner() {
  const [consent, setConsent] = useState<AnalyticsConsentStatus>("unset");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const status = getAnalyticsConsentStatus();
    setConsent(status);

    if (status === "unset") {
      const timer = setTimeout(() => setIsOpen(true), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleConsentChange = () => {
      const next = getAnalyticsConsentStatus();
      setConsent(next);
      setIsOpen(next === "unset");
    };

    window.addEventListener(ANALYTICS_CONSENT_OPEN_EVENT, handleOpen);
    window.addEventListener(ANALYTICS_CONSENT_EVENT, handleConsentChange);
    window.addEventListener("storage", handleConsentChange);

    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_OPEN_EVENT, handleOpen);
      window.removeEventListener(ANALYTICS_CONSENT_EVENT, handleConsentChange);
      window.removeEventListener("storage", handleConsentChange);
    };
  }, []);

  if (!isOpen) {
    return null;
  }

  const isUpdate = consent !== "unset";

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] p-2 sm:p-4">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-[24px] border border-[#d3cab8] bg-[linear-gradient(180deg,rgba(248,244,234,0.97),rgba(237,230,216,0.99))] shadow-[0_24px_80px_rgba(50,41,28,0.18)] backdrop-blur-md sm:rounded-[28px]">
        <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#7d7a6f] sm:text-[11px] sm:tracking-[0.22em]">
              Privacy Preferences
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#1d2318] sm:mt-3 sm:text-2xl">
              {isUpdate ? "Update analytics preference" : "Allow analytics tracking?"}
            </h2>
            <p className="mt-2 text-[13px] leading-5 text-[#50584b] sm:mt-3 sm:text-sm sm:leading-6">
              We use analytics to improve your experience and understand how
              the site is used. Declining keeps analytics off.
              Read the{" "}
              <Link
                href="/privacy"
                className="font-medium text-[#27311f] underline decoration-[#93a071] underline-offset-4"
              >
                Privacy Policy
              </Link>{" "}
              for details.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap lg:justify-end">
            <button
              type="button"
              onClick={() => {
                setAnalyticsConsentStatus("denied");
                setConsent("denied");
                setIsOpen(false);
              }}
              className="inline-flex min-w-[8.5rem] items-center justify-center rounded-full border border-[#cabfae] bg-white/60 px-4 py-2.5 text-sm font-medium text-[#25311f] transition-colors hover:bg-white sm:px-5 sm:py-3"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => {
                setAnalyticsConsentStatus("granted");
                setConsent("granted");
                setIsOpen(false);
              }}
              className="inline-flex min-w-[8.5rem] items-center justify-center rounded-full bg-[#171d13] px-4 py-2.5 text-sm font-medium text-[#f7f2e8] transition-transform hover:scale-[1.02] sm:px-5 sm:py-3"
            >
              Allow analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
