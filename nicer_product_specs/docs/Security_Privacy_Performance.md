# Security, Privacy, Performance
**Doc Date:** 2026-02-27

## Security
- Admin auth required (Supabase)
- RLS enabled on all tables
- Server-side checks for admin routes
- Input validation (zod) on all forms
- Rate limit lead submissions (edge middleware or API)
- Captcha optional (Phase 1.5)

## Privacy
- Minimal PII: name, email, company
- Store UTMs + page path for attribution
- Privacy policy and contact details

## Performance
- Lazy-load canvas modules
- Next Image optimization
- Avoid blocking scripts
- Reduced motion support

## Accessibility
- Keyboard-accessible navigation
- Focus states
- ARIA for accordion/FAQ
- Color contrast checks
