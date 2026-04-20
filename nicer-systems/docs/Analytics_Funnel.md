# Analytics & Funnel Spec
**Doc Date:** 2026-02-27 | **Updated:** 2026-04-20

## Provider
Analytics is implemented through PostHog plus server-side event persistence through `/api/events`.

Current implementation:
- client event helper in `lib/analytics.ts`
- PostHog provider in `components/ui/PostHogProvider.tsx`
- event persistence via `navigator.sendBeacon` or `fetch`
- analytics only run when consent is granted

## Attribution
- capture UTMs on landing
- persist `landing_path`
- attach context to lead and analytics events where applicable
- include experiment assignments in contextual payloads when available

## Current Event Registry
### Landing / homepage
- `landing_view`
- `landing_experiment_exposure`
- `brush_reveal_start`
- `brush_reveal_complete`
- `cta_click_book`
- `cta_click_preview_plan`
- `cta_click_demo`
- `cta_click_guided_audit`

### Agent demo and chat
- `agent_demo_start`
- `agent_demo_complete`
- `agent_chat_start`
- `agent_chat_message`
- `agent_chat_plan_start`
- `agent_chat_plan_complete`
- `agent_chat_follow_up`
- `agent_chat_email_capture`
- `agent_chat_view_full_plan`
- `agent_plan_cache_hit`
- `agent_prompt_variant_used`

### Guided audit
- `guided_audit_start`
- `guided_audit_complete`

### Proof / content
- `proof_gallery_filter_used`
- `case_study_view`

### Lead / booking
- `lead_submit`
- `booking_click`
- `booking_submit`
- `booking_confirmed`
- `preview_plan_email_capture`

### Pricing
- `pricing_tier_click` — fired from `PricingSection.tsx` when any tier CTA is clicked. Payload: `{ tier_name, tier_price, tier_action }` where `tier_action` is `"booking" | "audit" | "contact"`. Booking-action tiers also fire `booking_click` via `BookingCTAButton` so the booking funnel stays intact. Used to measure whether the free Discovery Call tier widens the top of the funnel or just cannibalizes the hero "Book a Scoping Call" CTA — review distribution at 30 days post-launch.

### Shared plans
- `plan_view_shared`
- `plan_shared_copy_link`
- `plan_shared_email`
- `plan_shared_linkedin`
- `plan_pdf_download`
- `plan_cta_generate_own`

### Refinement
- `plan_refine_start`
- `plan_refine_message`
- `plan_refine_complete`
- `plan_refine_view_diff`
- `plan_refine_apply`

## Funnel Shape
Primary funnel:
1. Landing view
2. CTA or interaction start
3. Plan generation or guided audit completion
4. Email capture and/or booking
5. Lead progression in admin

Important conversion surfaces:
- homepage hero
- homepage live demo
- guided audit
- shared plan CTA surface
- booking flow

## Experiment Context
- homepage experiments can affect hero and CTA surfaces
- assignments are included in analytics context where available
- experiment exposure is tracked explicitly

## Reporting Priorities
- landing to CTA rate
- landing to plan-generation rate
- guided audit completion rate
- plan generation to email capture
- plan generation to booking
- booking conversion by landing path and experiment assignment

## Notes
- This doc should reflect event names defined in `lib/analytics.ts`.
- If event constants change, this doc must be updated in the same change.
