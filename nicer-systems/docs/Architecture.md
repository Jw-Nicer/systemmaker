# Architecture
**Doc Date:** 2026-02-27 | **Updated:** 2026-03-01

## Overview
Two surfaces:
1) **Public Marketing** (SEO-first)
2) **Admin Web App** (authenticated CMS + settings + leads)

## High-level data flow
Visitor → Marketing site → (events + UTMs) → Lead capture → Email/CRM
Admin → CMS updates → Publish → Public pages render

## Modules
### Public
- Landing sections (7 components, SSR + client hybrid)
- Brush Reveal canvas module (client only, lazy-loaded)
- Proof-of-work components (case studies from Firestore)
- Agent demo (interactive intake → Gemini API → Preview Plan)

### Admin
- Auth + session (Firebase Auth + HTTP-only session cookies)
- Content CRUD (case studies, testimonials, FAQs, offers via server actions)
- Theme editor (color picker + intensity sliders → site_settings)
- Leads dashboard (status filtering + CSV export)
- Agent template editor (markdown editor + test runner)

### Shared
- Theme tokens (CSS variables)
- Analytics event library (PostHog)
- Validation schemas (Zod)
- Firebase Admin SDK (server-only singletons)

## Deployment
- **Hosting**: Firebase Hosting (static assets + CDN)
- **SSR**: Cloud Functions for Firebase (2nd gen, us-central1)
- **Database**: Cloud Firestore (nam5 region)
- **Auth**: Firebase Authentication (Email/Password)
- **Storage**: Firebase Storage
- **Analytics**: PostHog (client-side)
- **AI**: Google Gemini API (@google/generative-ai)
- **Email**: Resend

## Performance strategy
- SSR marketing pages
- Canvas is lazy-loaded on interaction or after first paint
- Images set to unoptimized mode (Firebase Hosting, no Vercel image optimizer)
- Reduced-motion mode: disable continuous animation

## Error handling
- Client: safe fallbacks for canvas
- Server: structured logs for lead submissions and email delivery
- Firestore queries: try/catch with empty array fallbacks (indexes may not exist yet)
