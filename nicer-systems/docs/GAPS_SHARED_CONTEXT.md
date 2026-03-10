# GAPS SHARED CONTEXT — 6-Terminal Parallel Work Plan
**Created:** 2026-03-10 | **Purpose:** Shared context for 6 Claude Code terminals working in parallel

> **IMPORTANT**: Each terminal owns ONE section. Do NOT modify files outside your assigned section unless coordinating via this doc. Read this entire document before starting work.

---

## Project Context (READ FIRST)

- **App**: Nicer Systems — automation + ops-visibility agency site
- **Stack**: Next.js 16 + TypeScript + Tailwind v4 + Firebase + Gemini AI + Resend
- **Repo root**: `nicer-systems/`
- **Canonical docs**: `docs/`, `agents/`, `CLAUDE.md`, `CODEX.md`
- **Admin panel**: `app/admin/(authenticated)/`
- **Marketing site**: `app/(marketing)/`
- **Types**: `types/`
- **Server actions**: `lib/actions/`
- **Firestore reads**: `lib/firestore/`
- **This is an agency site, not multi-tenant SaaS.** Clients don't log in. The admin (founder) operates everything.

---

## TERMINAL 1 — Web App Positioning Layer

### Owner scope
Files you may create/edit:
- `components/marketing/IsThisForYou.tsx` (new)
- `components/marketing/WhyNotDIY.tsx` (new)
- `app/(marketing)/page.tsx` (add new sections)
- `app/(marketing)/about/page.tsx` (new, optional)

### Gap 1A: Visitor-facing persona section
**Status**: Unaddressed — personas exist only in `docs/PRD.md` section 4, not on the live site.
**Spec**: Create an `IsThisForYou.tsx` component for the landing page.
- Three persona cards (from PRD):
  - **Ops Owner**: "I need fewer fire drills and visibility into work-in-progress."
  - **Founder/GM**: "I want predictable operations without micromanaging."
  - **Internal Admin**: "I need to update workflows without waiting on engineering."
- Each card: icon, role label, pain statement, what they get
- Place between `ProofOfWork` and `TestimonialsSection` in `page.tsx`
- Match existing design system: use `GlassCard` from `components/ui/`, `ScrollReveal` wrapper, CSS variables for theming
- Eyebrow text: "Is this for you?"
**Desired outcome**: A visitor landing on the page can self-identify within 10 seconds.

### Gap 1B: Competitive differentiation section
**Status**: Unaddressed — no mention of ClickUp/Airtable/Monday anywhere.
**Spec**: Create a `WhyNotDIY.tsx` component.
- Do NOT name competitors directly (avoid dating the content). Frame as categories:
  - "Generic project tools" (ClickUp, Monday, Asana category)
  - "Spreadsheet/database tools" (Airtable, Google Sheets category)
  - "Automation platforms" (Zapier, Make category)
- Three-column comparison table or card layout:
  - Column 1: "DIY with generic tools" — you configure, you maintain, you troubleshoot
  - Column 2: "Hire a consultant" — expensive, slow, no system left behind
  - Column 3: "Nicer Systems" — scoped to one bottleneck, preview before build, system you own
- Place after `HowItWorks` section in `page.tsx`
- Eyebrow: "Why this instead"
**Desired outcome**: Visitor understands the positioning gap without needing a sales call.

### References
- Existing personas: `docs/PRD.md` section 4
- Brand voice: Clear, confident, practical. No hype. See `CLAUDE.md` brand voice section.
- Design system: `components/ui/` (GlassCard, SectionHeading, ScrollReveal, Badge)
- Landing page assembly: `app/(marketing)/page.tsx`

---

## TERMINAL 2 — Productized Onboarding Layer (Guided Audit Completion)

### Owner scope
Files you may create/edit:
- `app/(marketing)/audit/page.tsx`
- `components/marketing/GuidedAuditWizard.tsx`
- `lib/guided-audit.ts`
- `app/api/agent/audit/route.ts`
- `types/audit.ts`

