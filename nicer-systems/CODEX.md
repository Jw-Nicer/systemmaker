# CODEX.md — Engineering Implementation Context (for Codex/AI Coding)

## Stack
- **Next.js 16.1.6** (App Router, Turbopack) + TypeScript (strict)
- **TailwindCSS v4** + CSS variables for theming
- **Framer Motion** for UI animations
- Canvas layer: HTML5 Canvas (brush reveal hero)
- Backend: **Firebase** (Auth + Firestore + Storage)
- Analytics: **PostHog** (client-side via `lib/analytics.ts`)
- AI: **Google Gemini** (@google/generative-ai) for agent chain
- Email: **Resend** for lead delivery + preview plans
- Hosting: **Firebase Hosting** + Cloud Functions (SSR, us-central1)

## Repo structure
/app
  /(marketing)
    page.tsx                   # Landing page (7 sections)
    contact/page.tsx           # Lead capture form
    case-studies/page.tsx      # Case study listing
    case-studies/[slug]/page.tsx # Case study detail
    privacy/page.tsx
    terms/page.tsx
  /admin
    login/page.tsx             # Login (unauthenticated)
    /(authenticated)
      layout.tsx               # Auth guard + sidebar
      page.tsx                 # Dashboard
      case-studies/page.tsx    # CRUD
      testimonials/page.tsx    # CRUD
      faqs/page.tsx            # CRUD
      offers/page.tsx          # CRUD
      leads/page.tsx           # Read + status + CSV export
      agent-templates/page.tsx # Markdown editor + test runner
      settings/page.tsx        # Theme customizer
  /api
    auth/session/route.ts
    auth/signout/route.ts
    leads/route.ts
    events/route.ts
    agent/run/route.ts
    agent/send-email/route.ts
/components
  /marketing     # Landing page section components
  /ui            # PostHogProvider
/lib
  /firebase      # admin.ts, auth.ts, client.ts
  /firestore     # case-studies.ts, faqs.ts, offers.ts, site-settings.ts
  /actions       # Server actions for admin CRUD
  /agents        # runner.ts, prompts.ts, email-template.ts
  analytics.ts
  theme.ts
  validation.ts
/types           # TypeScript interfaces
/hooks           # useReducedMotion
/agents          # Agent markdown specs
/docs            # Product specs
/scripts         # Seed scripts

## Conventions
- Keep marketing pages **server-rendered** where possible (SEO).
- Canvas effects load **client-side only**, lazy-loaded.
- Provide **reduced motion** support via `useReducedMotion` hook + `prefers-reduced-motion`.
- All admin routes require auth + server checks via `getSessionUser()`.
- Define analytics events in one place (`lib/analytics.ts`) and reuse.
- Firestore queries: always wrap in try/catch with empty array fallback.
- Admin CRUD uses Next.js server actions (in `lib/actions/`), not REST API routes.

## Security
- Firebase Auth (email/password) + HTTP-only session cookies.
- Firestore security rules enforce per-collection access control.
- Strict input validation on forms (Zod schemas in `lib/validation.ts`).
- Agent outputs must be filtered to avoid secrets, impersonation, or unsafe claims.

## Current status
- **Phase 0**: ✅ Complete (foundations)
- **Phase 1**: ✅ Complete (marketing site + CMS)
- **Phase 2**: ✅ Complete (agent demo + lead magnet + deployment)
- **Phase 3**: Not started (funnel optimization + variants)
- **Phase 4**: Not started (productized audit tool)
