# Product Requirements Document (PRD)
**Product:** Nicer Systems marketing site + admin web app + agentic preview-plan workflow
**Doc Date:** 2026-02-27 | **Updated:** 2026-04-20
**Owner:** Nicer Systems

## 1. Product Summary
Nicer Systems is a conversion-first marketing site and authenticated admin app for selling and operating workflow-design engagements. The public site is built around two core promises:

- diagnose one operational bottleneck quickly
- turn that bottleneck into a shareable operating plan

The product now centers on three public entry points:

- the homepage chat/demo surface
- the guided audit flow at `/audit`
- shared preview plans at `/plan/[id]`

The admin app manages content, pricing, testimonials, FAQs, variants, experiments, homepage layout, preview mode, leads, and agent templates.

## 2. Problem
Most agency sites still fail in three ways:

- they do not differentiate meaningfully
- they do not let buyers experience the workflow thinking before booking
- they do not give operators a clean system for updating proof, pricing, and experiments without engineering help

## 3. Goals
### Business goals
- Increase qualified scoping-call bookings
- Increase preview-plan generation and lead capture
- Improve conversion by landing variant and experiment
- Reduce admin time to publish or adjust homepage content

### Visitor goals
- Understand the offer quickly
- Experience the agentic workflow directly
- See proof, pricing, and next steps without excess copy
- Share or revisit the generated plan

### Operator goals
- Update content and experiments without redeploys
- Reorder and toggle homepage sections without code changes
- Preview draft content before publishing
- Track leads, follow-ups, and funnel activity in one place

## 4. Personas
### Ops Owner
JTBD: "I need fewer fire drills and more visibility into work in progress."

### Founder / GM
JTBD: "I want predictable operations without managing through status meetings."

### Internal Operator
JTBD: "I need to update the marketing surface and workflow content without waiting on engineering."

## 5. Current Product Scope
### Public marketing surface
- Homepage with admin-managed section ordering and visibility
- Brush-reveal hero and live chat/demo section
- Proof-of-work gallery and case-study pages
- Guided audit at `/audit`
- Industry variant pages at `/[industry]`
- Contact page and booking modal / booking flow
- Pricing section with four tiers — free Discovery Call entry, $2,500 Workflow Audit, $7,500 Build & Launch, $3,500/mo Managed Ops
- Shareable plans at `/plan/[id]`
- Privacy, terms, FAQ pages

### Authenticated admin surface
- Dashboard
- Case studies, testimonials, FAQs, offers
- Leads dashboard and lead detail
- Agent templates
- Industry variants
- Experiments
- Homepage layout admin
- Settings / theme customization
- Preview routes for site and variants

### Agent surface
- Multi-phase chat intake
- Guided audit intake
- Preview-plan generation pipeline
- Section-level refinement preview and apply flow
- Share and email plan delivery

## 6. Success Metrics
- Landing view to primary CTA click rate
- Landing view to plan generation rate
- Plan generation to booking rate
- Booking rate by homepage experiment / landing variant
- Lead follow-up completion rate
- Admin time to publish content updates

## 7. Functional Requirements
### 7.1 Homepage
The homepage is not a fixed set of sections anymore. It renders a resolved Firestore-backed layout from `site_settings/homepage_layout`.

Default visible sections:
1. Hero
2. Proof of work
3. Testimonials
4. Is this for you
5. How it works
6. See it work
7. Why not DIY
8. Features
9. Pricing
10. FAQ
11. Final CTA

Requirements:
- Admin can reorder and hide sections
- Structural trackers and JSON-LD remain code-owned, not layout-managed
- Hero and final CTA support homepage experiments

### 7.2 Hero / Differentiation
- Brush-reveal hero with reduced-motion fallback
- Primary CTA into booking
- Secondary CTA into live demo section
- Short, high-signal copy focused on workflow design and plan generation

### 7.3 Live demo / chat intake
- Multi-phase SSE chat at `/api/agent/chat`
- Phases: gathering, confirming, building, complete, follow_up
- Streams plan sections as they complete
- Offers plan sharing and email capture after completion
- Uses industry-aware probing and guardrails

### 7.4 Guided audit
- Public page at `/audit`
- Structured intake for richer workflow information
- Produces the same preview-plan shape as the chat flow
- Suitable for visitors who want a more guided, form-like experience

### 7.5 Preview plan
- Generated plans stored in Firestore
- Public plans viewable at `/plan/[id]`
- Share actions available from the plan view
- Plan sections can be refined
- Refinement uses a two-step flow:
  - preview via `/api/agent/refine`
  - persistence via `/api/agent/refine/apply`

### 7.6 Proof of work
- CMS-managed case studies
- Public list and detail routes
- Filters and related recommendations
- Draft and publish workflow in admin

### 7.7 Leads and booking
- Public lead capture via `/api/leads`
- Booking flow via `/api/booking`
- Lead scoring, activity timeline, follow-up reminders
- Admin notifications and nurture emails

### 7.8 Admin
- Authenticated access only
- CRUD for core CMS collections
- Homepage layout management
- Preview mode for unpublished content
- Experiment management
- Agent template editing and test runs

## 8. Non-Functional Requirements
- Accessibility: reduced motion, keyboard support, readable semantics
- Performance: lazy-load heavy client effects and chat surfaces
- Security: auth gating, Firestore rules, request validation, rate limiting
- Maintainability: docs and code should describe the same product surface

## 9. Source Of Truth
Use these docs for the current state:

- `docs/Phased_Implementation_Plan.md` for shipped vs deferred status
- `docs/Backlog.md` for open work
- `docs/API_Spec.md` for route contracts
- `docs/UI_UX_Spec.md` for the current page and admin surface
- `docs/Chat_Agent_Architecture.md` for chat-agent internals and known weaknesses

This PRD should describe the current product shape, not historical MVP intent.

## 10. Genuine Open Work
These are still unresolved product items, not documentation debt:

- CRM sync
- Proposal generator
- Full client portal
- Multi-tenant enterprise RBAC
- Chat confirming-phase overload
- Industry alias cleanup for non-healthcare sectors grouped into healthcare

## 11. Appendix
- `docs/Architecture.md`
- `docs/API_Spec.md`
- `docs/UI_UX_Spec.md`
- `docs/User_Flows.md`
- `docs/Backlog.md`
- `docs/Phased_Implementation_Plan.md`
