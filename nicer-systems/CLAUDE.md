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
    contact/page.tsx     # Contact form (lead capture → Firestore)
    case-studies/page.tsx            # Case study listing
    case-studies/[slug]/page.tsx     # Case study detail (dynamic) + related recommendations
    [industry]/page.tsx  # Industry variant landing pages (dynamic, SSG)
    privacy/page.tsx
    terms/page.tsx
  not-found.tsx          # Custom 404 page
  error.tsx              # Global error boundary with retry
  admin/
    login/page.tsx       # Login page (outside auth guard)
    (authenticated)/     # Route group — all pages here require auth
      layout.tsx         # Sidebar + auth check via getSessionUser()
      error.tsx          # Admin error boundary
      page.tsx           # Dashboard (real Firestore metrics + recent leads)
      case-studies/page.tsx    # Case studies CRUD
      testimonials/page.tsx    # Testimonials CRUD
      faqs/page.tsx            # FAQs CRUD
      offers/page.tsx          # Offers CRUD
      leads/page.tsx           # Leads dashboard (read + status filter + CSV export)
      variants/page.tsx        # Landing variant CRUD (industry pages)
      experiments/page.tsx     # A/B testing management
      agent-templates/page.tsx # Agent template editor + test runner
      settings/page.tsx        # Theme customizer
  api/
    auth/session/route.ts      # POST: create session cookie from Firebase ID token
    auth/signout/route.ts      # POST: clear session cookie, redirect to login
    events/route.ts            # POST: log analytics events
    leads/route.ts             # POST: create lead in Firestore
    agent/run/route.ts         # POST: run agent chain via Gemini
    agent/send-email/route.ts  # POST: send email via Resend

components/
  marketing/             # Landing page sections (see below)
  ui/                    # Shared UI (PostHogProvider)

lib/
  firebase/admin.ts      # getAdminAuth(), getAdminDb() — server-only singletons
  firebase/auth.ts       # getSessionUser(), setSessionCookie(), clearSessionCookie()
  firebase/client.ts     # Client-side Firebase app init
  firestore/case-studies.ts  # getPublishedCaseStudies() — server-side
  firestore/faqs.ts          # getPublishedFAQs() — server-side
  firestore/offers.ts        # getPublishedOffers() — server-side
  firestore/site-settings.ts # getSiteSettings() — server-side
  actions/case-studies.ts    # Server actions: CRUD for case studies
  actions/testimonials.ts    # Server actions: CRUD for testimonials
  actions/faqs.ts            # Server actions: CRUD for FAQs
  actions/offers.ts          # Server actions: CRUD for offers
  actions/leads.ts           # Server actions: read, status update, CSV export
  actions/agent-templates.ts # Server actions: CRUD + test run
  actions/variants.ts        # Server actions: CRUD for landing variants
  actions/experiments.ts     # Server actions: A/B experiment management
  firestore/variants.ts      # getPublishedVariants(), getVariantBySlug()
  firestore/experiments.ts   # getRunningExperiments(), getExperimentByTarget()
  agents/runner.ts       # Agent chain runner (Gemini API)
  agents/prompts.ts      # Prompt builder from templates + context
  agents/email-template.ts # Email template for agent outputs
  analytics.ts           # EVENTS constants + track() + initAnalytics()
  theme.ts               # themeToCSSVariables()
  validation.ts          # Zod schemas (leadSchema, caseStudySchema, etc.)

hooks/
  useReducedMotion.ts    # prefers-reduced-motion hook
  useExperiment.ts       # A/B experiment variant bucketing + tracking

types/
  case-study.ts          # CaseStudy interface
  faq.ts                 # FAQ interface
  offer.ts               # Offer interface
  testimonial.ts         # Testimonial interface
  agent-template.ts      # AgentTemplate interface
  preview-plan.ts        # PreviewPlan interface (agent output structures)
  variant.ts             # LandingVariant interface
  experiment.ts          # Experiment + ExperimentVariant interfaces

