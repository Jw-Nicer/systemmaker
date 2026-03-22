# Architecture
**Doc Date:** 2026-02-27 | **Updated:** 2026-03-21

## Overview
Two surfaces:
1) **Public Marketing** (SEO-first)
2) **Admin Web App** (authenticated CMS + settings + leads + experiments)

## High-level data flow
Visitor → Marketing site → (events + UTMs) → Lead capture → Email nurture + Admin notification
Admin → CMS updates → Publish → Public pages render
Visitor → Agent chat → Preview Plan → Shareable URL + Email delivery

## Modules
### Public
- Landing sections (7 components, SSR + client hybrid)
- Brush Reveal canvas module (HTML5 Canvas, client only, lazy-loaded)
- Proof-of-work components (case studies from Firestore)
- Agent demo (interactive intake → Gemini API → Preview Plan)
- Agent chat (SSE streaming, multi-phase conversation → plan generation)
- Industry variant landing pages (dynamic routes from admin-managed variants)
- Shareable preview plans (public URLs with view tracking)

### Admin
- Auth + session (Firebase Auth + HTTP-only session cookies)
- Content CRUD (case studies, testimonials, FAQs, offers via server actions)
- Theme editor (color picker + intensity sliders → site_settings)
- Leads CRM (status filtering, CSV export, scoring, activity timeline, follow-up reminders)
- Lead detail view (timeline, notes, follow-up management)
- Agent template editor (markdown editor + test runner)
- Landing variant management (industry-specific pages)
- A/B experiment management (create, run, declare winner)
- Dashboard with real Firestore metrics + recent leads + overdue follow-ups

### Shared
- Theme tokens (CSS variables in globals.css)
- Analytics event library (PostHog via lib/analytics.ts)
- Validation schemas (Zod via lib/validation.ts)
- Firebase Admin SDK (server-only singletons via lib/firebase/admin.ts — dual-mode init with key format normalization)
- UI primitives (Button, Input, Badge, GlassCard, GlitchText, GlowLine, SectionHeading)

## Deployment
- **Hosting**: Firebase Hosting (static assets + CDN)
- **SSR**: Cloud Functions for Firebase (2nd gen, us-central1, 512MiB memory)
- **Database**: Cloud Firestore (nam5 region)
- **Auth**: Firebase Authentication (Email/Password)
- **Storage**: Firebase Storage
- **Analytics**: PostHog (client-side)
- **AI**: Google Gemini API (@google/generative-ai ^0.24.1)
- **Email**: Resend ^6.9.3 (lead delivery + nurture sequences + admin notifications)
- **URL**: https://nicer-systems.web.app
- **Plan**: Firebase Blaze (pay-as-you-go)

## Performance strategy
- SSR marketing pages (server components for Firestore reads)
- Canvas is lazy-loaded on interaction or after first paint
- Images set to unoptimized mode (Firebase Hosting, no Vercel image optimizer)
- Reduced-motion mode: disable continuous animation via `useReducedMotion` hook
- Animation throttling and CSS variable-driven motion intensity
- Lazy-loaded client components for interactivity

## Error handling
- Custom 404 page (`app/not-found.tsx`)
- Global error boundary (`app/error.tsx`) with retry
- Admin error boundary (`app/admin/(authenticated)/error.tsx`)
- Client: safe fallbacks for canvas
- Server: structured logs for lead submissions and email delivery
- Firestore queries: try/catch with empty array fallbacks (indexes may not exist yet)

## Agent Architecture
- **Agent chain** (via `/api/agent/run`): intake → workflow_mapper → automation_designer → dashboard_designer → ops_pulse_writer
- **Agent chat** (via `/api/agent/chat`): SSE streaming with 5-phase conversation (gathering → confirming → building → complete → follow_up)
- **Plan refinement** (via `/api/agent/refine`): Section-level updates with version tracking
- **LLM**: Google Gemini API
- **Prompt management**: Markdown templates stored in Firestore (`agent_templates` collection), editable via admin
- **Rate limiting**: 20 messages/10min (chat), 10 refines/10min (refinement)
