# Analytics & Funnel Spec
**Doc Date:** 2026-02-27

## Attribution
- Capture UTMs on first landing
- Store in local storage + cookie
- Attach UTMs to lead record upon submit

## Core events
- landing_view
- brush_reveal_start
- brush_reveal_complete (optional threshold)
- agent_demo_start
- agent_demo_complete
- proof_gallery_filter_used
- case_study_view
- cta_click_book
- cta_click_preview_plan
- lead_submit
- booking_click

## Dashboards (Admin / PostHog)
- Traffic by source
- Conversion rate by source
- Engagement metrics (brush + agent)
- Case study influence (view → submit)

## Data privacy
- No sensitive data collection
- Clear privacy policy + consent banner if required by region
