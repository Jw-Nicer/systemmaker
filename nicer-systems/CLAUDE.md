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
    faq/page.tsx         # Dedicated FAQ page with Firestore fallback content
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
      industry-probing/page.tsx # Per-industry chat-agent context CRUD (Phase 7)
      homepage-layout/page.tsx # Drag-to-reorder homepage sections + visibility toggles (Phase 8 — D1)
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
    agent/refine/route.ts      # POST: stream refined section preview (no persistence)
    agent/refine/apply/route.ts # POST: persist accepted refinement to Firestore
    agent/send-email/route.ts  # POST: send email via Resend
    agent/audit/route.ts       # POST: run guided audit agent chain
    admin/analytics/route.ts   # GET: dashboard metrics (auth required)
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
  firestore/industry-probing.ts  # getIndustryProbingsFromFirestore() with TTL cache + alias map (Phase 7)
  firestore/homepage-layout.ts   # getHomepageLayout() with TTL cache, stored at site_settings/homepage_layout (Phase 8 — D1)
  actions/case-studies.ts    # Server actions: CRUD for case studies
  actions/testimonials.ts    # Server actions: CRUD for testimonials
  actions/faqs.ts            # Server actions: CRUD for FAQs
  actions/offers.ts          # Server actions: CRUD for offers
  actions/leads.ts           # Server actions: read, status update, CSV export
  actions/agent-templates.ts # Server actions: CRUD + test run
  actions/variants.ts        # Server actions: CRUD for landing variants
  actions/experiments.ts     # Server actions: A/B experiment management
  actions/industry-probing.ts # Server actions: CRUD for chat-agent industry probing context (Phase 7)
  actions/homepage-layout.ts  # Server actions: update + reset homepage section order/visibility (Phase 8 — D1)
  firestore/variants.ts      # getPublishedVariants(), getVariantBySlug()
  firestore/experiments.ts   # getRunningExperiments(), getExperimentByTarget()
  firestore/plans.ts         # storePlan(), getPlanById() — agent preview plans
  actions/lead-activity.ts   # Server actions: activity timeline (notes, status changes, emails)
  agents/runner.ts           # DAG-driven pipeline orchestrator (walks PIPELINE_DAG, parallel tiers)
  agents/registry.ts         # Pipeline DAG config (stage keys, dependencies, routing signals, criticality)
  agents/context.ts          # Typed context protocol (data flow between stages, fallback outputs)
  agents/llm-client.ts       # Shared LLM client (singleton Gemini, retry, model fallback, token budget, invokeLLMChatStreaming via model.startChat)
  agents/self-correction.ts  # ReAct self-correction loop (schema validation → error feedback → retry)
  agents/tracing.ts          # Observability (traces, spans, structured logging per pipeline run)
  agents/tools.ts            # Tool use / RAG (searchCaseStudies, getIndustryBenchmarks, searchExistingPlans)
  agents/evals.ts            # LLM-as-judge evaluation for plan stages (quality scoring, golden test suite)
  agents/chat-evals.ts       # LLM-as-judge eval suite for chat responses (Phase 7) — runChatEvalSuite, judge prompt, aggregation
  agents/chat-eval-cases.ts  # 22 curated chat eval cases across gathering/confirming/follow_up (Phase 7)
  agents/conversation-rules.ts # Cross-phase rule registry — first-class rule data with stable ids (Phase 7)
  agents/memory.ts           # Episodic memory (Firestore-backed visitor recall across sessions)
  agents/conversation.ts     # Multi-phase SSE chat (gathering → confirming → building → complete → follow_up)
  agents/prompts.ts          # Context assembly (template + context + input sanitization + versioning)
  agents/schemas.ts          # Stage output guardrails (Zod schemas per pipeline stage)
  agents/safety.ts           # Output safety guardrails (prompt injection, secret leak, impersonation detection)
  agents/validation.ts       # Cross-section coherence guardrails (automation↔workflow, KPIs↔fields)
  agents/refinement.ts       # Refinement agent (section-level plan updates via streaming LLM)
  agents/email-template.ts   # Email HTML rendering for preview plan delivery
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
  chat.ts                # ChatMessage, ChatPhase, SSE event types (incl. share_link field for post-plan messages)
  industry-probing.ts    # IndustryProbing interface (Phase 7)
  homepage-layout.ts     # HomepageLayout + HomepageSectionKey union + SECTION_REGISTRY (Phase 8 — D1)
  lead.ts                # Lead, LeadStatus, LEAD_STATUSES, LEAD_STATUS_LABELS, LEAD_STATUS_COLORS

