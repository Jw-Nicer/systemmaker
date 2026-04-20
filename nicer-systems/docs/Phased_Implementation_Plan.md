# Phased Implementation Plan
**Doc Date:** 2026-02-27 | **Updated:** 2026-04-12

## Phase 0 — Foundations ✅ COMPLETE
**Outcome:** Repo, stack, environments, design tokens, analytics scaffolding.

### Deliverables
- Next.js + TS + Tailwind setup
- Firebase project + Auth + Firestore + Storage
- Base theme system (CSS variables)
- Analytics event wrapper (PostHog)
- Skeleton pages (Landing, Case Studies, Contact, Admin)

### Exit criteria
- ✅ Deployed preview environment works
- ✅ Admin auth gate works
- ✅ Events can be logged in dev

---

## Phase 1 — MVP Marketing + Proof CMS ✅ COMPLETE
**Outcome:** A conversion-first site that is "different" + proof-of-work CMS + theme customization.

### Deliverables
1) ✅ Landing page (SEO + 7 sections + CTAs)
2) ✅ **Brush Reveal Hero** (canvas) + fallbacks + reduced motion
3) ✅ Case Studies: gallery + detail page (dynamic routes)
4) ✅ Contact page + form + lead capture → Firestore
5) ✅ Admin:
   - CRUD for case studies, testimonials, offers, FAQs
   - Theme customization (colors, glow, motion intensity)
   - Publish/draft toggle + drag-to-reorder
6) ✅ Analytics:
   - Core events wired (PostHog)
   - UTM capture on lead submit

### Exit criteria
- ✅ New case study can be created/edited/published in Admin
- ✅ Brush reveal works on Chrome/Safari/Edge + mobile fallback
- ✅ Landing page has 2 CTAs: Book + Get Preview Plan
- ✅ Lead submission stored with UTMs

---

## Phase 2 — Visible Agent Demo + Lead Magnet ✅ COMPLETE
**Outcome:** Visitors interact with a Mini Agent and receive a "Preview Plan". This is the conversion booster.

### Deliverables
- ✅ Mini Agent UI (guided intake via AgentDemoForm)
- ✅ Agent template markdown-driven prompts (`/agents/*.md`)
- ✅ Agent chain runner (Gemini API integration)
- ✅ Preview Plan generator + email delivery (Resend)
- ✅ Admin: edit agent templates (markdown editor + test runner)
- ✅ Admin: leads dashboard (status filtering + CSV export)

### Exit criteria
- ✅ Agent demo completes without errors
- ✅ Lead receives email with preview output
- ✅ Admin can update prompt templates without redeploy

### Deployment
- ✅ Firebase Hosting + Cloud Functions (SSR) deployed
- ✅ Firestore rules + indexes deployed
- ✅ Live at https://nicer-systems.web.app

---

## Phase 3 — Funnel Optimization + Variants ✅ COMPLETE
**Outcome:** Scale marketing performance, personalization, and lead management.

### Deliverables
- ✅ Multi-niche landing variants (admin CRUD + `/[industry]` dynamic routes)
- ✅ A/B testing framework (experiments admin + `useExperiment` hook + bucketing)
- ✅ Automated email sequences (5-email nurture via Resend `scheduledAt`)
- ✅ Lead scoring (pure function, 0–75 points, stored on lead docs)
- ✅ Admin email notifications on new leads (via Resend)
- ✅ Case study "related" recommendations (on detail pages)
- ✅ Custom error pages (404, error boundary, admin error boundary)
- ✅ Admin dashboard with real Firestore metrics + recent leads
- ✅ Activity timeline on leads (notes, status changes, email logs — subcollection)
- ✅ Follow-up reminders (date + note per lead, dashboard widget with overdue/upcoming)
- ✅ Lead detail page (`/admin/leads/[id]`) with timeline, notes, follow-up management
- ✅ Security hardening, CRUD bug fixes, sidebar nav, login redirect, theme revalidation
- ❌ CRM sync (ClickUp/HubSpot/Close) — **deferred**

### Exit criteria
- ✅ Can run at least 1 A/B test via experiments admin
- ✅ Leads have scoring, activity timeline, and follow-up management
- ✅ Industry-specific landing pages render from admin-managed variants
- ✅ Nurture email sequence enrolls new leads automatically

---

## Phase 4 — Agent Chat + Plan Sharing ✅ COMPLETE
**Outcome:** Conversational agent experience with shareable, refinable output plans.

