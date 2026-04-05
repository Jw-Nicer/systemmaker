# Sitemap & Routes
**Doc Date:** 2026-02-27 | **Updated:** 2026-04-04

## Public (Marketing)
- `/` — Landing page (hero, demo, proof, personas, testimonials, how it works, why not DIY, features, pricing, FAQ, final CTA)
- `/faq` — Dedicated FAQ page with Firestore-backed entries and placeholder fallbacks
- `/case-studies` — Case study listing with filter
- `/case-studies/[slug]` — Case study detail + related recommendations
- `/contact` — Lead capture form
- `/audit` — Guided audit wizard (structured 4-step intake → preview plan)
- `/[industry]` — Industry variant landing pages (healthcare, construction, property-management, staffing, legal, home-services)
- `/plan/[id]` — Shareable preview plan (public link with view tracking)
- `/privacy` — Privacy policy
- `/privacy-policy` — Permanent redirect to `/privacy`
- `/terms` — Terms of service

## Admin (Auth-Protected)
- `/admin/login` — Login page (outside auth guard)
- `/admin` — Dashboard (real Firestore metrics + recent leads + follow-up reminders)
- `/admin/case-studies` — Case studies CRUD
- `/admin/testimonials` — Testimonials CRUD
- `/admin/faqs` — FAQs CRUD
- `/admin/offers` — Offers/pricing CRUD
- `/admin/leads` — Leads dashboard (status filter + CSV export)
- `/admin/leads/[id]` — Lead detail (activity timeline + notes + follow-up management)
- `/admin/variants` — Landing variant CRUD (industry pages)
- `/admin/experiments` — A/B testing management
- `/admin/agent-templates` — Agent template editor + test runner
- `/admin/settings` — Theme customizer

## API Routes
- `POST /api/auth/session` — Create session cookie from Firebase ID token
- `POST /api/auth/signout` — Clear session cookie, redirect to login
- `POST /api/leads` — Create lead in Firestore
- `GET  /api/leads/unsubscribe` — Unsubscribe from nurture emails
- `POST /api/events` — Log analytics events
- `POST /api/booking` — Book scoping call (Google Calendar integration)
- `GET  /api/plans?id={planId}` — Fetch stored plan by ID
- `GET  /api/plans/export?id={planId}` — Export plan as PDF
- `POST /api/agent/run` — Run agent chain via Gemini
- `POST /api/agent/chat` — SSE streaming agent chat (multi-phase conversation)
- `POST /api/agent/refine` — Refine a specific plan section with feedback
- `POST /api/agent/send-email` — Send email via Resend
- `POST /api/agent/audit` — Run guided audit agent chain