### Gap 2A: Complete the Guided Audit Wizard
**Status**: Deferred in Phase 4 backlog. The component file exists but is listed as deferred.
**Spec**: The Guided Audit should be a 4-step wizard that produces a full preview plan.

**Step 1 — Context** (fields):
- `industry` (select: Property Management, E-commerce, Professional Services, Healthcare, Construction/Field Services, Other)
- `workflow_type` (select from `AUDIT_WORKFLOW_TYPES`: Intake & Onboarding, Scheduling & Dispatch, Billing & Invoicing, Reporting & Compliance, Maintenance & Renewals, Customer Support, Inventory & Procurement)
- `team_size` (select: 1-5, 6-15, 16-50, 50+)
- `stack_maturity` (select: Spreadsheets only, Some tools no integration, Multiple tools partially connected, Established stack needs optimization)

**Step 2 — Breakpoints** (fields):
- `bottleneck` (textarea, required, min 20 chars): "Describe the biggest operational bottleneck"
- `manual_steps` (textarea): "What steps are still done manually?"
- `handoff_breaks` (textarea): "Where do handoffs between people or tools break down?"
- `visibility_gap` (textarea): "What can't you see or measure right now?"

**Step 3 — Operating Load** (fields):
- `current_tools` (multi-select chips: Excel, Google Sheets, Email, Slack, QuickBooks, Airtable, HubSpot, ServiceTitan, Jobber, Custom software)
- `volume` (text): "Approximate monthly volume (tickets, orders, jobs, etc.)"
- `urgency` (select: Low, Medium, High, Urgent)
- `time_lost_per_week` (select: <2 hours, 2-5 hours, 5-10 hours, 10+ hours)
- `compliance_notes` (textarea, optional): "Any regulatory or compliance constraints?"

**Step 4 — Target State** (fields):
- `desired_outcome` (textarea, required): "What does success look like in 90 days?"
- Review panel showing all prior answers as a summary snapshot

**On submit**:
1. POST to `/api/agent/audit` with all fields
2. Run the full agent chain (intake → workflow_mapper → automation_designer → dashboard_designer → ops_pulse_writer)
3. Store result in `plans` collection with `source: "guided_audit"`
4. Create lead record (email capture on results screen)
5. Display shareable preview plan at `/plan/[id]`

**Desired outcome**: A visitor completes a structured 4-step intake and receives a full preview plan — more thorough than the chat flow, designed for serious buyers.

### Gap 2B: Surface the Guided Audit prominently
- Add a visible CTA in the `SeeItWork` section: "Prefer a structured format? Try the Guided Audit →"
- Add to the `FinalCTA` section as secondary button
- Add to the contact page as Option 2

### References
- Agent chain: `lib/agents/runner.ts`, `lib/agents/prompts.ts`
- Plan storage: `lib/firestore/plans.ts`
- Lead creation: `app/api/leads/route.ts`, `lib/leads/scoring.ts`
- Existing chat flow: `lib/agents/conversation.ts` (for pattern reference)
- Existing types: `types/preview-plan.ts`, `types/audit.ts`

---

## TERMINAL 3 — Proof-of-Work Capture Layer

### Owner scope
Files you may create/edit:
- `types/case-study.ts` (modify)
- `lib/validation.ts` (modify case study schema)
- `lib/actions/case-studies.ts` (modify)
- `components/marketing/ProofOfWorkClient.tsx` (modify filters)
- `app/admin/(authenticated)/case-studies/CaseStudiesManager.tsx` (modify form)
- `docs/Data_Model.md` (update)

### Gap 3A: Add workflow_type field to case studies
**Status**: Unaddressed — PRD mentions workflow filter in gallery but field doesn't exist.
**Spec**:
- Add `workflow_type` field to `CaseStudy` interface in `types/case-study.ts`
- Type: `string` — values should match the audit wizard's `AUDIT_WORKFLOW_TYPES` enum for consistency:
  `"intake_onboarding" | "scheduling_dispatch" | "billing_invoicing" | "reporting_compliance" | "maintenance_renewals" | "customer_support" | "inventory_procurement" | "other"`
