import posthog from "posthog-js";

export const EVENTS = {
  LANDING_VIEW: "landing_view",
  BRUSH_REVEAL_START: "brush_reveal_start",
  BRUSH_REVEAL_COMPLETE: "brush_reveal_complete",
  AGENT_DEMO_START: "agent_demo_start",
  AGENT_DEMO_COMPLETE: "agent_demo_complete",
  PROOF_GALLERY_FILTER: "proof_gallery_filter_used",
  CASE_STUDY_VIEW: "case_study_view",
  CTA_CLICK_BOOK: "cta_click_book",
  CTA_CLICK_PREVIEW_PLAN: "cta_click_preview_plan",
  LEAD_SUBMIT: "lead_submit",
  BOOKING_CLICK: "booking_click",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

export function track(eventName: EventName, payload?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[analytics] ${eventName}`, payload ?? "");
    return;
  }

  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.capture(eventName, payload);
  }
}

export function initAnalytics() {
  if (
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_POSTHOG_KEY &&
    process.env.NODE_ENV === "production"
  ) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: false,
    });
  }
}
