# Nicer Systems

A conversion-first marketing site and web app for **Nicer Systems**, an automation + lightweight internal apps agency for admin-heavy American businesses.

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16.1.6 (App Router, Turbopack) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 + CSS variables |
| Animation | Framer Motion 12.x |
| Backend | Firebase (Firestore, Auth, Storage) |
| AI | Google Gemini (@google/generative-ai) |
| Email | Resend (lead delivery + nurture sequences) |
| Analytics | PostHog (client-side) |
| Validation | Zod |
| Hosting | Firebase Hosting + Cloud Functions (SSR) |

## Getting Started

### Prerequisites
- Node.js 20+
- npm
- Firebase CLI (`npm i -g firebase-tools`)
- Firebase project with Auth, Firestore, and Storage enabled

### Setup

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your credentials:
   ```bash
   cp .env.example .env.local
   ```

   Required environment variables:
   - `NEXT_PUBLIC_FIREBASE_*` — Firebase client SDK config
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — Firebase Admin SDK
   - `GOOGLE_GEMINI_API_KEY` — Google AI Studio API key
   - `RESEND_API_KEY` — Resend email service
   - `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` — PostHog analytics

   Optional marketing variables:
   - `NEXT_PUBLIC_SCOPING_CALL_EMBED_URL` — inline scheduler iframe source for the contact page
   - `NEXT_PUBLIC_SCOPING_CALL_BOOKING_URL` — direct booking link used as a fallback/open-in-new-tab action

3. Seed initial data:
   ```bash
   npx tsx scripts/seed-firestore.ts     # Seed default site settings
   npm run seed:templates                 # Seed agent templates
   npx tsx scripts/seed-content.ts       # Seed FAQs, testimonials, offers
   npx tsx scripts/seed-variants.ts      # Seed industry variant pages
   ```

4. Start the dev server:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  (marketing)/     Public marketing pages (SSR)
  admin/           Admin CMS (auth-protected)
  api/             API routes (auth, leads, agent, plans, events)
components/
  marketing/       Landing page sections + chat UI
  ui/              Shared UI primitives
lib/
  firebase/        Admin SDK + Auth + Client init
  firestore/       Server-side Firestore queries
  actions/         Server actions for admin CRUD
  agents/          AI agent runner, chat, refinement
  email/           Nurture sequences + admin notifications
  leads/           Lead scoring
  security/        Rate limiting + request guards
hooks/             Custom React hooks
types/             TypeScript interfaces
agents/            Agent markdown specifications
docs/              Product specification documents
```

## Dev Commands

```bash
npm run dev              # Start Next.js dev server (port 3000)
npm run lint             # Run ESLint
npm run typecheck        # Run TypeScript type-checking
npm test                 # Run the test suite
npm run build            # Production build
```

## Repo Health

- `.env.example` documents the required runtime configuration.
- `npm run typecheck` generates Next route/layout types before running `tsc --noEmit`, so it works on a fresh clone.
- `npm run lint`, `npm run typecheck`, and `npm test` are the baseline verification commands.
- Firebase seed scripts are idempotent setup helpers for local/dev environments.

## Deployment

Deployed to **Firebase Hosting** with Cloud Functions for SSR.

```bash
npm run deploy           # Full Firebase deploy (hosting + functions)
npm run deploy:hosting   # Deploy hosting + SSR only
npm run deploy:rules     # Deploy Firestore security rules
npm run deploy:indexes   # Deploy Firestore indexes
```

- **URL**: https://nicer-systems.web.app
- **Region**: us-central1
- **Plan**: Firebase Blaze (pay-as-you-go)

## Key Features

- **Brush Reveal Hero** — Interactive canvas-based hero with brush masking effect
- **AI Agent Demo** — Multi-phase SSE streaming chat that generates preview plans
- **Plan Sharing** — Shareable public URLs for generated preview plans
- **Admin CMS** — Full CRUD for case studies, testimonials, FAQs, offers, variants
- **Leads CRM** — Lead scoring, activity timeline, follow-up reminders, CSV export
- **A/B Testing** — Experiment framework with variant bucketing and tracking
- **Email Automation** — 5-email nurture sequences via Resend
- **Theme Customization** — Admin-editable CSS variables (colors, glow, motion intensity)
- **Industry Variants** — Dynamic landing pages per industry vertical

## Documentation

Detailed product specs are in the `docs/` directory:
- `PRD.md` — Product requirements
- `Architecture.md` — System architecture
- `Data_Model.md` — Firestore schema
- `API_Spec.md` — API endpoints
- `Agents_Spec.md` — AI agent specifications
- `Phased_Implementation_Plan.md` — Build phases and status
- `Admin_Spec.md` — Admin panel specification
- `UI_UX_Spec.md` — UI/UX design specification
- `Analytics_Funnel.md` — Analytics and funnel tracking
- `Security_Privacy_Performance.md` — Security, privacy, and performance
- `Sitemap_Routes.md` — Sitemap and route definitions
- `User_Flows.md` — User flow diagrams
- `Backlog.md` — Prioritized backlog

AI assistant context files:
- `CLAUDE.md` — Shared context for Claude
- `CODEX.md` — Implementation context for Codex/AI coding
