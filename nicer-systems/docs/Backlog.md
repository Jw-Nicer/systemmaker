# Backlog (Prioritized)
**Doc Date:** 2026-02-27 | **Updated:** 2026-04-20

## P0 (Phase 1) ✅ COMPLETE
- ✅ Brush reveal hero with fallback
- ✅ CMS CRUD for proof + publish
- ✅ Theme controls (colors/glow/motion)
- ✅ Landing sections + CTAs + contact form
- ✅ Analytics events + UTM capture

## P1 (Phase 2) ✅ COMPLETE
- ✅ Mini Agent demo (form-based)
- ✅ Preview Plan email delivery (Resend)
- ✅ Leads dashboard + CSV export
- ✅ Agent template editor + test runner

## P2 (Phase 3) ✅ COMPLETE
- ✅ Industry landing pages + personalization (variants)
- ✅ A/B testing framework (experiments admin + useExperiment hook)
- ✅ Email sequences (5-email nurture via Resend scheduledAt)
- ✅ Lead scoring (0–75 points)
- ✅ Activity timeline on leads (notes, status changes, email logs)
- ✅ Follow-up reminders (date + note per lead)
- ✅ Lead detail page with timeline + follow-up management
- ✅ Case study related recommendations
- ✅ Custom error pages (404, error boundary)
- ✅ Admin dashboard with real Firestore metrics
- ✅ Admin email notifications on new leads
- ❌ CRM sync — **deferred**

## P3 (Phase 4) ✅ DELIVERED (with deferrals)
- ✅ SSE streaming agent chat (multi-phase conversation)
- ✅ Shareable preview plans (public URLs)
- ✅ Plan section refinement with version history
- ✅ Performance optimization pass
- ✅ Guided audit wizard — fully deployed (4-step wizard + API endpoint)
- ❌ Proposal generator — **deferred**
- ❌ Account-based follow-ups — **deferred**

## P4 (Phase 5 — QA Remediation) ✅ COMPLETE
- ✅ Seeded production Firestore data (7 FAQs, 4 testimonials, 3 pricing tiers — extended to 4 in P8)
- ✅ Fixed agent chat regression (wider industry matching, safety valve, expanded affirm)
- ✅ Wired BookingCTAButton into nav + hero (in-app BookingModal with booking flow)
- ✅ Wired visual effects (BrushRevealCanvas, FlowText, WaveDividers)
- ✅ FAQSection always renders with fallback when empty
- ✅ Fixed healthcare variant placeholder content
- ✅ Seeded 5 industry variants (construction, property-management, staffing, legal, home-services)
- ✅ SSE timeout + retry + Start Over button in agent chat

## P5 (Post-QA — Auth & Deploy Fixes) ✅ COMPLETE
- ✅ Fixed admin login in production (dual-mode Firebase Admin SDK — service account + ADC)
- ✅ Fixed Turbopack hashed module names (predeploy script patches firebase-admin references)
- ✅ Added CSP security headers + Permissions-Policy to all routes
- ✅ Login resilience: token retry logic + specific error codes from session endpoint
- ✅ Admin dashboard Suspense loading with skeleton UI
- ✅ Firebase Admin SDK init tests (2 tests covering both credential paths)

## P6 (Phase 7 — Chat Agent Quality Pass) ✅ COMPLETE
**Outcome:** Conversational agent stability, debuggability, and admin-driven configuration. Full architectural details in `docs/Chat_Agent_Architecture.md`.

### Tier 1 — Stability + UX recovery
- ✅ Single-retry on streaming failure with contextual fallback that re-asks the missing field instead of starting over (`generateConversationalResponse` in `lib/agents/conversation.ts`, `buildContextualConversationFallback`)
- ✅ Split SSE stall timeout into `SSE_FIRST_CHUNK_TIMEOUT_MS=60s` (cold-start friendly) and `SSE_INTER_CHUNK_TIMEOUT_MS=15s` (post-first-byte) in `hooks/useSSEChat.ts`
- ✅ Skip `is_extraction_update` SSE echo when extraction produced no actual diff (`extractedHasChanges` helper, used in `app/api/agent/chat/route.ts`)
- ✅ Tightened `inferBottleneck` heuristic — now requires both a problem-pattern AND a problem-keyword (eliminates false positives on long messages with one keyword in passing)
- ✅ Tightened `inferIndustry` heuristic — added Branch 2 for conversational openers like "we're a 30-person property management shop", "I'm a small healthcare clinic"
- ✅ "View full plan" link rendered inside the post-plan chat bubble via per-message `share_link` field — closes the loop between chat and `/plan/[id]` PlanDisplay
- ✅ Plan section cards in chat now parse JSON and render formatted summaries instead of dumping raw JSON
- ✅ Email-capture form no longer re-asks after submission — fixed by keeping `EmailCaptureInline` mounted so it can render its success state, plus syncing captured contact info into `extracted` so follow-up turns don't re-ask either
- ✅ Per-phase `generationConfig` (temperature, maxOutputTokens, stopSequences) added to `invokeLLMChatStreaming` — enforces brevity, kills `Visitor:`/`Agent:` hallucinations
- ✅ `systemInstruction` + structured `Content[]` history (instead of flat string prompts) — uses Gemini's native chat template
- ✅ `chatSession` API refactor — `invokeLLMChatStreaming` now uses `model.startChat({ history }) + chat.sendMessageStream()` for SDK-level history validation (G1)

