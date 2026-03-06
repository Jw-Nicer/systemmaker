# Product Requirements Document (PRD)
**Product:** Nicer Systems Website + Web App Admin + Visible Agent Demo  
**Doc Date:** 2026-02-27 | **Updated:** 2026-03-05
**Owner:** Nicer Systems (Product/Marketing)

## 1. Problem
Most agency sites are visually similar and fail to:
- create immediate differentiation
- prove real operational competence
- update proof-of-work easily
- measure funnel performance end-to-end

## 2. Goals
### Business goals
- Increase qualified bookings (scoping calls)
- Increase lead capture for “Preview Plan”
- Reduce time to publish proof-of-work updates to < 10 minutes per case study
- Track funnel conversion rates by traffic source and landing variant

### User goals (visitors)
- Quickly understand what Nicer Systems does
- See proof that it works (metrics, before/after, artifacts)
- Experience “automation/agentic capability” directly (interactive demo)
- Easily contact/book

### Operator goals (admin)
- Add/edit proof-of-work, testimonials, pricing, FAQs
- Customize brand theme (colors + glow + motion level)
- Access analytics dashboard
- Export lead data

## 3. Success Metrics (KPIs)
- Landing → CTA click rate
- Landing → “Preview Plan” completion rate
- Lead → Booking conversion rate
- Time on page + engaged interactions (brush reveal start + agent demo start/completion)
- Case study view-through rate
- Admin publishing time per case study

## 4. Personas & Jobs-To-Be-Done
### Persona A: Ops Owner (buyer)
JTBD: “I need fewer fire drills and visibility into work-in-progress.”  
Proof needed: before/after metrics, examples of dashboards/alerts.

### Persona B: Founder/GM
JTBD: “I want predictable operations and reporting without micromanaging.”  
Proof needed: outcomes + case studies + process clarity.

### Persona C: Internal operator (admin user)
JTBD: “I must update the site content without engineering support.”  
Proof needed: easy admin UI + previews + version history.

## 5. Core Product Concept
A conversion-first marketing site with a **signature interaction** (Brush Reveal) and a **visible automation/agent demo**. A web app Admin allows updating proof-of-work and theme settings. Funnel is instrumented end-to-end.

## 6. Scope Summary
### Must-have (MVP)
- Marketing landing page (SEO optimized)
- Brush Reveal hero interaction (with fallback)
- Proof-of-work gallery + detail pages
- Admin CMS for proof-of-work + testimonials + offers/pricing + FAQs
- Theme customization in Admin (colors + glow + motion intensity)
- Contact page + booking CTA (email + scheduler link)
- Analytics events + UTM capture

### Should-have (MVP+)
- Visitor “Mini Agent” demo producing a Preview Plan + email capture
- Lead dashboard + exports

### Built (Phase 3 — complete)
- Multi-niche landing variants + A/B testing
- Automated email sequences (5-email nurture via Resend)
- Lead scoring (0–75 points) + activity timeline + follow-up reminders
- Case study related recommendations
- Custom error pages (404, error boundary)
- CRM sync — deferred

### Built (Phase 4 — complete)
- SSE streaming agent chat (multi-phase conversation)
- Shareable preview plans (public URLs at /plan/[id])
- Plan section refinement with version history
- Performance optimization pass

### Deferred
- Full client portal
- CRM sync (ClickUp/HubSpot/Close)
- Guided audit wizard
- Proposal generator

## 7. Functional Requirements
### 7.1 Marketing Landing (Public)
- Sections: Hero, Interactive Differentiator, Proof, How it Works, Offer/Pricing, FAQ, CTA/Footer
- SEO: metadata, schema markup for Organization/FAQ, open graph
- Performance: lazy-load heavy effects, strong Core Web Vitals

### 7.2 Signature Interaction: Brush Reveal Hero
- Two layered hero visuals (top overlay, bottom image/video)
- Cursor becomes a brush; painting reveals the bottom layer
- Touch: finger drag reveals
- Fallback: static crossfade on scroll if canvas unsupported
- Reduced motion: disable continuous animation, provide static hero

### 7.3 Visible Automation / Mini Agent (Public)
- A guided panel: user enters “bottleneck”, selects industry + tools
- The system generates:
  - workflow map draft
  - KPI dashboard suggestions
  - alert rules
  - 30-day plan
- Outputs presented as animated cards
- Lead capture: user emails themselves the “Preview Plan”
- Safety: no claims of accessing their systems, no credential asks in MVP

### 7.4 Proof of Work (CMS-managed)
- Gallery view with filters (industry, workflow type, tool stack)
- Case study page includes:
  - problem summary
  - solution
  - artifacts (images/video)
  - metrics (before/after)
  - timeline
  - CTA

### 7.5 Admin Web App
- Auth required
- CRUD:
  - Case studies
  - Testimonials
  - Offers/Pricing
  - FAQs
  - Homepage section toggles + ordering
- Theme:
  - primary/secondary color
  - background gradient preset
  - glow intensity
  - motion intensity (0–3)
  - cursor brush style preset
- Preview mode: view marketing pages with draft content before publish

### 7.6 Contact / Booking
- Contact page with:
  - form (name, email, company, workflow, tools, urgency)
  - scheduler link/embed
- Confirmation email (Phase 2+): “Next steps + what to bring”

### 7.7 Analytics / Funnel
- Capture UTMs on first visit and persist through lead capture
- Track events:
  - landing_view
  - brush_reveal_start
  - agent_demo_start
  - agent_demo_complete
  - case_study_view
  - cta_click_book
  - lead_submit
  - booking_click
- Admin analytics dashboard (Phase 2+)

## 8. Non-Functional Requirements
- Accessibility: keyboard navigation, ARIA, reduced motion support
- Performance: LCP < 2.5s mobile target, defer canvas
- Security: Admin auth + Firestore security rules + Zod validation
- Reliability: error logging, content versioning (optional), backups
- Maintainability: clear modules, docs, agent templates in markdown

## 9. Risks & Mitigations
- Motion effects reduce performance → lazy-load + progressive enhancement + fallback
- Over-artistic reduces clarity → keep conversion copy visible and CTAs persistent
- Agent demo overpromises → explicit “preview plan” language + constrained outputs

## 10. Acceptance Criteria (High Level)
- Admin can publish a new case study without code changes
- Brush reveal works on desktop and touch, degrades gracefully
- Visitor can generate a Preview Plan and submit lead capture
- UTMs persist and appear on the lead record
- Site passes accessibility checks for core flows

## 11. Appendix
See:
- `docs/UI_UX_Spec.md`
- `docs/Architecture.md`
- `docs/Data_Model.md`
- `docs/Analytics_Funnel.md`
- `docs/Admin_Spec.md`
