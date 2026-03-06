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
- `agent_chat_complete` — Chat conversation reaches complete phase (AgentChat)
- `proof_gallery_filter_used` — Filter chip clicked (ProofOfWorkClient)
- `case_study_view` — Case study detail page viewed
- `cta_click_book` — Book CTA clicked (TrackedLink)
- `cta_click_preview_plan` — Preview Plan CTA clicked (TrackedLink)
- `lead_submit` — Lead form submitted (API route)
- `booking_click` — Scheduler link clicked (TrackedLink)
- `plan_view` — Shared plan page viewed (/plan/[id])
- `plan_shared` — Plan share button clicked (ShareButtons)
- `plan_refined` — Plan section refined (SectionRefiner)

## A/B Testing Events
- Experiment variant bucketing tracked via `useExperiment` hook
- Variant assignment stored in sessionStorage for consistency
- Events tagged with experiment variant for analysis

## Dashboards (Admin / PostHog)
- Traffic by source
- Conversion rate by source
- Engagement metrics (brush + agent interactions)
- Case study influence (view → submit)
- A/B test results by variant

## Data privacy
- No sensitive data collection
- Clear privacy policy at `/privacy` + terms at `/terms`
- Consent banner if required by region
