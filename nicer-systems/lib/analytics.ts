import { getCurrentExperimentAssignments } from "@/lib/experiments/assignments";
import { hasAnalyticsConsent } from "@/lib/analytics-consent";

export const EVENTS = {
  LANDING_VIEW: "landing_view",
  LANDING_EXPERIMENT_EXPOSURE: "landing_experiment_exposure",
  BRUSH_REVEAL_START: "brush_reveal_start",
  BRUSH_REVEAL_COMPLETE: "brush_reveal_complete",
  AGENT_DEMO_START: "agent_demo_start",
  AGENT_DEMO_COMPLETE: "agent_demo_complete",
  PROOF_GALLERY_FILTER: "proof_gallery_filter_used",
  CASE_STUDY_VIEW: "case_study_view",
  CTA_CLICK_BOOK: "cta_click_book",
  CTA_CLICK_PREVIEW_PLAN: "cta_click_preview_plan",
  CTA_CLICK_DEMO: "cta_click_demo",
  LEAD_SUBMIT: "lead_submit",
  BOOKING_CLICK: "booking_click",
  PREVIEW_PLAN_EMAIL_CAPTURE: "preview_plan_email_capture",
  GUIDED_AUDIT_START: "guided_audit_start",
  GUIDED_AUDIT_COMPLETE: "guided_audit_complete",

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

let posthogClientPromise: Promise<typeof import("posthog-js").default> | null = null;
let posthogInitialized = false;

function withAnalyticsContext(payload?: Record<string, unknown>) {
  const nextPayload = { ...(payload ?? {}) };

  if (
    typeof window !== "undefined" &&
    typeof nextPayload.landing_path !== "string"
  ) {
    nextPayload.landing_path = window.location.pathname;
  }

  if (typeof window !== "undefined" && nextPayload.experiment_assignments === undefined) {
    const assignments = getCurrentExperimentAssignments();
    if (assignments.length > 0) {
      nextPayload.experiment_assignments = assignments;
    }
  }

  return nextPayload;
}

function persistEvent(eventName: string, payload?: Record<string, unknown>) {
  if (typeof window === "undefined" || process.env.NODE_ENV === "test") {
    return;
  }

  if (!hasAnalyticsConsent()) {
    return;
  }

  const contextualPayload = withAnalyticsContext(payload);
  const body = JSON.stringify({
    event_name: eventName,
    payload: contextualPayload,
    lead_id:
      typeof contextualPayload.lead_id === "string"
        ? contextualPayload.lead_id
        : undefined,
  });

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const ok = navigator.sendBeacon(
        "/api/events",
        new Blob([body], { type: "application/json" })
      );
      if (ok) return;
    }
  } catch {
    // Fall back to fetch when sendBeacon is unavailable or fails.
  }

  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

async function getPostHogClient() {
  if (!posthogClientPromise) {
    posthogClientPromise = import("posthog-js").then(({ default: posthog }) => posthog);
  }

  return posthogClientPromise;
}

async function ensurePostHogInitialized() {
  const posthog = await getPostHogClient();

  if (!posthogInitialized) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: false,
    });
    posthogInitialized = true;
  }

  return posthog;
}

export function track(eventName: EventName, payload?: Record<string, unknown>) {
  if (!hasAnalyticsConsent()) {
    return;
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`[analytics] ${eventName}`, withAnalyticsContext(payload));
  }

  persistEvent(eventName, payload);

  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    ensurePostHogInitialized().then((posthog) => {
      posthog.capture(eventName, withAnalyticsContext(payload));
    });
  }
}

export function syncAnalyticsPreference() {
  if (
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_POSTHOG_KEY &&
    process.env.NODE_ENV === "production"
  ) {
    if (hasAnalyticsConsent()) {
      ensurePostHogInitialized().then((posthog) => {
        posthog.opt_in_capturing();
      });
      return;
    }

    if (posthogInitialized || posthogClientPromise) {
      getPostHogClient().then((posthog) => {
        posthog.opt_out_capturing();
        posthog.reset();
      });
    }
  }
}

export function initAnalytics() {
  syncAnalyticsPreference();
}
