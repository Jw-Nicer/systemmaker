"use client";

import { useState } from "react";
import { track, EVENTS } from "@/lib/analytics";

interface ShareButtonsProps {
  planId: string;
}

export function ShareButtons({ planId }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const planUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/plan/${planId}`
      : `/plan/${planId}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(planUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      track(EVENTS.PLAN_SHARED_COPY_LINK, { plan_id: planId });
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = planUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleEmail() {
    const subject = encodeURIComponent("Check out this Preview Plan from Nicer Systems");
    const body = encodeURIComponent(
      `I got an automated Preview Plan from Nicer Systems. Take a look:\n\n${planUrl}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
    track(EVENTS.PLAN_SHARED_EMAIL, { plan_id: planId });
  }

  function handleLinkedIn() {
    const url = encodeURIComponent(planUrl);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      "_blank",
      "width=600,height=500"
    );
    track(EVENTS.PLAN_SHARED_LINKEDIN, { plan_id: planId });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted mr-1">Share:</span>

      {/* Copy link */}
      <button
        onClick={handleCopy}
        className="text-xs px-2.5 py-1.5 rounded-md border border-border bg-surface hover:bg-surface-light transition-colors flex items-center gap-1.5"
        title="Copy link"
      >
        {copied ? (
          <>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 8l3.5 3.5L13 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <rect
                x="5"
                y="5"
                width="8"
                height="8"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path
                d="M3 11V3a1 1 0 011-1h8"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            Copy link
          </>
        )}
      </button>

      {/* Email */}
      <button
        onClick={handleEmail}
        className="text-xs px-2.5 py-1.5 rounded-md border border-border bg-surface hover:bg-surface-light transition-colors flex items-center gap-1.5"
        title="Share via email"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <rect
            x="2"
            y="3"
            width="12"
            height="10"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            d="M2 5l6 4 6-4"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Email
      </button>

      {/* LinkedIn */}
      <button
        onClick={handleLinkedIn}
        className="text-xs px-2.5 py-1.5 rounded-md border border-border bg-surface hover:bg-surface-light transition-colors flex items-center gap-1.5"
        title="Share on LinkedIn"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path
            d="M4.5 6.5v5M4.5 4.5v.01M7 11.5v-3a2 2 0 014 0v3M7 6.5v5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        LinkedIn
      </button>
    </div>
  );
}
