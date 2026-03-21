# CLAUDE.md — Shared Context for Nicer Systems

You are working on **Nicer Systems**, an automation + lightweight internal apps agency for admin-heavy American businesses.

## Tech Stack
- **Framework**: Next.js 16.1.6 (App Router, Turbopack)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 + CSS variables for theming
- **Animation**: framer-motion ^12.34.3
- **Backend**: Firebase (Firestore, Auth, Storage)
- **Analytics**: PostHog (via `lib/analytics.ts`)
- **AI**: Google Gemini (@google/generative-ai ^0.24.1)
- **Email**: Resend ^6.9.3 (lead delivery + nurture sequences)
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
    case-studies/CaseStudiesListClient.tsx # Client-side case studies filter/grid
    [industry]/page.tsx  # Industry variant landing pages (dynamic, SSR)
    audit/page.tsx       # Guided audit wizard (structured intake → preview plan)
    plan/[id]/page.tsx   # Shareable preview plan (public link)
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
      leads/[id]/page.tsx      # Lead detail (timeline, notes, follow-up management)
      variants/page.tsx        # Landing variant CRUD (industry pages)
      experiments/page.tsx     # A/B testing management
      agent-templates/page.tsx # Agent template editor + test runner
      settings/page.tsx        # Theme customizer
  api/
    auth/session/route.ts      # POST: create session cookie from Firebase ID token
    auth/signout/route.ts      # POST: clear session cookie, redirect to login
    events/route.ts            # POST: log analytics events
    leads/route.ts             # POST: create lead in Firestore
    leads/unsubscribe/route.ts # GET: unsubscribe from nurture emails
    booking/route.ts           # POST: book scoping call (Google Calendar integration)
    agent/run/route.ts         # POST: run agent chain via Gemini
    agent/chat/route.ts        # POST: SSE streaming agent chat (multi-phase conversation)
    agent/refine/route.ts      # POST: refine a specific plan section with feedback
    agent/send-email/route.ts  # POST: send email via Resend
    agent/audit/route.ts       # POST: run guided audit agent chain
    plans/route.ts             # GET: fetch stored plan by ID
    plans/export/route.ts      # GET: export plan as PDF

components/
  marketing/             # Landing page sections (see below)
  ui/                    # Shared UI primitives (Button, Input, Badge, GlassCard, GlitchText, GlowLine, SectionHeading, PostHogProvider)

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
  firestore/plans.ts         # storePlan(), getPlanById() — agent preview plans
  actions/lead-activity.ts   # Server actions: activity timeline (notes, status changes, emails)
  agents/runner.ts       # Agent chain runner (Gemini API)
  agents/conversation.ts # Multi-phase SSE chat (gathering → confirming → building → complete → follow_up)
  agents/prompts.ts      # Prompt builder from templates + context
  agents/refinement.ts   # Section-level plan refinement via Gemini
  agents/email-template.ts # Email template for agent outputs
  email/nurture-sequence.ts  # 5-email automated nurture via Resend scheduledAt
  email/nurture-templates.ts # Nurture email content templates
  email/admin-notification.ts # Admin email alerts on new leads
  email/confirmation-email.ts # Immediate lead confirmation email
  marketing/variant-content.ts # Variant section defaults + normalizeVariantSections()
  marketing/reserved-slugs.ts  # Reserved URL slugs for marketing routes
  leads/scoring.ts       # Lead scoring algorithm (0-75 points)
  security/request-guards.ts # Rate limiting + request validation
  analytics.ts           # EVENTS constants + track() + initAnalytics()
  theme.ts               # themeToCSSVariables()
  validation.ts          # Zod schemas (leadSchema, caseStudySchema, etc.)

hooks/
  useReducedMotion.ts    # prefers-reduced-motion hook
  useExperiment.ts       # A/B experiment variant bucketing + tracking
  useSSEChat.ts          # SSE streaming chat hook (manages connection, messages, phases)
  useRefineSection.ts    # Plan section refinement hook

types/
  case-study.ts          # CaseStudy interface
  faq.ts                 # FAQ interface
  offer.ts               # Offer interface
  testimonial.ts         # Testimonial interface
  agent-template.ts      # AgentTemplate interface
  preview-plan.ts        # PreviewPlan interface (agent output structures)
  variant.ts             # LandingVariant interface
  experiment.ts          # Experiment + ExperimentVariant interfaces
  chat.ts                # ChatMessage, ChatPhase, SSE event types

agents/                  # Agent markdown specs (intake, workflow mapper, etc.)
docs/                    # PRD, Architecture, Data Model, API Spec, etc.
  ADR/                   # Architecture Decision Records — see ADR/README.md for index
  CI_CD.md               # Deployment checklist, rollback procedure, future CI/CD plan
  Scaling_Playbook.md    # Roadmap: solo founder → VA/contractor → client portal → SaaS
  SOP_Founder_Operations.md  # Daily/weekly/monthly ops checklist, automation vs manual matrix
  Weekly_Review_Template.md  # Fillable Friday review template (pipeline, wins, stuck, priorities)
  Triage_Process.md          # Bug/feature/content triage with priority SLAs and GitHub Issue templates