### Deliverables
- ✅ SSE streaming agent chat (multi-phase: gathering → confirming → building → complete → follow_up)
- ✅ Chat UI components (AgentChat, ChatMessages, ChatInput, ChatPlanCard, TypingIndicator)
- ✅ Shareable preview plans (public URLs at `/plan/[id]` with view tracking)
- ✅ Plan section refinement (feedback-driven section updates via Gemini)
- ✅ Plan version history (version tracking with diff comparison)
- ✅ Comprehensive performance optimization pass (animations, CSS, lazy loading)
- ✅ Guided audit wizard — fully deployed (GuidedAuditWizard.tsx + /api/agent/audit + /audit page)
- ❌ Proposal generator — **deferred**

### Exit criteria
- ✅ Agent chat completes multi-turn conversation with streaming responses
- ✅ Generated plans can be shared via public URL
- ✅ Individual plan sections can be refined with feedback
- ✅ Performance optimized (reduced motion support, lazy loading, animation throttling)

---

---

## Phase 5 — QA Remediation ✅ COMPLETE
**Outcome:** Production-ready site with seeded content, fixed regressions, and wired features.

### Deliverables
- ✅ Seeded Firestore production data via `scripts/seed-content.ts` (7 FAQs, 4 testimonials, 3 pricing tiers — extended to 4 in Phase 9)
- ✅ Fixed agent chat phase regression in `lib/agents/conversation.ts` (wider industry matching, safety valve at 8+ messages, expanded affirm patterns)
- ✅ Wired BookingCTAButton (in-app BookingModal with date/time picker + booking flow) into nav header + hero
- ✅ Wired visual effects: BrushRevealCanvas (lazy-loaded), FlowText (hero animation), WaveDividers (between sections)
- ✅ FAQSection always renders `id="faq"` with fallback card when Firestore is empty
- ✅ Fixed healthcare variant sections.hero placeholder content + meta_description
- ✅ Seeded 5 new industry variants via `scripts/seed-variants.ts` (construction, property-management, staffing, legal, home-services)
- ✅ Added SSE timeout (30s) with retry and always-visible "Start over" button in agent chat

