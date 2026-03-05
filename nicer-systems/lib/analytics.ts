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

  // Phase 4A: Agent Chat
  AGENT_CHAT_START: "agent_chat_start",
  AGENT_CHAT_MESSAGE: "agent_chat_message",
  AGENT_CHAT_PLAN_START: "agent_chat_plan_start",
  AGENT_CHAT_PLAN_COMPLETE: "agent_chat_plan_complete",
  AGENT_CHAT_FOLLOW_UP: "agent_chat_follow_up",
  AGENT_CHAT_EMAIL_CAPTURE: "agent_chat_email_capture",

  // Phase 4B: Shareable Plans
  PLAN_SHARED_COPY_LINK: "plan_shared_copy_link",
  PLAN_SHARED_EMAIL: "plan_shared_email",
  PLAN_SHARED_LINKEDIN: "plan_shared_linkedin",
  PLAN_VIEW_SHARED: "plan_view_shared",
  PLAN_PDF_DOWNLOAD: "plan_pdf_download",
  PLAN_CTA_GENERATE_OWN: "plan_cta_generate_own",

  // Phase 4C: Plan Refinement
  PLAN_REFINE_START: "plan_refine_start",
  PLAN_REFINE_MESSAGE: "plan_refine_message",
  PLAN_REFINE_COMPLETE: "plan_refine_complete",
  PLAN_REFINE_VIEW_DIFF: "plan_refine_view_diff",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

export function track(eventName: EventName, payload?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[analytics] ${eventName}`, payload ?? "");
    return;
  }

  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    import("posthog-js").then(({ default: posthog }) => {
      posthog.capture(eventName, payload);
    });
  }
}

export function initAnalytics() {
  if (
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_POSTHOG_KEY &&
    process.env.NODE_ENV === "production"
  ) {
    import("posthog-js").then(({ default: posthog }) => {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
        person_profiles: "identified_only",
        capture_pageview: false,
      });
    });
  }
}