- Add to Zod schema in `lib/validation.ts`
- Add select dropdown in admin CaseStudiesManager form
- Add as filter chip row in `ProofOfWorkClient.tsx` (below existing industry filter)
- Update `docs/Data_Model.md` case_studies section
**Desired outcome**: Case studies are filterable by both industry AND workflow type on the public gallery.

### Gap 3B: Add result_category tags to case studies
**Status**: Unaddressed — results are free-text metrics only.
**Spec**:
- Add `result_categories` field to `CaseStudy` interface: `string[]`
- Predefined categories: `"time_saved" | "error_reduction" | "cost_reduction" | "visibility_gained" | "throughput_increase" | "compliance_achieved"`
- Display as small badges on case study cards (after industry tag)
- Add multi-select checkboxes in admin form
- Add as optional filter in `ProofOfWorkClient.tsx`
- Update `docs/Data_Model.md`
**Desired outcome**: Visitors can filter case studies by what kind of result was achieved.

### Gap 3C: Add approval workflow
**Status**: Partially addressed — binary `is_published` only.
**Spec**:
- Replace `is_published: boolean` with `status: "draft" | "review" | "published" | "archived"`
- Admin list shows status badge (color-coded): draft=gray, review=yellow, published=green, archived=red
- "Review" status means "ready for final check before publish" — useful when delegating to a VA or team member later
- Migration: treat existing `is_published: true` → `status: "published"`, `false` → `status: "draft"`
- Public queries filter on `status === "published"` (same behavior as before)
- Update Firestore rules: public read where `status == "published"`
- Update `docs/Data_Model.md`
**Desired outcome**: Case studies have a clear lifecycle (draft → review → published → archived) instead of a binary toggle.

### Gap 3D: Add published_at timestamp
**Status**: Unaddressed.
**Spec**:
- Add `published_at: string | null` to `CaseStudy` interface
- Set automatically when status changes to `"published"` for the first time
- Display on case study detail page as "Published [date]"
- Useful for sorting "newest case studies" on the public site
**Desired outcome**: Track when a case study went live, separate from when it was created.

### References
- Current type: `types/case-study.ts` (16 lines, simple interface)
- Current schema: `lib/validation.ts` (search for `caseStudySchema`)
- Admin CRUD: `app/admin/(authenticated)/case-studies/CaseStudiesManager.tsx`
- Public gallery: `components/marketing/ProofOfWorkClient.tsx`
- Firestore rules: `firestore.rules`
- Data model docs: `docs/Data_Model.md`

---

## TERMINAL 4 — Conversion System Fixes

### Owner scope
Files you may create/edit:
- `lib/leads/scoring.ts` (fix)
- `lib/email/nurture-sequence.ts` (modify)
- `lib/email/nurture-templates.ts` (modify)
- `lib/email/confirmation-email.ts` (new)
- `app/api/leads/route.ts` (modify)
- `app/(marketing)/contact/page.tsx` (modify)
- `components/marketing/FinalCTA.tsx` (modify)
- `docs/Data_Model.md` (update if fields change)

### Gap 4A: Fix lead scoring urgency mismatch
**Status**: Bug — scoring checks `"critical"` but forms only allow `"urgent"`.
**Spec**:
- In `lib/leads/scoring.ts` line 19: change `case "critical"` to `case "urgent"`
- This is a one-line fix. The form sends `"urgent"`, scoring should match.
- Current scoring: critical=20, high=15, medium=10, low=5
- Fixed scoring: urgent=20, high=15, medium=10, low=5
**Desired outcome**: Urgent leads correctly receive 20 points instead of 0.

