# Architecture
**Doc Date:** 2026-02-27

## Overview
Two surfaces:
1) **Public Marketing** (SEO-first)
2) **Admin Web App** (authenticated CMS + settings + leads)

## High-level data flow
Visitor → Marketing site → (events + UTMs) → Lead capture → Email/CRM  
Admin → CMS updates → Publish → Public pages render

## Modules
### Public
- Landing sections
- Brush Reveal canvas module (client only)
- Proof-of-work components
- Agent demo (Phase 2)

### Admin
- Auth + session
- Content CRUD
- Theme editor
- Leads dashboard (Phase 2)

### Shared
- Theme tokens (CSS variables)
- Analytics event library
- Validation schemas
- Media upload helper

## Deployment
- Vercel (recommended)
- Supabase (managed backend)

## Performance strategy
- SSR marketing pages
- Canvas is lazy-loaded on interaction or after first paint
- Asset optimization via Next image/video
- Reduced-motion mode: disable continuous animation

## Error handling
- Client: safe fallbacks for canvas
- Server: structured logs for lead submissions and email delivery