agents/                  # Agent markdown specs (intake, workflow mapper, etc.)
docs/                    # PRD, Architecture, Data Model, API Spec, etc.
  ADR/                   # Architecture Decision Records — see ADR/README.md for index
  CI_CD.md               # Deployment checklist, rollback procedure, future CI/CD plan
  Chat_Agent_Architecture.md # Chat agent design, weaknesses log, prioritized roadmap, Phase 7 changelog
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
  seed-industry-probing.ts   # Seeds the 8 default industry-probing entries with aliases (Phase 7)
  seed-e2e-plan.ts           # Seeds a deterministic plan doc for computer-use runbooks 3/4/5
  run-chat-evals.ts          # CLI runner for the chat-agent LLM eval suite (Phase 7)

tests/
  firebase-admin-init.test.ts # Tests dual-mode Admin SDK init (service account + ADC fallback)
  computer-use-harness.test.ts # Scoring math for computer-use eval harness (9 tests)
  pipeline-metrics-aggregation.test.ts # Stage-level aggregation logic (7 tests)

e2e/
  computer-use/              # Release-gating computer-use runbook suite
    harness.ts               # TrackedSession wrapper + scoring + JSON scorecard emitter
    types.ts                 # RunMetrics, ScoringDimensions, Scorecard, RunbookDef
    runbook-{1..7}-*.spec.ts # 7 runbook specs (see README.md in that dir)
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
- **Canonical marketing routes**: `/privacy` is canonical and `/privacy-policy` is handled via redirect in `next.config.ts`
- **Playwright isolation**: browser tests run their own dev server on port `3217` by default; override with `PLAYWRIGHT_PORT` when needed

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
| `agent_memory` | none | none | auth | visitorId (email hash), industry, lastBottleneck, planIds[], interactions[], preferences, sessionCount |
| `industry_probing` | none | none | auth | slug, display_name, common_bottlenecks[], common_tools[], probing_angles[], aliases[], is_published, sort_order — chat agent context (Phase 7) |
| `site_settings/homepage_layout` | none | none | auth | sections[] (key, enabled, sort_order), updated_at — marketing landing page layout config (Phase 8 — D1, sub-doc of site_settings) |
| `pipeline_traces` | none | none | auto (fire-and-forget from runner) | traceId, pipelineType, status, totalLatencyMs, spanCount, degradedStages[], spans[], started_at — agent pipeline observability |

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
- [x] Guided audit wizard (4-step intake → full 6-stage agent chain → shareable plan)
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

## What's Built (Phase 7 — Agentic Workflow Architecture, complete)
- [x] DAG-driven pipeline orchestrator (runner.ts walks PIPELINE_DAG, adding stages = config + template only)
- [x] Shared LLM client (singleton, retry with exponential backoff, multi-model fallback cascade)
- [x] Self-correction / ReAct loops (schema validation failure → error fed back to LLM → retry, max 2 corrections)
- [x] Tool use / RAG (agents query case studies, industry benchmarks, existing plans for grounded output)
- [x] Observability / tracing (trace IDs, spans per stage, structured logging, trace buffer)
- [x] Agent episodic memory (Firestore-backed visitor recall across sessions, interaction history)
- [x] Typed context protocol (each stage declares data dependencies, fallback outputs for graceful degradation)
- [x] Routing signals (complex_workflow, high_failure_risk signals modify downstream behavior)
- [x] LLM-as-judge evaluation framework (quality scoring, 5 golden test cases for regression detection)
- [x] Prompt versioning (template hash tracking, version metadata)
- [x] Conversation context improvements (detailed plan context for follow-up, contradiction detection, conversation summary)
- [x] Production hardening (gemini-2.5-flash-lite fallback, undefined-safe Firestore writes, template seeding)
- [x] Comprehensive test coverage (549 tests across 63 files)

## What's Built (Chat Agent Quality Pass — 2026-04-10/11, complete)
**Tracked as Phase 7 in `docs/Phased_Implementation_Plan.md` and P6 in `docs/Backlog.md`. Full architectural detail in `docs/Chat_Agent_Architecture.md`.**

Tier 1 — stability + UX recovery:
- [x] Single-retry on streaming failure with contextual fallback (`buildContextualConversationFallback` re-asks the missing field instead of starting over)
- [x] Split SSE stall timeout into first-chunk (60s) vs inter-chunk (15s) — eliminates false-positive cold-start "Try again" errors
- [x] Skip `is_extraction_update` SSE echo when nothing changed (`extractedHasChanges` helper)
- [x] Tightened `inferBottleneck` heuristic — requires both pattern AND keyword (was: pattern OR length+keyword)
- [x] Tightened `inferIndustry` heuristic — Branch 2 catches "we're a 30-person property management shop"
- [x] "View full plan" link inside the post-plan chat bubble via per-message `share_link` field
- [x] Plan section cards parse JSON and render formatted summaries (was: raw JSON dump)
- [x] Email-capture form no longer re-asks after submission (success state stays mounted; captured contact info syncs into `extracted` for follow-ups)
- [x] Per-phase `generationConfig` (temperature 0.55, maxOutputTokens 220-480, stopSequences) + `systemInstruction` + structured `Content[]` history
- [x] `chatSession` API refactor — `model.startChat({ history }) + chat.sendMessageStream()` with SDK-level history validation

