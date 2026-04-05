# CI/CD & Deployment

## Current State (Manual)
- Deploy: `npm run deploy` from local machine
- Hosting: Firebase Hosting with a framework-aware SSR backend via `firebase deploy`
- Runtime: Node.js 22, 512MiB memory, 100 max concurrent
- Region: us-central1
- Production backend: pinned SSR function `firebase-frameworks-nicer-systems:ssrnicersystems`
- Secrets/config: local development uses `.env.local`; the live runtime must not depend on `apphosting.yaml` secrets unless the site is explicitly migrated to Firebase App Hosting

## Pre-Deploy Checklist
1. Run `npm run lint`
2. Run `npm run typecheck` — wraps `next typegen` + `tsc --noEmit` and retries once for the intermittent `.next/types/cache-life.d.ts` generation race
3. Run `npm run test` — all unit tests pass (vitest)
4. Run `npm run build` — successful production build
5. Run `npm run test:e2e` for route-critical or UX-critical changes
6. Check `git status` — no uncommitted changes
7. Check Firestore indexes — `npm run deploy:indexes` if schema changed
8. Check security rules — `npm run deploy:rules` if access patterns changed

## Deploy Commands
```bash
npm run deploy           # Full Firebase deploy (hosting + functions)
npm run deploy:hosting   # Deploy hosting + SSR Cloud Function only
npm run deploy:rules     # Deploy Firestore security rules
npm run deploy:indexes   # Deploy Firestore indexes
```

### Predeploy Hook
`firebase.json` includes a `predeploy` hook that runs `scripts/fix-turbopack-externals.js` before every deploy. This patches Turbopack's hashed `firebase-admin` module names (e.g. `firebase-admin-a14c8a5423a75469` → `firebase-admin`) in both `.next/server/` and `.firebase/nicer-systems/functions/.next/server/`. Without this, all dynamic SSR routes (admin pages, API routes) crash with `ERR_MODULE_NOT_FOUND`. See Known Issue P8 in `docs/KNOWN_ISSUES.md`.

Do NOT remove this hook until Turbopack fixes the upstream bug.

## Environment Variables
All secrets are stored in `.env.local` for local development.

For the current live deploy path, the server runtime should work without requiring the Firebase Admin service-account values to be injected into production. The deployed SSR backend can use Firebase/GCP application default credentials for Admin SDK access. `apphosting.yaml` documents a future App Hosting environment, but it is not the source of truth for the current production deployment.

**Server-side (private):**
- `FIREBASE_PROJECT_ID` — Firebase Admin SDK project identifier
- `FIREBASE_CLIENT_EMAIL` — Firebase Admin SDK service account email
- `FIREBASE_PRIVATE_KEY` — Firebase Admin SDK private key (must use `-----BEGIN PRIVATE KEY-----` header; wrapping quotes are auto-stripped by `admin.ts`)
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
- https://nicersystems.com
- https://nicer-systems.web.app

## Test Suite
```bash
npm run test             # Unit tests (vitest)
npm run test:watch       # Unit tests in watch mode
npm run test:e2e         # End-to-end tests (Playwright, isolated dev server on port 3217 by default)
npm run test:e2e:ui      # E2E tests with Playwright UI
```

## Local Test Environment Notes
- `npm run dev` uses port `3000` by default for normal local development.
- Playwright uses its own dedicated dev server and port so it cannot accidentally attach to another Next.js project already running locally.
- Override the E2E port with `PLAYWRIGHT_PORT=<port>` when running multiple Playwright sessions in parallel.

## Future: GitHub Actions Pipeline (not yet implemented)
When ready to automate:
- Trigger: push to `main`
- Steps: install -> typecheck -> test -> build -> deploy
- Secrets: store Firebase service account + all env vars in GitHub Secrets
- Consider: preview deploys on PRs via Firebase preview channels
- Consider: running `npm run typecheck` and `npm run test` as PR checks to catch issues before merge
- Consider: E2E tests against preview deploy before promoting to production
