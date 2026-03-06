# CODEX.md — Engineering Implementation Context (for Codex/AI Coding)

## Stack
- **Next.js 16.1.6** (App Router, Turbopack) + TypeScript (strict)
- **TailwindCSS v4** + CSS variables for theming
- **Framer Motion ^12.34.3** for UI animations
- Canvas layer: HTML5 Canvas (brush reveal hero)
- Backend: **Firebase** (Auth + Firestore + Storage)
- AI: **Google Gemini** (@google/generative-ai ^0.24.1) for agent chain + chat
- Email: **Resend ^6.9.3** for lead delivery, preview plans, and nurture sequences
- Analytics: **PostHog** (client-side via `lib/analytics.ts`)
- Hosting: **Firebase Hosting** + Cloud Functions (SSR, us-central1)
- Validation: **Zod ^4.3.6**

## Repo structure
/app
  /(marketing)
    page.tsx                   # Landing page (7 sections)
    contact/page.tsx           # Lead capture form
    case-studies/page.tsx      # Case study listing
    case-studies/[slug]/page.tsx # Case study detail + related recommendations
    [industry]/page.tsx        # Industry variant landing pages
    plan/[id]/page.tsx         # Shareable preview plan (public)
    privacy/page.tsx
    terms/page.tsx
  /admin
    login/page.tsx             # Login (unauthenticated)
    /(authenticated)
      layout.tsx               # Auth guard + sidebar
      page.tsx                 # Dashboard (real metrics + recent leads)
      case-studies/page.tsx    # CRUD
      testimonials/page.tsx    # CRUD
      faqs/page.tsx            # CRUD
      offers/page.tsx          # CRUD
      leads/page.tsx           # Read + status filter + CSV export
      leads/[id]/page.tsx      # Lead detail + activity timeline + follow-up
      variants/page.tsx        # Landing variant CRUD (industry pages)
      experiments/page.tsx     # A/B testing management
      agent-templates/page.tsx # Markdown editor + test runner
      settings/page.tsx        # Theme customizer
  /api
    auth/session/route.ts
    auth/signout/route.ts
    leads/route.ts
    events/route.ts
    plans/route.ts             # GET: fetch plan by ID
    agent/run/route.ts         # POST: run agent chain
    agent/chat/route.ts        # POST: SSE streaming chat (multi-phase)
    agent/refine/route.ts      # POST: refine plan section
    agent/send-email/route.ts  # POST: send email via Resend
/components
  /marketing     # Landing page section components + chat UI
  /ui            # Shared UI primitives (Button, Input, Badge, GlassCard, GlitchText, GlowLine, SectionHeading, PostHogProvider)
/lib
  /firebase      # admin.ts, auth.ts, client.ts
  /firestore     # case-studies.ts, faqs.ts, offers.ts, site-settings.ts, variants.ts, experiments.ts, plans.ts
  /actions       # Server actions for admin CRUD (case-studies, testimonials, faqs, offers, leads, lead-activity, variants, experiments, agent-templates)
  /agents        # runner.ts, conversation.ts, prompts.ts, refinement.ts, email-template.ts
  /email         # nurture-sequence.ts, nurture-templates.ts, admin-notification.ts
  /leads         # scoring.ts (0-75 point lead scoring)
  /security      # request-guards.ts (rate limiting + validation)
  analytics.ts
  theme.ts
  validation.ts
/types           # TypeScript interfaces (case-study, faq, offer, testimonial, agent-template, preview-plan, variant, experiment, chat)
/hooks           # useReducedMotion, useExperiment, useSSEChat, useRefineSection
/agents          # Agent markdown specs (intake, workflow mapper, automation designer, dashboard designer, ops pulse writer)
/docs            # Product specs (PRD, Architecture, Data Model, API Spec, etc.)
/scripts         # Seed scripts (seed-agent-templates.ts, seed-firestore.ts)

## Conventions
- Keep marketing pages **server-rendered** where possible (SEO).
- Canvas effects load **client-side only**, lazy-loaded.
- Provide **reduced motion** support via `useReducedMotion` hook + `prefers-reduced-motion`.
- All admin routes require auth + server checks via `getSessionUser()`.
- Define analytics events in one place (`lib/analytics.ts`) and reuse.
- Firestore queries: always wrap in try/catch with empty array fallback.
- Admin CRUD uses Next.js server actions (in `lib/actions/`), not REST API routes.
- SSE streaming for agent chat uses `ReadableStream` with `text/event-stream` content type.
- Plan refinement preserves version history in the `versions[]` array on plan documents.

## Security
- Firebase Auth (email/password) + HTTP-only session cookies.
- Firestore security rules enforce per-collection access control.
- Strict input validation on forms (Zod schemas in `lib/validation.ts`).
- Agent outputs must be filtered to avoid secrets, impersonation, or unsafe claims.
- Rate limiting on agent endpoints (20 messages/10min for chat, 10 refines/10min).
- Request guards in `lib/security/request-guards.ts`.

## Current status
- **Phase 0**: ✅ Complete (foundations)
- **Phase 1**: ✅ Complete (marketing site + CMS)
- **Phase 2**: ✅ Complete (agent demo + lead magnet + deployment)
- **Phase 3**: ✅ Complete (funnel optimization + variants + leads CRM + email sequences + A/B testing)
- **Phase 4**: ✅ Complete (agent chat SSE streaming + plan sharing + section refinement)
- **Deferred**: CRM sync (ClickUp/HubSpot/Close), guided audit wizard, proposal generator
