# ADR-003: Agency Model, Not Multi-Tenant SaaS
**Date:** 2026-03-10 | **Status:** Accepted

## Context
The product could be delivered as either (a) a self-serve multi-tenant SaaS where clients log in, configure workflows, and manage their own dashboards, or (b) a done-for-you agency with a productized intake flow where the app generates preview plans and captures leads, and implementation is delivered offline by the founder.

## Decision
Agency model. Clients do not log in. The app serves two audiences: public visitors (who submit audits and receive preview plans) and a single admin user (the founder, who manages leads, content, and agent templates). Implementation work is done offline outside the app.

## Consequences
**Positive:**
- Ship faster — no RBAC, multi-tenant data isolation, or client-facing dashboard to build
- Simpler security model — one admin user, public read for published content, no client auth
- Higher per-deal revenue (custom implementation vs. SaaS subscription)
- Preview plans act as a sales tool, not a product — lower expectation of ongoing platform reliability

**Negative:**
- Does not scale without hiring — every client requires manual implementation work
- No recurring SaaS revenue (project-based billing)
- No client portal — clients cannot self-serve or view progress
- Future pivot to SaaS requires significant architectural changes (see `docs/Scaling_Playbook.md`)

## Alternatives Considered
- **Multi-tenant SaaS** — Deferred to a future phase (documented in `docs/Backlog.md`). Would require: Stripe billing, per-client Firestore subcollections, Firebase Auth custom claims for roles, client-facing dashboard, usage metering. The founding team (solo) does not have the capacity to build and support this yet.
