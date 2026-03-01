# CODEX.md — Engineering Implementation Context (for Codex/AI Coding)

## Stack (default)
- **Next.js** (App Router) + TypeScript
- **TailwindCSS**
- **Framer Motion** for UI animations
- Canvas layer: **PixiJS** (preferred for 2D brush reveal) OR Three.js (if needed)
- Backend: **Supabase** (Auth + Postgres + Storage)
- Analytics: **PostHog** (preferred) or GA4 (with server-side event option)
- Email: Resend (or SendGrid) for lead delivery + sequences (Phase 2+)
- Scheduler: Calendly embed link (Phase 1), deeper integration later

## Repo structure (recommended)
/app
  /(marketing)
    page.tsx
    case-studies/page.tsx
    contact/page.tsx
  /admin
    layout.tsx
    page.tsx
    settings/page.tsx
    case-studies/page.tsx
/components
  /marketing
  /admin
  /ui
/lib
  supabase.ts
  analytics.ts
  theme.ts
  validation.ts
/agents (markdown files)
/docs (product specs)
/public (images, videos, fallback assets)

## Conventions
- Keep marketing pages **server-rendered** where possible (SEO).
- Canvas effects load **client-side only**, lazy-loaded.
- Provide **reduced motion** toggle + honors `prefers-reduced-motion`.
- All admin routes require auth + server checks.
- Define analytics events in one place (`lib/analytics.ts`) and reuse.

## Security basics
- Supabase Row Level Security (RLS) ON.
- Separate `public_content` and `private/admin` tables.
- Strict input validation on forms.
- Agent outputs must be filtered to avoid secrets, impersonation, or unsafe claims.

## MVP definition (Phase 1)
- Marketing landing (unique hero interaction + core sections)
- Proof-of-work CMS (Admin CRUD)
- Theme controls (colors + motion intensity)
- Contact + Book flow
- Funnel analytics events + UTM capture