agents/                  # Agent markdown specs (intake, workflow mapper, etc.)
docs/                    # PRD, Architecture, Data Model, API Spec, etc.
scripts/
  seed-firestore.ts          # Seeds site_settings/default
  seed-agent-templates.ts    # Seeds agent templates into Firestore
```

## Landing Page Components (`components/marketing/`)
All sections are separate components assembled in `app/(marketing)/page.tsx`:

| Component | Type | Purpose |
|-----------|------|---------|
| `BrushRevealHero.tsx` | client | Hero with canvas interaction + CTAs |
| `BrushRevealCanvas.tsx` | client | HTML5 Canvas brush masking (lazy-loaded) |
| `WorkflowGraph.tsx` | client | SVG ambient node/edge background |
| `SeeItWork.tsx` | client | Mini Agent teaser section |
| `AgentDemoForm.tsx` | client | Interactive agent intake form |
| `AgentDemoResults.tsx` | client | Agent output results display |
| `ProofOfWork.tsx` | server | Fetches case studies from Firestore |
| `ProofOfWorkClient.tsx` | client | Filter chips + card grid |
| `HowItWorks.tsx` | client | 4-step timeline with scroll animation |
| `PricingSection.tsx` | server | Fetches offers from Firestore (3 tiers) |
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
| `agent_templates` | none | auth | key, markdown (agent prompt specs) |
| `variants` | is_published=true | auth | slug, industry, headline, subheadline, cta_text, featured_industries[] |
| `experiments` | status=running | auth | name, target, variants[], status, winner |

## What's Built (Phase 1 — complete)
- [x] Firebase setup (Auth, Firestore, rules, indexes, seed data)
- [x] Admin CMS scaffold (login, dashboard, case studies, settings pages)
- [x] Full auth flow (login, session cookies, signout, middleware guard)
- [x] Marketing landing page (all 7 sections with animations)
- [x] Analytics event wiring
- [x] Admin CRUD for case studies, testimonials, FAQs, offers
- [x] Theme customizer UI in Admin settings
- [x] Contact page form wiring (lead capture → Firestore)
- [x] Case study detail pages

## What's Built (Phase 2 — complete)
- [x] Mini Agent interactive demo (SeeItWork section + AgentDemoForm)
- [x] Agent chain runner (Gemini API integration)
- [x] Preview Plan generator + email delivery (Resend)
- [x] Admin leads dashboard (status filter + CSV export)
- [x] Admin template editor for agent prompts (markdown editor + test runner)

## Deployment
- **Hosting**: Firebase Hosting + Cloud Functions (SSR)
- **Region**: us-central1
- **URL**: https://nicer-systems.web.app
- **Plan**: Blaze (pay-as-you-go)

## What's Built (Phase 3 — in progress)
- [x] Case study related recommendations (on detail pages)
- [x] Multi-niche landing variants (admin CRUD + /[industry] dynamic routes)
- [x] A/B testing framework (experiments admin + useExperiment hook + bucketing)
- [x] Custom error pages (404, error boundary, admin error boundary)
- [x] Admin dashboard with real Firestore metrics + recent leads
- [ ] Automated email sequences (nurture)
- [ ] CRM sync (ClickUp/HubSpot/Close) + lead scoring

## Brand Voice
Clear, confident, practical, business-friendly. No hype. Minimal jargon. Translate features into outcomes.

**Tagline**: Tell us the problem. We'll build the system.
**Primary CTA**: Book a scoping call
**Secondary CTA**: Get a Preview Plan (email capture)

## Dev Commands
```bash
npm run dev              # Start Next.js dev server (port 3000)
npx tsc --watch --noEmit # TypeScript watch mode
npm run deploy           # Full Firebase deploy (hosting + functions)
npm run deploy:hosting   # Deploy hosting + SSR Cloud Function only
npm run deploy:rules     # Deploy Firestore security rules
npm run deploy:indexes   # Deploy Firestore indexes
npm run seed:templates   # Seed agent templates into Firestore
npx tsx scripts/seed-firestore.ts  # Seed default site_settings
```