Tier 2 — admin-driven configuration:
- [x] `industry_probing` Firestore collection with admin CRUD page at `/admin/industry-probing`, server-side reader with TTL cache, hardcoded fallback safety net, idempotent seed script
- [x] Cross-phase rules registry (`lib/agents/conversation-rules.ts`) — first-class rule data with stable ids the eval suite can correlate failures against

Tier 3 — observability:
- [x] LLM-as-judge eval suite for chat answers — 22 curated cases, 19 reusable criteria, CLI runner (`npm run eval:chat`), opt-in vitest harness (`RUN_LLM_EVALS=1`)
- [x] Lead-scoring dead-code cleanup — removed `case "critical"` branch, added regression-net test pinning canonical urgency values
- [x] New analytics event: `AGENT_CHAT_VIEW_FULL_PLAN`
- [x] **659 tests across 68 files** (up from 549/63 at start of pass)

## What's Built (Phase 8 — Admin UX + Draft Review, complete)
**Tracked as Phase 8 in `docs/Phased_Implementation_Plan.md`. Two independent slices delivered.**

D1 — Homepage Layout Admin (shipped 2026-04-11):
- [x] `types/homepage-layout.ts` — 11-section union + `SECTION_REGISTRY` with labels/descriptions/recommended flags
- [x] `lib/marketing/homepage-layout-resolver.ts` — pure merge function (backfill missing, drop unknown, dedupe, normalize `sort_order`)
- [x] `lib/firestore/homepage-layout.ts` — TTL-cached reader via `unstable_cache`, stored at `site_settings/homepage_layout`
- [x] `lib/actions/homepage-layout.ts` — server actions (update + reset-to-defaults)
- [x] `app/admin/(authenticated)/homepage-layout/` — drag-to-reorder admin page with visibility toggles, unsaved-changes indicator, reset confirmation
- [x] `app/(marketing)/page.tsx` refactored to `renderSection(key, experiments)` dispatch
- [x] 27 regression tests in `tests/homepage-layout.test.ts`

D2 — Admin Preview Mode (shipped pre-2026-04-11):
- [x] `/preview/site` and `/preview/variant/[id]` routes gated on `getSessionUser()`
- [x] Dedicated `getAllXForPreview` readers that bypass the publish filter
- [x] "Preview site" link in admin layout chrome + `PreviewBanner` draft counts
- [x] 5 regression tests in `tests/preview-readers.test.ts`

**Current test suite: 736 passed / 1 skipped across 73 files** (up from 659/68 at end of Phase 7).

## What's Built (Computer-Use Eval Harness + Pipeline Dashboard, 2026-04-15)
- [x] `e2e/computer-use/harness.ts` — `TrackedSession` wraps Playwright Page; counts actions, scores against runbook dimensions, writes JSON scorecards
- [x] 7 runbook specs covering all 6 release-gating scenarios + mobile viewport (runbooks 1–7)
- [x] Runbooks 3/4/5 gated on `E2E_PLAN_ID` with idempotent seeder (`scripts/seed-e2e-plan.ts`)
- [x] Goal-failure veto in scoring (goal_completion === 0 floors readiness to `not_reliable`)
- [x] Stage failure rates in admin dashboard — pure `aggregateTraceDocs()` with per-stage runs/failures/degradations/latency, surfaced in `PipelineMetrics` table
- [x] `pipeline_traces` Firestore collection persisted fire-and-forget from the runner
- [x] `npm run test:computer-use` script + `npm run seed:e2e-plan`

**Current test suite: 806 passed / 1 skipped across 81 files + 7 computer-use e2e specs.**

## Brand Voice
Clear, confident, practical, business-friendly. No hype. Minimal jargon. Translate features into outcomes.

**Tagline**: Tell us the problem. We'll build the system.
**Primary CTA**: Book a scoping call
**Secondary CTA**: Get a Preview Plan (email capture)

## Dev Commands
```bash
npm run dev              # Start Next.js dev server (port 3000)
npx tsc --watch --noEmit # TypeScript watch mode
npm run typecheck        # Route typegen + tsc (includes one retry for the .next/types cache-life race)
npm run test             # Vitest suite
npm run test:e2e         # Playwright suite on isolated local port
npm run test:computer-use        # Computer-use release-gating runbook suite (7 scenarios)
npm run deploy           # Full Firebase deploy (hosting + functions)
npm run deploy:hosting   # Deploy hosting + SSR Cloud Function only
npm run deploy:rules     # Deploy Firestore security rules
npm run deploy:indexes   # Deploy Firestore indexes
npm run seed:templates           # Seed agent templates into Firestore
npm run seed:industry-probing    # Seed the 8 default industry-probing entries with aliases (Phase 7)
npm run seed:e2e-plan            # Seed a deterministic plan doc for computer-use runbooks 3/4/5
npm run eval:chat                # Run the chat-agent LLM eval suite (Phase 7) — uses real Gemini, costs API credits
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