### Exit criteria
- ✅ All seeded content renders on production site
- ✅ Agent chat progresses through phases with bare industry names
- ✅ Booking modal opens from nav and hero CTAs
- ✅ 6 industry variant pages render at their respective URLs
- ✅ All nav anchor links (#pricing, #faq) scroll to correct sections

---

## Phase 6 — Auth & Deploy Fixes ✅ COMPLETE
**Outcome:** Admin portal fully functional in production. Turbopack SSR bundling issue resolved.

### Deliverables
- ✅ Dual-mode Firebase Admin SDK init (`lib/firebase/admin.ts`): service account creds locally, GCP application default credentials in production
- ✅ Login resilience (`app/admin/login/page.tsx`): await stale auth cleanup, retry session creation with force-refreshed token
- ✅ Session endpoint error codes (`app/api/auth/session/route.ts`): `TOKEN_EXPIRED` vs `INVALID_CREDENTIALS` with server-side logging
- ✅ Turbopack predeploy fix (`scripts/fix-turbopack-externals.js`): patches hashed `firebase-admin` module names in SSR bundles before upload
- ✅ CSP security headers + Permissions-Policy on all routes (`next.config.ts`)
- ✅ Admin dashboard Suspense loading with skeleton UI (`app/admin/(authenticated)/page.tsx`, `loading.tsx`)
- ✅ Firebase Admin SDK init tests (`tests/firebase-admin-init.test.ts`)

### Exit criteria
- ✅ Admin login works on production (`nicersystems.com/admin/login`)
- ✅ Session endpoint returns 401 (not 500) for invalid tokens
- ✅ Cloud Function logs show no `ERR_MODULE_NOT_FOUND` errors
- ✅ All dynamic SSR routes (admin, API) work in production

---

## Phase 7 — Chat Agent Quality Pass ✅ COMPLETE
**Outcome:** Conversational agent stability, debuggability, and admin-driven configuration. Full architectural details, rationale per item, and the prioritization framework are in **`docs/Chat_Agent_Architecture.md`**.

### Deliverables
**Tier 1 — Stability + UX recovery:**
- ✅ Single-retry on streaming failure with contextual fallback (`buildContextualConversationFallback` re-asks the missing field instead of starting over)
- ✅ Split SSE timeout into first-chunk (60s) vs inter-chunk (15s) — eliminates false-positive cold-start "Try again" errors
- ✅ Skip `is_extraction_update` SSE echo when nothing actually changed (`extractedHasChanges` helper)
- ✅ Tightened `inferBottleneck` heuristic — requires both pattern AND keyword
- ✅ Tightened `inferIndustry` heuristic — catches "we're a 30-person property management shop" via Branch 2
- ✅ "View full plan" link in post-plan chat bubble via per-message `share_link` field
- ✅ Plan section cards parse JSON and render formatted summaries instead of raw JSON dump
- ✅ Email-capture form no longer re-asks after submission (success state stays mounted; captured contact info syncs into `extracted` for follow-ups)
- ✅ Per-phase `generationConfig` (temperature 0.55, maxOutputTokens 220-480, stopSequences) + `systemInstruction` + structured `Content[]` history
- ✅ `chatSession` API refactor — `model.startChat({ history }) + chat.sendMessageStream()` with SDK-level history validation

**Tier 2 — Admin-driven configuration:**
- ✅ `industry_probing` Firestore collection with admin CRUD page, server-side reader with TTL cache, hardcoded fallback safety net, seed script for the 8 defaults
- ✅ Cross-phase rules registry (`lib/agents/conversation-rules.ts`) — first-class rule data with stable ids the eval suite can correlate failures against

**Tier 3 — Observability:**
- ✅ LLM-as-judge eval suite — 22 curated cases, 19 reusable criteria, CLI runner (`npm run eval:chat`), opt-in vitest harness, defensive judge-response parser
- ✅ Lead-scoring dead-code cleanup (D9 from GAPS doc) — removed `case "critical"` branch, added regression-net test pinning canonical urgency values

### Exit criteria
- ✅ 657 → 659 tests passing across 68 files (+110 tests since session start, all green)
- ✅ Typecheck clean throughout
- ✅ Architecture doc captures every shipped item, every deferred item with rationale, and prioritized roadmap for what's next
- ✅ Chat eval suite available as CLI + opt-in vitest target — provides regression net for future prompt changes
- ✅ Industry probing growable via admin UI without redeploys

### Deferred from Phase 7 (with rationale)
- ❌ Server-side session pinning (G2) — operational complexity outweighs current value
- ❌ Function-calling persona refactor (full H) — breaks streaming UX; scoped to rules-as-data instead

---

## Phase 8 — Admin UX + Draft Review ✅ COMPLETE
**Outcome:** Admin can reshape the homepage layout and preview unpublished content before it goes live. Delivered as two independent slices.

### Deliverables
**D1 — Homepage Layout Admin** (shipped 2026-04-11, committed `ff3bb8d`):
- ✅ `types/homepage-layout.ts` — 11-section union + `SECTION_REGISTRY` with labels, descriptions, recommended flags
- ✅ `lib/marketing/homepage-layout-resolver.ts` — pure merge function that backfills missing keys, drops unknown keys, dedupes duplicates, breaks ties by default-layout position, normalizes `sort_order` to 0..N-1
- ✅ `lib/firestore/homepage-layout.ts` — stores the layout at `site_settings/homepage_layout` (single doc, no new collection) with TTL-cached reader via `unstable_cache`
- ✅ `lib/actions/homepage-layout.ts` — server actions (update + reset-to-defaults)
- ✅ `app/admin/(authenticated)/homepage-layout/` — admin page with drag-to-reorder list, per-section visibility toggles, unsaved-changes indicator, last-saved timestamp, reset-to-defaults confirmation flow
- ✅ `app/(marketing)/page.tsx` refactored to `renderSection(key, experiments)` dispatch driven by the resolved layout
- ✅ 27 regression tests in `tests/homepage-layout.test.ts` covering default-layout contract, resolver merge semantics, visibility filtering, and Zod schema boundaries

**D2 — Admin Preview Mode** (shipped pre-2026-04-11, committed `a96f019`):
- ✅ `/preview/site` and `/preview/variant/[id]` routes gate on `getSessionUser()`
- ✅ Dedicated `getAllXForPreview` readers in `lib/firestore/*.ts` that bypass the publish filter
- ✅ "Preview site" link surfaced in admin layout chrome
- ✅ `PreviewBanner` shows draft counts to remind admin they're looking at unpublished content
- ✅ 5 regression tests in `tests/preview-readers.test.ts` pin the reader contract

### Exit criteria
- ✅ Admin can reorder, hide, and show individual homepage sections without redeploy
- ✅ Admin can preview all draft content before publishing
- ✅ Both features verified by regression tests and production-ready

---

## Phase 9 — Funnel Widening ✅ SHIPPED 2026-04-20
**Outcome:** Free entry tier surfaced on the pricing card so price-sensitive prospects see a $0 path into the funnel; tier-level analytics added to measure cannibalization vs widening.

### Deliverables
- ✅ Free **Discovery Call** tier (`sort_order: 0`, `cta_action: "booking"`) seeded into Firestore — opens the existing BookingModal; copy emphasizes "30 minutes, no deliverable, no obligation" to keep premium positioning intact
- ✅ `Offer.cta_action` discriminator (`"audit" | "contact" | "booking"`) in `types/offer.ts` + `lib/validation.ts` — replaces the legacy regex CTA sniff; admin offers form gains a "CTA Action" select with an "Auto" fallback
- ✅ `PricingSection.tsx` grid responds to tier count (`md:grid-cols-2 lg:grid-cols-4` when ≥4 tiers, otherwise `md:grid-cols-3`); CTA renderer dispatches on `cta_action`
- ✅ `BookingCTAButton.tsx` extended with optional `extraEventName` / `extraEventPayload` so the pricing-card render path fires `pricing_tier_click` alongside `booking_click`
- ✅ `EVENTS.PRICING_TIER_CLICK` added to `lib/analytics.ts` with `{ tier_name, tier_price, tier_action }` payload — closes the gap previously called out in `docs/Analytics_Funnel.md`
- ✅ Fixed legacy `highlighted_tier: "Growth"` mismatch in `lib/marketing/variant-content.ts` → `"Build & Launch"` (silently dead config since the tier was renamed); updated pricing eyebrow + description for the new tier breadth

### Exit criteria
- ✅ Pricing card renders 4 tiers in correct sort order (0, 1, 2, 3) with Discovery Call leftmost
- ✅ Discovery Call CTA opens BookingModal (same UX as hero "Book a Scoping Call")
- ✅ All 4 tier CTAs fire `pricing_tier_click` with the correct `tier_name` / `tier_price` / `tier_action`
- ✅ Industry variant pages (`/healthcare`, `/construction`, etc.) highlight `Build & Launch` instead of falling through to the legacy `Growth` default

### Post-launch monitoring
- 30-day check on `pricing_tier_click` distribution: if Discovery Call clicks largely overlap with would-be hero CTA users (cannibalization, not widening), unify the labels
- Watch BookingForm submission quality — pre-screen calendar invites against the message field; add a one-line qualifier if low-quality call volume hurts

---

## Deferred Items
**Genuinely deferred — not yet started, with rationale where applicable.**

### Product / Integration
- ❌ **CRM sync** (ClickUp / HubSpot / Close integration) — deferred since Phase 3; no downstream consumer yet
- ❌ **Proposal generator** (internal tooling from intake data) — deferred since Phase 4; blocked on proposal template standardization
- ❌ **Full client portal** — deferred; see `docs/Scaling_Playbook.md` for roadmap
- ❌ **Multi-tenant enterprise RBAC** — deferred; single-tenant architecture sufficient for current scale

### Chat agent — open weaknesses
Tracked in `docs/Chat_Agent_Architecture.md §7` (source of truth) and mirrored into `docs/Backlog.md` Deferred Items for visibility. Surfaced during the Phase 7 analysis but not refactored.

- ❌ **W11 — confirming prompt overloaded**: asks the model to do 5+ jobs in 3-4 sentences. Full fix requires splitting the confirming phase into 2 calls or accepting that some jobs get dropped under token pressure. Code: `lib/agents/conversation.ts:613-669`.
- ⚠️ **W12 — brand-voice rules only partially enforced**: `no-filler` rule is in the prompt, drift is mitigated by `stopSequences` + `temperature: 0.55`, but model can still leak filler occasionally. Full enforcement requires post-generation output filtering. Probably the practical ceiling.
- ❌ **W17 — healthcare alias bucket contaminated**: `fitness`, `childcare`, `veterinary`, `medical`, `senior care` all map to `healthcare`. Minor semantic bug. Fix: add dedicated `industry_probing` entries for these sectors or drop the aliases. Code: `lib/agents/conversation.ts:133-137`.

### Chat agent — architectural deferrals with rationale
- ❌ **Server-side session pinning** (G2 from Phase 7) — operational complexity (TTL cleanup, GDPR retention, race conditions) outweighs current value; 20-message context window cap already bounds wire payload. Revisit when there's a concrete need (cross-device resume, live admin dashboard view)
- ❌ **Function-calling persona refactor** (full H from Phase 7) — breaks streaming UX; scoped to rules-as-data instead

### ✅ Previously listed as deferred — now shipped (reconciled 2026-04-12)
The following items were listed here as "deferred" in prior revisions but were found shipped during a reconciliation pass. Historical traceability:

- ✅ **Email unsubscribe + suppression list** — `lib/email/unsubscribe-token.ts` (HMAC), `nurture-sequence.ts` skip logic on `nurture_unsubscribed`, `nurture-templates.ts` footer link, `app/api/leads/unsubscribe/route.ts`
- ✅ **Lead confirmation email after submit** — `lib/email/confirmation-email.ts`, wired in `app/api/leads/route.ts`
- ✅ **Homepage section toggles + ordering** — delivered as Phase 8 D1 (see above)
- ✅ **Admin preview mode** — delivered as Phase 8 D2 (see above)
