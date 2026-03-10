# CI/CD & Deployment

## Current State (Manual)
- Deploy: `npm run deploy` from local machine
- Hosting: Firebase App Hosting (config in `apphosting.yaml`)
- Runtime: Node.js 22, 512MiB memory, 100 max concurrent
- Region: us-central1
- Secrets: All in `.env.local` locally, mapped in `apphosting.yaml` for production

## Pre-Deploy Checklist
1. Run `npm run typecheck` — runs `next typegen` then `tsc --noEmit`, zero errors required
2. Run `npm run test` — all unit tests pass (vitest)
3. Run `npm run build` — successful production build
4. Check `git status` — no uncommitted changes
5. Check Firestore indexes — `npm run deploy:indexes` if schema changed
6. Check security rules — `npm run deploy:rules` if access patterns changed

## Deploy Commands
```bash
npm run deploy           # Full Firebase deploy (hosting + functions)
npm run deploy:hosting   # Deploy hosting + SSR Cloud Function only
npm run deploy:rules     # Deploy Firestore security rules
npm run deploy:indexes   # Deploy Firestore indexes
```

## Environment Variables
All secrets are stored in `.env.local` for local development and mapped via `apphosting.yaml` for production.

**Server-side (private):**
- `FIREBASE_PROJECT_ID` — Firebase Admin SDK project identifier
- `FIREBASE_CLIENT_EMAIL` — Firebase Admin SDK service account email
- `FIREBASE_PRIVATE_KEY` — Firebase Admin SDK private key
- `GOOGLE_GEMINI_API_KEY` — AI agent chain (Gemini API)
- `RESEND_API_KEY` — Email delivery (nurture, notifications, plan delivery)
- `ADMIN_EMAIL` — Recipient for admin notification emails

**Client-side (public, prefixed `NEXT_PUBLIC_`):**
- `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` — Firebase Client SDK
- `NEXT_PUBLIC_POSTHOG_KEY` — PostHog analytics project key
- `NEXT_PUBLIC_POSTHOG_HOST` — PostHog analytics host URL

**Never commit `.env.local` to the repository.**

## Rollback Procedure
1. Identify the last good commit: `git log --oneline -10`
2. Create a rollback branch: `git checkout -b rollback/<description> <commit>`
3. Deploy from that branch: `npm run deploy`
4. Verify: load https://nicer-systems.web.app and check key pages (landing, contact, admin login)
5. Return to main: `git checkout main`
6. If the rollback is permanent, cherry-pick or revert the bad commit on `main`

## Post-Deploy Smoke Test
After every deploy, manually verify:
- [ ] Landing page loads (https://nicer-systems.web.app)
- [ ] Contact form submits without error
- [ ] Admin login works (https://nicer-systems.web.app/admin/login)
- [ ] Admin dashboard shows real data

## Production URL
- https://nicer-systems.web.app

## Test Suite
```bash
npm run test             # Unit tests (vitest)
npm run test:watch       # Unit tests in watch mode
npm run test:e2e         # End-to-end tests (Playwright)
npm run test:e2e:ui      # E2E tests with Playwright UI
```

## Future: GitHub Actions Pipeline (not yet implemented)
When ready to automate:
- Trigger: push to `main`
- Steps: install -> typecheck -> test -> build -> deploy
- Secrets: store Firebase service account + all env vars in GitHub Secrets
- Consider: preview deploys on PRs via Firebase preview channels
- Consider: running `npm run typecheck` and `npm run test` as PR checks to catch issues before merge
- Consider: E2E tests against preview deploy before promoting to production