### Gap 4B: Add lead confirmation email
**Status**: Unaddressed — listed as deferred in backlog ("Confirmation email: next steps + what to bring").
**Spec**:
- Create `lib/email/confirmation-email.ts`
- Send immediately when a lead is created via contact form or guided audit
- Content:
  - Subject: "We got your details — here's what happens next"
  - Body: Thank the lead by name, confirm what they submitted (bottleneck summary), explain next steps:
    1. "We'll review your submission within 24 hours"
    2. "If it's a fit, we'll send a calendar link for a 45-minute scoping call"
    3. "On the call: we'll map one workflow end-to-end and define deliverables"
  - Include link to their preview plan if `plan_id` exists
  - Footer: "Reply to this email if you have questions"
- Call from `app/api/leads/route.ts` after lead creation (fire-and-forget, same pattern as nurture enrollment)
- From address: `"Nicer Systems <onboarding@resend.dev>"` (match nurture)
**Desired outcome**: Every lead gets an immediate confirmation email setting expectations.

### Gap 4C: Add unsubscribe to nurture emails
**Status**: Unaddressed — no unsubscribe mechanism.
**Spec**:
- Add an unsubscribe link to the footer of every nurture email template in `lib/email/nurture-templates.ts`
- Create `app/api/leads/unsubscribe/route.ts`:
  - GET handler with query param `?token=<lead_id_hash>`
  - Hashes the lead_id with a secret to prevent enumeration
  - Sets `nurture_unsubscribed: true` on the lead doc
  - Returns a simple HTML page: "You've been unsubscribed from Nicer Systems emails."
- In `enrollInNurture()`: check `nurture_unsubscribed` before scheduling
- Add `nurture_unsubscribed: boolean` to lead type and data model
**Desired outcome**: Leads can opt out. Required for email compliance.

### Gap 4D: Replace mailto with proper booking
**Status**: Partially addressed — "Book a Scoping Call" CTA uses `mailto:`.
**Spec**:
- In `app/(marketing)/contact/page.tsx`: replace the mailto link with an external calendar link
- Use a `NEXT_PUBLIC_BOOKING_URL` env variable (so the founder can set Calendly/Cal.com/etc.)
- Fallback to mailto if env var is not set
- Update the CTA text to include "Schedule a 45-minute call" with a calendar icon
- Apply same pattern in `components/marketing/FinalCTA.tsx` and `components/marketing/BrushRevealHero.tsx`
- Track click with existing `EVENTS.BOOKING_CLICK` event
**Desired outcome**: Leads can self-schedule without email back-and-forth.

### References
- Lead scoring: `lib/leads/scoring.ts` (38 lines)
- Nurture: `lib/email/nurture-sequence.ts` (77 lines), `lib/email/nurture-templates.ts`
- Lead creation API: `app/api/leads/route.ts`
- Admin notification pattern: `lib/email/admin-notification.ts` (use as template)
- Contact page: `app/(marketing)/contact/page.tsx`

---

## TERMINAL 5 — Internal Operations Layer

### Owner scope
Files you may create/edit:
- `docs/SOP_Founder_Operations.md` (new)
- `docs/Weekly_Review_Template.md` (new)
- `docs/Triage_Process.md` (new)
- `lib/actions/leads.ts` (modify for pipeline stages)
- `types/lead.ts` (modify)
- `app/admin/(authenticated)/leads/LeadsManager.tsx` (modify)
- `docs/Data_Model.md` (update)

### Gap 5A: Founder operations SOP
**Status**: Unaddressed — no operational documentation for the solo founder.
**Spec**: Create `docs/SOP_Founder_Operations.md` with:

