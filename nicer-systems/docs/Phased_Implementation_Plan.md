# Phased Implementation Plan
**Doc Date:** 2026-02-27 | **Updated:** 2026-03-12

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
- ❌ Guided audit wizard — **deferred**
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
- ✅ Seeded Firestore production data via `scripts/seed-content.ts` (7 FAQs, 4 testimonials, 3 pricing tiers)
- ✅ Fixed agent chat phase regression in `lib/agents/conversation.ts` (wider industry matching, safety valve at 8+ messages, expanded affirm patterns)
- ✅ Wired BookingCTAButton (in-app BookingModal with date/time picker + Google Calendar integration) into nav header + hero
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

## Deferred Items
- CRM sync (ClickUp/HubSpot/Close integration)
- Proposal generator (internal tooling from intake data)
- Full client portal
- Multi-tenant enterprise RBAC
