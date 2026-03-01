# CLAUDE.md — Shared Context for Nicer Systems

You are working on **Nicer Systems**, an automation + lightweight internal apps agency for admin-heavy American businesses.

## Tech Stack
- **Framework**: Next.js 16.1.6 (App Router, Turbopack)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 + CSS variables for theming
- **Animation**: framer-motion ^12.34.3
- **Backend**: Firebase (Firestore, Auth, Storage)
- **Analytics**: PostHog (via `lib/analytics.ts`)
- **Validation**: Zod ^4.3.6
- **Package manager**: npm

## Firebase Project
- **Project ID**: `nicer-systems`
- **Auth**: Email/Password enabled
- **Admin user**: `johnwilnicer@gmail.com`
- **Firestore**: Default database, `nam5` region
- **Admin SDK**: Service account in `.env.local` (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`)
- **Client SDK**: Public keys in `.env.local` (`NEXT_PUBLIC_FIREBASE_*`)

## Project Structure
```
app/
  (marketing)/           # Public marketing pages (SSR)
    page.tsx             # Landing page — assembles all section components
    layout.tsx           # Header + footer + nav
    contact/page.tsx     # Contact form
    case-studies/page.tsx
    privacy/page.tsx
    terms/page.tsx
  admin/
    login/page.tsx       # Login page (outside auth guard)
    (authenticated)/     # Route group — all pages here require auth
      layout.tsx         # Sidebar + auth check via getSessionUser()
      page.tsx           # Dashboard
      case-studies/page.tsx
      settings/page.tsx
  api/
    auth/session/route.ts   # POST: create session cookie from Firebase ID token
    auth/signout/route.ts   # POST: clear session cookie, redirect to login
    events/route.ts         # POST: log analytics events
    leads/route.ts          # POST: create lead in Firestore

components/
  marketing/             # Landing page sections (see below)
  ui/                    # Shared UI (PostHogProvider)

lib/
  firebase/admin.ts      # getAdminAuth(), getAdminDb() — server-only singletons
  firebase/auth.ts       # getSessionUser(), setSessionCookie(), clearSessionCookie()
  firebase/client.ts     # Client-side Firebase app init
  firestore/case-studies.ts  # getPublishedCaseStudies() — server-side
  firestore/faqs.ts      # getPublishedFAQs() — server-side
  analytics.ts           # EVENTS constants + track() + initAnalytics()
  theme.ts               # themeToCSSVariables()
  validation.ts          # Zod schemas (leadSchema, etc.)

hooks/
  useReducedMotion.ts    # prefers-reduced-motion hook

types/
  case-study.ts          # CaseStudy interface
  faq.ts                 # FAQ interface

agents/                  # Agent markdown specs (intake, workflow mapper, etc.)
docs/                    # PRD, Architecture, Data Model, API Spec, etc.
scripts/
  seed-firestore.ts      # Seeds site_settings/default
```

## Landing Page Components (`components/marketing/`)
All sections are separate components assembled in `app/(marketing)/page.tsx`:

| Component | Type | Purpose |
|-----------|------|---------|
| `BrushRevealHero.tsx` | client | Hero with canvas interaction + CTAs |
| `BrushRevealCanvas.tsx` | client | HTML5 Canvas brush masking (lazy-loaded) |
| `WorkflowGraph.tsx` | client | SVG ambient node/edge background |
| `SeeItWork.tsx` | client | Mini Agent teaser (Phase 2 placeholder) |
| `ProofOfWork.tsx` | server | Fetches case studies from Firestore |
| `ProofOfWorkClient.tsx` | client | Filter chips + card grid |
| `HowItWorks.tsx` | client | 4-step timeline with scroll animation |
| `PricingSection.tsx` | server | 3 hardcoded pricing tiers |
| `FAQSection.tsx` | server | Fetches FAQs from Firestore |
| `FAQAccordion.tsx` | client | Accordion with AnimatePresence |
| `FinalCTA.tsx` | server | Bottom CTA block |
| `ScrollReveal.tsx` | client | Reusable framer-motion scroll wrapper |
| `TrackedLink.tsx` | client | Link + analytics event on click |
| `LandingViewTracker.tsx` | client | Fires `landing_view` on mount |

## Conventions
- **Server/Client split**: Firestore reads in server components, interactivity in client components
- **Analytics**: Use `track(EVENTS.EVENT_NAME)` from `lib/analytics.ts` — logs to console in dev, PostHog in prod
- **Reduced motion**: All animations must respect `prefers-reduced-motion` via `useReducedMotion` hook
- **Firestore queries**: Always wrap in try/catch with empty array fallback (indexes may not exist yet)
- **Auth guard**: Admin pages go inside `app/admin/(authenticated)/` — the layout calls `getSessionUser()`
- **Theme**: CSS variables in `globals.css` (`--theme-primary`, `--theme-secondary`, `--theme-glow-intensity`, `--theme-motion-intensity`)
- **Fallback data**: ProofOfWork and FAQ sections render hardcoded fallbacks when Firestore is empty

## Firestore Collections
| Collection | Public Read | Auth Write | Key Fields |
|------------|------------|------------|------------|
| `site_settings` | all | auth | theme_primary, theme_secondary, gradient_preset, glow_intensity, motion_intensity |
| `case_studies` | is_published=true | auth | title, slug, industry, tools[], challenge, solution, metrics[], thumbnail_url, sort_order |
| `testimonials` | is_published=true | auth | name, role, company, quote, avatar |
| `offers` | is_published=true | auth | (pricing tiers) |
| `faqs` | is_published=true | auth | question, answer, sort_order |
| `leads` | create only | auth | name, email, company, bottleneck, tools, urgency, utm_* |
| `events` | create only | auth | event tracking |

## What's Built (Phase 1 — in progress)
- [x] Firebase setup (Auth, Firestore, rules, indexes, seed data)
- [x] Admin CMS scaffold (login, dashboard, case studies, settings pages)
- [x] Full auth flow (login, session cookies, signout, middleware guard)
- [x] Marketing landing page (all 7 sections with animations)
- [x] Analytics event wiring
- [ ] Admin CRUD for case studies, testimonials, FAQs, offers
- [ ] Theme customizer UI in Admin settings
- [ ] Contact page form wiring (lead capture → Firestore)
- [ ] Case study detail pages

## What's Next (Phase 2)
- [ ] Mini Agent interactive demo (SeeItWork section)
- [ ] Preview Plan generator + email delivery
- [ ] Admin leads dashboard
- [ ] Admin template editor for agent prompts

## Brand Voice
Clear, confident, practical, business-friendly. No hype. Minimal jargon. Translate features into outcomes.

**Tagline**: Tell us the problem. We'll build the system.
**Primary CTA**: Book a scoping call
**Secondary CTA**: Get a Preview Plan (email capture)

## Dev Commands
```bash
npm run dev          # Start Next.js dev server (port 3000)
npx tsc --watch --noEmit  # TypeScript watch mode
npx tsx scripts/seed-firestore.ts  # Seed default site_settings
npx firebase-tools deploy --only firestore:rules  # Deploy security rules
npx firebase-tools deploy --only firestore:indexes  # Deploy indexes
```