```markdown
# Founder Operations SOP

## Daily (15 min)
- [ ] Check admin dashboard for new leads (score ≥50 = immediate action)
- [ ] Review overdue follow-ups widget
- [ ] Respond to any leads with score ≥50 within 4 hours

## Weekly (Friday, 45 min)
- [ ] Review all leads from the week (status: new → qualified or unqualified)
- [ ] Update follow-up dates for qualified leads
- [ ] Check nurture email performance (Resend dashboard)
- [ ] Review A/B experiment results (if running)
- [ ] Publish any draft case studies that are ready
- [ ] Check PostHog for landing page conversion trends
- [ ] Update implementation tracker for active clients

## Monthly (1st Monday, 60 min)
- [ ] Review lead-to-close conversion rate
- [ ] Update case studies with new client results
- [ ] Review and update agent templates if patterns emerge
- [ ] Check for stale "qualified" leads (>14 days without follow-up)
- [ ] Archive completed leads older than 90 days

## What's Automated vs Manual
| Process | Status | Tool |
|---------|--------|------|
| Lead capture | Automated | Firestore via API |
| Lead scoring | Automated | `lib/leads/scoring.ts` |
| Nurture emails (4-email) | Automated | Resend scheduledAt |
| Admin notification on new lead | Automated | Resend |
| Lead qualification | Manual | Admin dashboard |
| Follow-up scheduling | Manual | Admin lead detail |
| Scoping call booking | Manual | Email/calendar |
| Case study creation | Manual | Admin CMS |
| A/B experiment analysis | Manual | Admin experiments |
| Client implementation | Manual | Offline delivery |
```

**Desired outcome**: The founder has a documented operating rhythm instead of ad-hoc work.

### Gap 5B: Weekly review template
**Status**: Unaddressed.
**Spec**: Create `docs/Weekly_Review_Template.md`:
- Section 1: **Pipeline snapshot** — count leads by status, total score distribution
- Section 2: **This week's wins** — new qualified leads, booked calls, closed deals
- Section 3: **Stuck items** — leads with no activity >7 days, overdue follow-ups
- Section 4: **Content status** — draft case studies, pending testimonials
- Section 5: **Experiments** — running A/B tests, any ready to call
- Section 6: **Next week priorities** — top 3 actions
**Desired outcome**: A reusable template the founder fills out every Friday.

### Gap 5C: Issue triage process
**Status**: Unaddressed.
**Spec**: Create `docs/Triage_Process.md`:
- Define 3 categories: Bug, Feature Request, Content Update
- Define priority: P0 (blocks revenue/leads), P1 (degrades experience), P2 (nice to have)
- Define where issues live: GitHub Issues on the repo (use labels: `bug`, `feature`, `content`, `p0`, `p1`, `p2`)
- Template for bug reports: steps to reproduce, expected vs actual, screenshots
- Template for feature requests: problem statement, proposed solution, impact estimate
- Rule: P0 = fix same day, P1 = fix within 1 week, P2 = backlog review monthly
**Desired outcome**: A lightweight triage process that scales when hiring a VA or contractor.

### Gap 5D: Expand lead statuses for pipeline clarity
**Status**: Partially addressed — only 5 statuses, no "nurture" or "later" disposition.
**Spec**:
- Add two new statuses to the lead pipeline: `"nurture"` and `"lost"`
  - `nurture` = "Not ready now, keep in sequence" (different from unqualified — these are potential fits)
  - `lost` = "Was qualified but chose competitor / went silent / explicitly declined"
- Update `VALID_STATUSES` in lead validation
- Update status filter tabs in `LeadsManager.tsx`
- Update status dropdown in lead detail
- Add status badge colors: nurture=purple, lost=gray
- Update `docs/Data_Model.md`
**Desired outcome**: The founder can distinguish between "not a fit" and "not right now" and "was a fit but lost."

### References
- Lead statuses: search for `VALID_STATUSES` in `lib/validation.ts`
- Leads manager: `app/admin/(authenticated)/leads/LeadsManager.tsx`
- Lead detail: `app/admin/(authenticated)/leads/[id]/LeadDetail.tsx`
- Lead type: `types/lead.ts`
- Admin dashboard: `app/admin/(authenticated)/page.tsx`

---

## TERMINAL 6 — Product Architecture Docs