### Tier 2 — Admin-driven configuration
- ✅ `industry_probing` Firestore collection — admin CRUD page at `/admin/industry-probing`, server actions, server-side reader with TTL cache, hardcoded fallback as safety net. Hardcoded `INDUSTRY_PROBING` table is now `INDUSTRY_PROBING_FALLBACK`. Seed script `scripts/seed-industry-probing.ts` populates the 8 defaults
- ✅ Cross-phase rules registry (`lib/agents/conversation-rules.ts`) — `no-filler`, `no-markdown-leak`, per-phase sentence caps moved out of inline duplication into first-class data with stable ids the eval suite can correlate failures against (H — scoped)

### Tier 3 — Observability
- ✅ LLM-as-judge eval suite for chat answers — 22 curated cases across all 3 phases, 19 reusable criteria, CLI runner (`npm run eval:chat`), opt-in vitest harness (`RUN_LLM_EVALS=1`), defensive judge-response parser, suite aggregation by phase + criterion (I)
- ✅ Lead-scoring dead-code cleanup — removed `case "critical"` branch (no form schema ever emitted that value), added regression-net test pinning every canonical urgency value to its expected score (D9 from GAPS doc)

### Deferred from this phase (with rationale)
- ❌ G2 — Server-side session pinning (Firestore-backed `chat_sessions` collection). Operational complexity (TTL cleanup, GDPR retention, race conditions, security model) outweighs current value since the 20-message context window cap already bounds wire payload. Revisit when there's a concrete need (cross-device resume, live admin dashboard view).
- ❌ H (full) — Function-calling persona refactor. Breaks streaming UX (model returns tool calls instead of text). Scoped to rules-as-data instead.

### Test results
- 549 tests at start of phase → **659 passing across 68 files** at end of Phase 7 (+110 tests). Typecheck clean throughout.

## P7 (Phase 8 — Admin UX + Draft Review) ✅ COMPLETE
**Outcome:** Admin can reshape the homepage layout and preview unpublished content before it goes live. Two independent slices (D1 + D2).

### D1 — Homepage Layout Admin (shipped 2026-04-11, committed `ff3bb8d`)
- ✅ `types/homepage-layout.ts` — 11-section union + `SECTION_REGISTRY` with labels/descriptions/recommended flags
- ✅ `lib/marketing/homepage-layout-resolver.ts` — pure merge function (backfill missing keys, drop unknown keys, dedupe duplicates, tie-break by default position, normalize `sort_order` to 0..N-1)
- ✅ `lib/firestore/homepage-layout.ts` — TTL-cached reader via `unstable_cache`, single-doc store at `site_settings/homepage_layout`
- ✅ `lib/actions/homepage-layout.ts` — server actions (update + reset-to-defaults)
- ✅ `app/admin/(authenticated)/homepage-layout/` — drag-to-reorder admin page, per-section visibility toggles, unsaved-changes indicator, last-saved timestamp, reset-to-defaults confirmation flow
- ✅ `app/(marketing)/page.tsx` refactored to `renderSection(key, experiments)` dispatch driven by the resolved layout
- ✅ 27 regression tests in `tests/homepage-layout.test.ts`

### D2 — Admin Preview Mode (shipped pre-2026-04-11, committed `a96f019`)
- ✅ `/preview/site` and `/preview/variant/[id]` routes gated on `getSessionUser()`
- ✅ Dedicated `getAllXForPreview` readers in `lib/firestore/*.ts` that bypass the publish filter
- ✅ "Preview site" link surfaced in admin layout chrome
- ✅ `PreviewBanner` shows draft counts to remind admin they're viewing unpublished content
- ✅ 5 regression tests in `tests/preview-readers.test.ts`

### Test results
- 659 tests at end of Phase 7 → **736 passing / 1 skipped across 73 files** at end of Phase 8 (+77 tests). Typecheck clean.

## Deferred Items
### Product / Integration
- CRM sync (ClickUp/HubSpot/Close integration)
- Proposal generator (internal tooling)
- Account-based follow-ups
- Full client portal
- Multi-tenant enterprise RBAC

