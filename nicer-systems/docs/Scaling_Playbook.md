# Scaling Playbook

> How Nicer Systems grows from a solo founder tool to a team operation to a SaaS product. Each phase lists what to build, when to trigger the transition, and what existing docs support it.

## Current Architecture (Solo Founder)
- Single admin user (Firebase Auth email/password)
- All content managed via admin panel
- Leads managed via admin dashboard
- Agent templates edited via admin UI
- Manual deploy from local (see [`docs/CI_CD.md`](./CI_CD.md))
- Operating rhythm documented in [`docs/SOP_Founder_Operations.md`](./SOP_Founder_Operations.md)
- For context on why this model was chosen, see [ADR-003](./ADR/003-agency-not-saas.md)

---

## Phase 1: Hire a VA / Contractor

### Signals you're ready
- Founder is spending >10 hours/week on admin tasks (content updates, lead triage, follow-ups)
- Lead volume exceeds what one person can qualify within 24 hours
- Case study backlog is growing because the founder can't write and sell at the same time

### Prerequisites
- Add RBAC: define "editor" role (can create/edit content, cannot delete or change settings)
- Add "review" status to case studies (so VA creates, founder approves) — see Gap 3C
- Document the SOP (see [`docs/SOP_Founder_Operations.md`](./SOP_Founder_Operations.md))
- Establish issue triage process (see [`docs/Triage_Process.md`](./Triage_Process.md))
- Share admin credentials via 1Password or similar (DO NOT share `.env.local`)

### Implementation notes
- RBAC can be implemented via Firebase Auth custom claims (`{ role: "editor" }`)
- Admin layout (`app/admin/(authenticated)/layout.tsx`) checks `role` claim and conditionally renders sidebar items
- Firestore security rules can enforce role-based write access per collection
- The VA uses the admin panel only — no access to codebase, deployment, or environment variables

---

## Phase 2: Add a Client Portal

### Signals you're ready
- Active clients ask for progress visibility ("Where is my project?")
- Founder is manually sending weekly update emails to multiple clients
- Revenue supports the engineering investment (portal is a retention feature, not an acquisition feature)

### Prerequisites
- Multi-tenant Firestore structure: `clients/{clientId}/` subcollections
- Client-specific auth (Firebase Auth with custom claims per client org)
- Dashboard embedding (read-only views of KPIs, workflow status)
- Weekly report delivery (cron job or scheduled Cloud Function)

### Implementation notes
- New route group: `app/portal/(authenticated)/` with separate layout and auth check
- Firestore rules: clients can only read their own subcollection (`request.auth.token.clientId == resource.data.clientId`)
- Consider a `client_plans` subcollection linking plans to client accounts
- Start minimal: a single page showing plan status + key metrics. Iterate based on client feedback.

---

## Phase 3: SaaS Product

### Signals you're ready
- Repeatable delivery process — most clients follow the same implementation steps
- Demand exceeds what the team can deliver manually (agency model bottlenecks on people)
- Clients are asking for self-serve access to the tools, not just the outputs

### Prerequisites
- Billing integration (Stripe Checkout + webhooks for subscription management)
- Usage metering (agent runs per month per client)
- Team management (invite/remove users, role assignment within an org)
- Data isolation (Firestore security rules per client — see [ADR-001](./ADR/001-firebase-over-supabase.md) for Firestore limitations)
- SOC 2 / compliance considerations (especially if targeting healthcare or finance verticals)

### Implementation notes
- This is a significant architectural change — see [ADR-003](./ADR/003-agency-not-saas.md) for context on why it was deferred
- Consider whether to evolve this codebase or start a new repo with shared agent logic extracted as a package
- Firebase Auth custom claims for org/team membership (`{ orgId, role }`)
- The preview plan flow becomes the core product — clients run their own audits and generate their own plans

---

## What to Build First When Scaling
1. **RBAC** — roles on Firebase Auth custom claims (unblocks Phase 1)
2. **Case study approval workflow** — draft -> review -> published (unblocks VA delegation)
3. **Automated follow-up triggers** — Cloud Function on `follow_up_at` date (reduces manual overhead)
4. **CI/CD pipeline** — GitHub Actions for automated deploy (see [`docs/CI_CD.md`](./CI_CD.md) future section)
5. **CRM sync** — start with webhook to HubSpot/ClickUp (reduces context-switching)
6. **Client portal** — read-only dashboard per client (unblocks Phase 2)