### Owner scope
Files you may create/edit:
- `docs/ADR/` directory (new)
- `docs/ADR/001-firebase-over-supabase.md` (new)
- `docs/ADR/002-gemini-over-openai.md` (new)
- `docs/ADR/003-agency-not-saas.md` (new)
- `docs/ADR/004-resend-for-email.md` (new)
- `docs/CI_CD.md` (new)
- `docs/Scaling_Playbook.md` (new)
- `CLAUDE.md` (minor updates to reference new docs)

### Gap 6A: Architecture Decision Records
**Status**: Unaddressed — no ADRs exist.
**Spec**: Create `docs/ADR/` directory with 4 initial records. Use this format per ADR:

```markdown
# ADR-NNN: [Title]
**Date:** 2026-03-10 | **Status:** Accepted

## Context
[What problem or decision was being faced]

## Decision
[What was decided]

## Consequences
[What are the trade-offs, both positive and negative]

## Alternatives Considered
[What else was evaluated and why it was rejected]
```

**ADR-001: Firebase over Supabase**
- Context: Needed auth, database, storage, hosting for a single-tenant agency site
- Decision: Firebase (Firestore + Auth + Storage + App Hosting)
- Consequences: (+) zero-config hosting with SSR via Cloud Functions, generous free tier, familiar to founder. (-) Vendor lock-in, no SQL, no built-in row-level security policies like Supabase
- Alternatives: Supabase (was in original spec, switched due to simpler deployment model), PlanetScale + Vercel (more moving parts)

**ADR-002: Google Gemini over OpenAI**
- Context: Needed LLM for agent chain (intake → workflow → automation → dashboard → ops pulse)
- Decision: Google Gemini via `@google/generative-ai` SDK
- Consequences: (+) Lower cost per token, good structured output, aligns with Firebase ecosystem. (-) Smaller ecosystem, less community tooling than OpenAI
- Alternatives: OpenAI GPT-4 (higher cost, no Firebase synergy), Claude (strong but separate billing)

**ADR-003: Agency model, not multi-tenant SaaS**
- Context: Product could be a self-serve SaaS or a done-for-you agency with a productized intake
- Decision: Agency model — clients don't log in. The app generates preview plans and captures leads. Implementation is done offline.
- Consequences: (+) Ship faster, no RBAC/multi-tenant complexity, higher per-deal revenue. (-) Doesn't scale without hiring, no recurring SaaS revenue, no client portal
- Alternatives: Multi-tenant SaaS (deferred to future phase per backlog)

**ADR-004: Resend for transactional email**
- Context: Needed transactional email for nurture sequences, admin notifications, plan delivery
- Decision: Resend with `scheduledAt` for nurture timing
- Consequences: (+) Simple API, built-in scheduling, generous free tier. (-) No built-in unsubscribe management, no open/click tracking in free tier
- Alternatives: SendGrid (heavier, more features than needed), AWS SES (complex setup)

**Desired outcome**: Future contributors (or AI agents) understand WHY the stack is what it is.

### Gap 6B: CI/CD documentation
**Status**: Unaddressed — deploys are manual `npm run deploy` from local.
**Spec**: Create `docs/CI_CD.md`:

```markdown
# CI/CD & Deployment

## Current State (Manual)
- Deploy: `npm run deploy` from local machine
- Hosting: Firebase App Hosting (config in `apphosting.yaml`)
- Runtime: Node.js 22, 512MiB memory, 100 max concurrent
- Region: us-central1
- Secrets: All in `.env.local` locally, mapped in `apphosting.yaml` for production

## Pre-Deploy Checklist
1. Run `npx tsc --noEmit` — zero errors
2. Run `npm run build` — successful build
3. Check `git status` — no uncommitted changes
4. Check Firestore indexes — `npm run deploy:indexes` if schema changed
5. Check security rules — `npm run deploy:rules` if access patterns changed

## Rollback Procedure
1. Identify the last good commit: `git log --oneline -10`
2. Checkout: `git checkout <commit>`
3. Deploy: `npm run deploy`
4. Verify: check https://nicer-systems.web.app
5. Return to main: `git checkout main`

## Future: GitHub Actions Pipeline (not yet implemented)
When ready to automate:
- Trigger: push to `main`
- Steps: install → type-check → build → deploy
- Secrets: store Firebase service account + Resend key in GitHub Secrets
- Consider: preview deploys on PRs via Firebase preview channels
```