scripts/
  fix-turbopack-externals.js # Patches Turbopack hashed module names (predeploy hook + postbuild)
  seed-firestore.ts          # Seeds site_settings/default
  seed-agent-templates.ts    # Seeds agent templates into Firestore
  seed-content.ts            # Seeds FAQs, testimonials, offers + fixes healthcare variant
  seed-variants.ts           # Seeds industry variant landing pages (6 variants)
  seed-case-studies.ts       # Seeds sample case studies
  seed-case-study-thumbnails.ts # Seeds case study thumbnail images

tests/
  firebase-admin-init.test.ts # Tests dual-mode Admin SDK init (service account + ADC fallback)
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
| `IsThisForYou.tsx` | client | Persona cards (Ops Owner, Founder/GM, Operator) with scenarios |
| `HowItWorks.tsx` | client | 3-step timeline with scroll animation |
| `WhyNotDIY.tsx` | client | Comparison grid: DIY vs Consultant vs Nicer Systems |
| `PricingSection.tsx` | server | Fetches offers from Firestore (3 tiers) |
| `FAQSection.tsx` | server | Fetches FAQs from Firestore |
| `FAQAccordion.tsx` | client | Accordion with AnimatePresence |
| `FinalCTA.tsx` | server | Bottom CTA block |
| `ScrollReveal.tsx` | client | Reusable framer-motion scroll wrapper |
| `AgentChat.tsx` | client | SSE streaming chat interface (multi-phase conversation) |
| `ChatMessages.tsx` | client | Chat message list with typing indicators |
| `ChatInput.tsx` | client | Chat text input with send button |
| `ChatPlanCard.tsx` | client | Inline plan preview card in chat |
| `PlanDisplay.tsx` | client | Full agent plan output display |
| `PlanVersionDiff.tsx` | client | Side-by-side plan version comparison |
| `SectionRefiner.tsx` | client | Section-level refinement UI with feedback input |
| `ShareButtons.tsx` | client | Social share buttons for plans |
| `TypingIndicator.tsx` | client | Animated typing dots for chat |
| `TrackedLink.tsx` | client | Link + analytics event on click |
| `LandingViewTracker.tsx` | client | Fires `landing_view` on mount |
| `BookingCTAButton.tsx` | client | Opens BookingModal on click (used in nav + hero) |
| `BookingModal.tsx` | client | Modal with date/time picker for scoping calls |
| `BookingForm.tsx` | client | Booking form fields (name, email, date, time, message) |
| `MobileNav.tsx` | client | Hamburger menu for mobile navigation |
| `VariantLandingPage.tsx` | server | Assembles variant-specific landing page sections |
| `homepage-experiments.tsx` | mixed | A/B experiment wrappers for hero + final CTA |

## Known Issues & QA
**Read `docs/KNOWN_ISSUES.md` before making changes.** It contains:
- 9 documented patterns (P1–P9), with P8 (Turbopack hashing) and P9 (admin auth) now resolved
- 25 resolved bugs from QA with root causes
- Pre-deploy QA checklist
- Documentation sync checklist

## Conventions
- **Server/Client split**: Firestore reads in server components, interactivity in client components
- **Analytics**: Use `track(EVENTS.EVENT_NAME)` from `lib/analytics.ts` — logs to console in dev, PostHog in prod
- **Reduced motion**: All animations must respect `prefers-reduced-motion` via `useReducedMotion` hook
- **Firestore queries**: Always wrap in try/catch with empty array fallback (indexes may not exist yet)
- **Auth guard**: Admin pages go inside `app/admin/(authenticated)/` — the layout calls `getSessionUser()`
- **Theme**: CSS variables in `globals.css` (`--theme-primary`, `--theme-secondary`, `--theme-glow-intensity`, `--theme-motion-intensity`)
- **Fallback data**: ProofOfWork and FAQ sections render hardcoded fallbacks when Firestore is empty

