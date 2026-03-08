# Analytics & Funnel Spec
**Doc Date:** 2026-02-27 | **Updated:** 2026-03-05

## Provider
PostHog (client-side via `lib/analytics.ts`)
- `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` in `.env.local`
- `PostHogProvider` component wraps the app (`components/ui/PostHogProvider.tsx`)
- Console logging in dev, PostHog in production

## Attribution
- Capture UTMs on first landing (sessionStorage-based)
- Attach UTMs to lead record upon submit
- Track landing_path for variant attribution

## Core events
- `landing_view` — Fired on landing page mount (LandingViewTracker)
- `brush_reveal_start` — User begins brushing (BrushRevealCanvas)
- `brush_reveal_complete` — User reveals threshold amount (BrushRevealCanvas)
- `agent_demo_start` — User begins agent demo form (AgentDemoForm)
- `agent_demo_complete` — Agent demo produces output (AgentDemoResults)
- `agent_chat_start` — User begins SSE chat conversation (AgentChat)
- `agent_chat_plan_start` — Chat transitions into plan-building mode (useSSEChat)
- `agent_chat_plan_complete` — Chat finishes building a plan (useSSEChat)
- `proof_gallery_filter_used` — Filter chip clicked (ProofOfWorkClient)
- `case_study_view` — Case study detail page viewed
- `cta_click_book` — Book CTA clicked (TrackedLink)
- `cta_click_preview_plan` — Preview Plan CTA clicked (TrackedLink)
- `lead_submit` — Lead form submitted (API route)
- `booking_click` — Scheduler link clicked (TrackedLink)
- `preview_plan_email_capture` — User requests a preview plan by email
- `plan_view_shared` — Shared plan page viewed (`/plan/[id]`)
- `plan_shared_copy_link` / `plan_shared_email` / `plan_shared_linkedin` — Plan share action clicked
- `plan_refine_start` / `plan_refine_complete` / `plan_refine_view_diff` — Plan section refinement lifecycle

## A/B Testing Events
- Experiment variant bucketing tracked via `useExperiment` hook
- Variant assignment stored in sessionStorage for consistency
- Events tagged with experiment variant for analysis

## Dashboards (Admin / PostHog)
- Traffic by source
- Conversion rate by source
- Engagement metrics (brush + agent interactions)
- Preview email capture rate after completed plans
- Case study influence (view → submit)
- A/B test results by variant

## Data privacy
- No sensitive data collection
- Clear privacy policy at `/privacy` + terms at `/terms`
- Consent banner if required by region