**Desired outcome**: Anyone deploying the app has a clear checklist and rollback procedure.

### Gap 6C: Scaling playbook
**Status**: Unaddressed.
**Spec**: Create `docs/Scaling_Playbook.md`:

```markdown
# Scaling Playbook

## Current Architecture (Solo Founder)
- Single admin user (Firebase Auth email/password)
- All content managed via admin panel
- Leads managed via admin dashboard
- Agent templates edited via admin UI
- Manual deploy from local

## Phase: Hire a VA / Contractor
Prerequisites:
- Add RBAC: define "editor" role (can create/edit content, cannot delete or change settings)
- Add "review" status to case studies (so VA creates, founder approves)
- Document the SOP (see `docs/SOP_Founder_Operations.md`)
- Share admin credentials via 1Password or similar (DO NOT share .env.local)

## Phase: Add a Client Portal
Prerequisites:
- Multi-tenant Firestore structure: `clients/{clientId}/` subcollections
- Client-specific auth (Firebase Auth with custom claims)
- Dashboard embedding (read-only views of KPIs, workflow status)
- Weekly report delivery (cron job or scheduled Cloud Function)

## Phase: SaaS Product
Prerequisites:
- Billing integration (Stripe)
- Usage metering (agent runs per month)
- Team management (invite/remove users, role assignment)
- Data isolation (Firestore security rules per client)
- SOC 2 / compliance considerations

## What to Build First When Scaling
1. RBAC (roles on Firebase Auth custom claims)
2. Case study approval workflow (draft → review → published)
3. Automated follow-up triggers (Cloud Function on follow_up_at date)
4. CRM sync (start with webhook to ClickUp/HubSpot)
5. Client portal (read-only dashboard per client)
```

**Desired outcome**: A roadmap for scaling from solo founder to team to SaaS, with clear prerequisites at each stage.

### References
- Current CLAUDE.md: `nicer-systems/CLAUDE.md` (250 lines)
- Architecture: `docs/Architecture.md`
- Backlog deferred items: `docs/Backlog.md`
- App hosting config: `apphosting.yaml`
- Deploy commands: `package.json` scripts section

---

## COORDINATION RULES

1. **Do not modify shared files simultaneously.** If two terminals need to edit the same file (e.g., `docs/Data_Model.md`), Terminal 3 owns schema changes and Terminal 5 owns lead status changes. Coordinate by editing different sections of the file.

2. **Shared files ownership:**
   | File | Terminal 3 edits | Terminal 4 edits | Terminal 5 edits |
   |------|-----------------|-----------------|-----------------|
   | `docs/Data_Model.md` | case_studies section | — | leads section |
   | `types/lead.ts` | — | add `nurture_unsubscribed` | add statuses |
   | `lib/validation.ts` | case study schema | — | lead status enum |
   | `app/(marketing)/page.tsx` | — (Terminal 1 owns) | — | — |

3. **Type changes**: If you add a field to a type, also update `docs/Data_Model.md` in your assigned section.

4. **Testing**: After making changes, run `npx tsc --noEmit` to verify TypeScript compiles. Do NOT run `npm run build` simultaneously across terminals.

5. **Commits**: Each terminal should commit independently with a clear prefix:
   - T1: `feat(positioning): ...`
   - T2: `feat(onboarding): ...`
   - T3: `feat(case-studies): ...`
   - T4: `fix(conversion): ...`
   - T5: `feat(ops): ...` or `docs(ops): ...`
   - T6: `docs(architecture): ...`

6. **Branch strategy**: All terminals work on `main`. If conflicts arise, the terminal that committed first wins — the second terminal rebases.