## Firestore Collections
| Collection | Public Read | Public Write | Auth Write | Key Fields |
|------------|------------|-------------|------------|------------|
| `site_settings` | all | none | auth | theme_primary, theme_secondary, gradient_preset, glow_intensity, motion_intensity |
| `case_studies` | is_published=true | none | auth | title, slug, industry, tools[], challenge, solution, metrics[], thumbnail_url, sort_order |
| `testimonials` | is_published=true | none | auth | name, role, company, quote, avatar |
| `offers` | is_published=true | none | auth | (pricing tiers) |
| `faqs` | is_published=true | none | auth | question, answer, sort_order |
| `leads` | none | create only | auth | name, email, company, bottleneck, tools, urgency, utm_*, score, follow_up_at, nurture_enrolled |
| `leads/{id}/activity` | none | none | auth | type (status_change/note_added/email_sent), timestamp, admin_email, details |
| `events` | none | create only | auth | event tracking |
| `agent_templates` | none | none | auth | key, markdown (agent prompt specs) |
| `variants` | is_published=true | none | auth | slug, industry, headline, subheadline, cta_text, meta_title, meta_description, featured_industries[], sections (LandingVariantSections) |
| `experiments` | status=running | none | auth | name, target, variants[], status, winner |
| `plans` | is_public=true | none | auth | preview_plan, input_summary, lead_id, view_count, is_public, version, versions[] |

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
- **URLs**: https://nicersystems.com, https://nicer-systems.web.app
- **Plan**: Blaze (pay-as-you-go)
- **Predeploy hook**: `scripts/fix-turbopack-externals.js` patches Turbopack's hashed `firebase-admin` module names (see P8 in KNOWN_ISSUES.md)
- **Admin SDK**: Dual-mode init — service account creds locally, GCP application default credentials in production

## What's Built (Phase 3 — complete)
- [x] Case study related recommendations (on detail pages)
- [x] Multi-niche landing variants (admin CRUD + /[industry] dynamic routes)
- [x] A/B testing framework (experiments admin + useExperiment hook + bucketing)
- [x] Custom error pages (404, error boundary, admin error boundary)
- [x] Admin dashboard with real Firestore metrics + recent leads
- [x] Automated email sequences (5-email nurture via Resend scheduledAt)
- [x] Lead scoring (pure function, 0-75 points, stored on lead docs)
- [x] Admin email notifications on new leads (via Resend)
- [x] Activity timeline on leads (notes, status changes, email logs — subcollection)
- [x] Follow-up reminders (date + note per lead, dashboard widget with overdue/upcoming)
- [x] Lead detail page (/admin/leads/[id]) with timeline, notes, follow-up management
- [x] Admin dashboard fixes (security hardening, CRUD bug fixes, sidebar nav, login redirect, theme revalidation)
- [ ] CRM sync (ClickUp/HubSpot/Close) — deferred

## What's Built (Phase 4 — complete)
- [x] SSE streaming agent chat (multi-phase: gathering → confirming → building → complete → follow_up)
- [x] Shareable preview plans (public URLs at /plan/[id] with view tracking)
- [x] Plan section refinement (feedback-driven section updates via Gemini)
- [x] Plan version history (version tracking with diff comparison)
- [x] Chat UI components (AgentChat, ChatMessages, ChatInput, ChatPlanCard, TypingIndicator)
- [x] Comprehensive performance optimization pass (animations, CSS, lazy loading)
- [ ] Guided audit wizard — deferred
- [ ] Proposal generator — deferred

## What's Built (Phase 5 — QA Remediation, complete)
- [x] Seeded production Firestore data (7 FAQs, 4 testimonials, 3 pricing tiers)
- [x] Fixed agent chat regression (wider industry matching, safety valve at 8+ messages, expanded affirm patterns)
- [x] Wired BookingCTAButton into nav header + hero (opens BookingModal with date/time picker)
- [x] Wired visual effects (BrushRevealCanvas lazy-loaded, FlowText hero animation, WaveDividers between sections)
- [x] FAQSection always renders `id="faq"` with fallback card when empty
- [x] Fixed healthcare variant placeholder content (sections.hero + meta_description)
- [x] Seeded 5 industry variant landing pages (construction, property-management, staffing, legal, home-services)
- [x] Added SSE timeout (30s) with retry and "Start over" button in agent chat

## What's Built (Phase 6 — Auth & Deploy Fixes, complete)
- [x] Dual-mode Firebase Admin SDK init (service account creds locally, GCP ADC in production)
- [x] Login resilience (await stale auth cleanup, retry with force-refreshed token)
- [x] Session endpoint specific error codes (TOKEN_EXPIRED, INVALID_CREDENTIALS)
- [x] Turbopack predeploy fix (patches hashed firebase-admin module names before upload)
- [x] CSP security headers + Permissions-Policy on all routes
- [x] Admin dashboard Suspense loading with skeleton UI
- [x] Firebase Admin SDK init unit tests

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
npx tsx scripts/seed-content.ts    # Seed FAQs, testimonials, offers
npx tsx scripts/seed-variants.ts   # Seed industry variant pages
```

## Published Industry Variants
| Slug | Industry | URL |
|------|----------|-----|
| `healthcare` | Healthcare | /healthcare |
| `construction` | Construction | /construction |
| `property-management` | Property Management | /property-management |
| `staffing` | Staffing | /staffing |
| `legal` | Legal | /legal |
| `home-services` | Home Services | /home-services |
