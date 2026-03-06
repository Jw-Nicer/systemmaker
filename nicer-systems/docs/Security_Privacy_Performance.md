# Security, Privacy, Performance
**Doc Date:** 2026-02-27 | **Updated:** 2026-03-05

## Security
- Admin auth required (Firebase Auth email/password + HTTP-only session cookies)
- Firestore security rules enforce read/write permissions per collection (see `firestore.rules`)
- Server-side auth checks for all admin routes via `getSessionUser()` in layout
- Input validation (Zod schemas in `lib/validation.ts`) on all forms and API endpoints
- Rate limiting on agent endpoints (20 messages/10min chat, 10 refines/10min) via `lib/security/request-guards.ts`
- Agent outputs filtered to avoid secrets, impersonation, or unsafe claims
- Lead creation restricted to specific fields only (Firestore rules)
- No exposed Firebase Admin credentials on client side

## Privacy
- Minimal PII: name, email, company
- Store UTMs + page path for attribution (sessionStorage-based UTM capture)
- Privacy policy at `/privacy` and terms at `/terms`
- Lead data accessible only to authenticated admins
- Plans can be public or private (controlled by `is_public` flag)

## Performance
- Server-rendered marketing pages (Next.js Server Components for SEO)
- Lazy-load canvas modules (brush reveal loaded on interaction or after first paint)
- Images set to unoptimized mode (Firebase Hosting has no image optimizer)
- Avoid blocking scripts
- Reduced motion support via `useReducedMotion` hook + CSS `prefers-reduced-motion`
- Animation throttling with CSS variable `--theme-motion-intensity`
- Framer Motion animations with `AnimatePresence` for clean mount/unmount
- SSE streaming for agent chat (progressive rendering, no full-page reload)

## Accessibility
- Keyboard-accessible navigation
- Focus states on all interactive elements
- ARIA attributes for accordion/FAQ components
- Color contrast checks
- Reduced motion fallbacks for all animations
