# API Spec (App Routes)
**Doc Date:** 2026-02-27

## Public endpoints (server actions or API routes)
- POST /api/leads
  - body: {name,email,company,bottleneck,tools,urgency,utm_*}
  - returns: {lead_id}

- POST /api/events (optional if not using PostHog client)
  - body: {event_name,payload,lead_id?}

## Admin endpoints
- GET/POST/PUT/DELETE /api/admin/case-studies
- GET/POST/PUT/DELETE /api/admin/testimonials
- GET/POST/PUT/DELETE /api/admin/offers
- GET/POST/PUT/DELETE /api/admin/faqs
- GET/PUT /api/admin/site-settings
- GET/PUT /api/admin/agent-templates (Phase 2)
