# Phased Implementation Plan
**Doc Date:** 2026-02-27 | **Updated:** 2026-03-01

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

## Phase 3 — Funnel Optimization + Variants (NOT STARTED)
**Outcome:** Scale marketing performance and personalization.

### Deliverables
- Multi-niche landing variants (industry pages)
- A/B testing framework (hero copy/CTA)
- Automated email sequences (nurture)
- CRM sync (ClickUp/HubSpot/Close) + lead scoring
- Case study "related" recommendations

### Exit criteria
- Can run at least 1 A/B test
- Leads route into CRM with attribution intact

---

## Phase 4 — "Ops Visibility Preview" Web App (NOT STARTED)
**Outcome:** Turn the demo into a productized audit tool.

### Deliverables
- Guided audit wizard
- Output: dashboard blueprint + SOP + automation map
- Account-based follow-up + consult scheduling
- Internal tooling for generating proposals from intake

### Exit criteria
- Audit output used in real sales calls
- Consistent close-lift measured vs control