### Chat agent (open weaknesses — source of truth: `docs/Chat_Agent_Architecture.md §7`)
- ❌ **W11 — confirming prompt overloaded**: asks the model to do 5+ jobs (restate narrative, add insight, address latest, invite corrections, close with CTA, plus shared brevity rules) in 3-4 sentences. Surfaced during the Phase 7 analysis but not refactored. Full fix requires splitting the confirming phase into 2 calls (insight-generation then confirmation-ask) or accepting that some jobs get dropped under token pressure. Code: `lib/agents/conversation.ts:613-669`.
- ⚠️ **W12 — brand-voice rules only partially enforced**: "Never say 'Great question'" and similar no-filler rules are in the prompt via `getSharedRulesForPhase`, and drift is mitigated by `stopSequences` + `temperature: 0.55`, but the model can still leak filler under rare circumstances. Full enforcement requires post-generation output filtering. Probably the practical ceiling without significant work.
- ❌ **W17 — healthcare alias bucket contaminated**: `fitness`, `childcare`, `veterinary`, `medical`, `senior care` all map to `healthcare` in `INDUSTRY_ALIASES_FALLBACK`. Minor semantic bug — the probing for `healthcare` doesn't fit a fitness studio or daycare. Fix is to either add dedicated industry_probing entries for these sectors or drop the alias. Code: `lib/agents/conversation.ts:133-137`.

### Chat agent (architectural deferrals with rationale)
- Chat agent G2 (server-side session pinning) — see P6 deferral rationale
- Function-calling persona refactor (full H from P6) — breaks streaming UX, scoped to rules-as-data instead

## P8 (Phase 9 — Funnel Widening) ✅ SHIPPED 2026-04-20
**Outcome:** Pricing card now surfaces a $0 entry tier so price-sensitive prospects have a visible no-commitment path into the funnel, with the option to nurture into the $2,500 / $7,500 / $3,500-mo tiers.

- ✅ Free Discovery Call tier (`sort_order: 0`, `cta_action: "booking"`) — opens existing BookingModal; copy emphasizes "30 minutes, no deliverable, no obligation" to avoid premium-positioning dilution
- ✅ `Offer.cta_action` discriminator (`"audit" | "contact" | "booking"`) replaces the legacy regex CTA sniff in `PricingSection.tsx`; admin form gains a CTA Action select
- ✅ Pricing grid responds to tier count (`md:grid-cols-2 lg:grid-cols-4` when ≥4 tiers, otherwise `md:grid-cols-3`)
- ✅ `BookingCTAButton` extended with `extraEventName` / `extraEventPayload` so the pricing-card render path can fire `pricing_tier_click` alongside `booking_click`
- ✅ `EVENTS.PRICING_TIER_CLICK` — new analytics event with `{ tier_name, tier_price, tier_action }` properties; closes the gap called out in `docs/Analytics_Funnel.md`
- ✅ Fixed legacy `highlighted_tier: "Growth"` mismatch in `lib/marketing/variant-content.ts` → `"Build & Launch"`; updated pricing eyebrow + description for the new tier breadth

### Risks tracked post-launch
- **Hero-vs-pricing-card cannibalization** — kill-switch is `pricing_tier_click` distribution at 30 days; if Discovery Call clicks largely come from would-be hero CTA users, unify labels
- **Time burn from low-quality 30-min calls** — pre-screen via existing BookingForm message field; add a one-line qualifier if volume requires

## Newly verified already-shipped (reconciled 2026-04-11 / 2026-04-12)

The following items were listed as "deferred" or "open" in prior roadmap docs but were found to be fully implemented during reconciliation passes. All have been backfilled with regression tests and doc corrections.

- ✅ Guided Audit wizard (Phase 4 deferred → shipped) — `GuidedAuditWizard.tsx`, `/api/agent/audit`, `/audit` page, CTA in `SeeItWork` with `CTA_CLICK_GUIDED_AUDIT` analytics
- ✅ Lead confirmation email after submit — `lib/email/confirmation-email.ts` wired into `/api/leads/route.ts`
- ✅ Email unsubscribe + suppression list — `lib/email/unsubscribe-token.ts` (HMAC), `nurture-sequence.ts` skip logic, `nurture-templates.ts` footer link, `/api/leads/unsubscribe` route
- ✅ Case study taxonomy (workflow_type, result_categories, published_at) — full type + schema + server action + admin UI + filter chips on both homepage gallery and dedicated listing page (`CaseStudiesListClient` filters extended 2026-04-11)
- ✅ Case study approval workflow (draft/review/published/archived) — `status` enum, migration-safe `is_published` fallback, public-read Firestore rule gated on `status`, 16 regression tests added 2026-04-11
- ✅ Lead status dispositions — expanded to 8 statuses (`new`, `qualified`, `nurture`, `later`, `booked`, `closed`, `unqualified`, `lost`), centralized labels + color classes in `types/lead.ts`, 11 regression tests added 2026-04-11

**Note:** Homepage section toggles + ordering (D1) and Admin preview mode (D2) are now formally tracked as **Phase 8 / P7** above — they are no longer retrospective "already-shipped" discoveries but named phase deliverables.
