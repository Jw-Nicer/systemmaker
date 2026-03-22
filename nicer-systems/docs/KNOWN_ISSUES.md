# Known Issues & Lessons Learned

**Purpose**: Central registry of all bugs, mistakes, and patterns found during QA and development. Every AI agent and developer MUST read this file before making changes to avoid repeating past mistakes.

**Updated**: 2026-03-21

---

## How to Use This File

1. **Before starting work**: Scan the "Active Patterns to Avoid" section
2. **When fixing a bug**: Add it to the registry with root cause and fix
3. **During QA**: Use the "Pre-Deploy QA Checklist" at the bottom
4. **After each QA cycle**: Update the "Resolved" section and add new patterns

---

## Active Patterns to Avoid

These are recurring mistakes. Check every time before deploying.

### P1: Firestore-dependent sections return null when collections are empty

**Pattern**: Server components that fetch from Firestore and return `null` when no documents exist. This kills anchor targets (`#pricing`, `#faq`) and breaks nav links.

**Rule**: Every section component MUST render its `<section id="...">` wrapper regardless of data. Show a fallback UI when empty — never return `null`.

**Affected files**:
- `components/marketing/FAQSection.tsx` — Fixed: always renders `id="faq"` with fallback card
- `components/marketing/PricingSection.tsx` — Has "bespoke" fallback, renders `id="pricing"`
- `components/marketing/TestimonialsSection.tsx` — Renders `id="testimonials"`
- `components/marketing/ProofOfWork.tsx` — Has hardcoded fallback data

**How to check**: Visit the live site, open DevTools, run:
```js
['hero','see-it-work','pricing','faq','testimonials','how-it-works'].forEach(id => {
  console.log(`#${id}:`, document.getElementById(id) ? 'EXISTS' : 'MISSING');
});
```

---

### P2: Variant sections.hero overrides top-level fields

**Pattern**: `normalizeVariantSections()` in `lib/marketing/variant-content.ts` checks `sections.hero.headline` BEFORE `variant.headline`. If `sections.hero` exists with bad data, fixing top-level `headline` has no effect.

**Rule**: When fixing variant content, always check AND fix both:
1. Top-level fields: `variant.headline`, `variant.subheadline`, `variant.cta_text`
2. Nested fields: `variant.sections.hero.headline`, `variant.sections.hero.subheadline`

**Past occurrence**: `seed-content.ts` fixed top-level `headline` ("Automate you healthcare" → "Automate your healthcare operations") but `sections.hero.headline` still had the typo. Required a second fix in `seed-variants.ts`.

**How to check**: Run this query to audit all variants:
```bash
node -e "
require('dotenv').config({ path: '.env.local' });
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\\\n/g, '\\n') }) });
getFirestore().collection('variants').get().then(s => s.docs.forEach(d => {
  const v = d.data();
  const sh = v.sections?.hero;
  if (sh && (sh.headline !== v.headline || sh.subheadline !== v.subheadline))
    console.log('MISMATCH:', v.slug, '| top:', v.headline, '| sections:', sh.headline);
  else console.log('OK:', v.slug);
}));
"
```

---

### P3: Agent chat fails to advance phases on short/bare messages

**Pattern**: The Gemini LLM extraction returns empty strings for fields like `industry` when users type bare one-word answers (e.g., "Construction" instead of "I run a construction company"). The phase state machine stays in `gathering` forever.

**Rule**: Heuristic extraction (`inferIndustry`, `inferBottleneck` in `lib/agents/conversation.ts`) must catch bare industry names without requiring sentence context. Always include a safety valve that advances phases after N messages even with partial data.

**Current safeguards**:
- `inferIndustry()` matches 35+ bare industry names via regex
- `detectPhase()` has safety valve: advances to `confirming` after 8+ messages with at least 1 filled field
- Expanded affirm regex catches "ok", "okay", "sounds good", "perfect", "awesome", etc.

**How to test**: Open agent chat, type just "Construction", then "Scheduling jobs", then "Google Sheets". Agent should advance after 3-4 messages, not loop forever.

---

### P4: Components exist in codebase but aren't imported/wired

**Pattern**: Components are created and committed but never imported into the page that renders them. They pass TypeScript checks but don't render on the live site.

**Rule**: After creating a new component, verify it is:
1. Imported in the page file (`page.tsx` or parent component)
2. Actually rendered in the JSX (not just imported)
3. Visible on the deployed site (not just dev)

**Past occurrences**:
- `BrushRevealCanvas` — existed but not lazy-loaded in `BrushRevealHero.tsx`
- `FlowText` (from `GlitchText.tsx`) — existed but hero used plain text
- `WaveDivider` (from `GlowLine.tsx`) — existed but not placed between sections in `page.tsx`
- `BookingCTAButton` — existed but nav/hero used `<Link>` to `/contact` instead

**How to check**: Compare the component table in `CLAUDE.md` against actual imports:
```bash
# List all marketing components and check if they're imported somewhere
for f in components/marketing/*.tsx; do
  name=$(basename "$f" .tsx)
  count=$(grep -r "$name" app/ components/ --include="*.tsx" -l 2>/dev/null | wc -l)
  if [ "$count" -le 1 ]; then echo "UNUSED: $name"; fi
done
```

---

### P5: Documentation drifts from code after changes

**Pattern**: Code changes are made but documentation (CLAUDE.md, CODEX.md, API_Spec.md, Data_Model.md, Sitemap_Routes.md) is not updated. Future agents read stale docs and make wrong assumptions.

**Rule**: When adding/removing:
- **API routes** → update `CLAUDE.md`, `CODEX.md`, `docs/API_Spec.md`, `docs/Sitemap_Routes.md`
- **Components** → update `CLAUDE.md` component table
- **Firestore fields** → update `CLAUDE.md` collections table, `docs/Data_Model.md`
- **Seed scripts** → update `CLAUDE.md`, `CODEX.md`, `README.md`
- **New pages** → update `CLAUDE.md` project structure, `docs/Sitemap_Routes.md`

**Past occurrence**: 5 API routes, 6 components, 4 seed scripts, and variant schema fields were missing from all docs after Phase 4+5 work.

---

### P6: Seed scripts only check top-level data, not nested structures

**Pattern**: Seed scripts check if a collection has data (`limit(1).get()`) before seeding, but don't validate the quality of existing data. Placeholder or broken data persists.

**Rule**: Seed scripts should:
1. Check if data exists (skip seeding if so)
2. BUT also validate existing data for known bad patterns (typos, placeholders)
3. Fix bad data even if the collection isn't empty

**Past occurrence**: `seed-content.ts` skipped healthcare variant sections because the variant doc already existed, but `sections.hero` still had "Go go go" placeholder.

---

### P8: Turbopack hashes firebase-admin package name in SSR bundles — RESOLVED

**Pattern**: When Next.js 16 with Turbopack builds for Firebase Hosting Cloud Functions, the SSR bundle renames `firebase-admin` to something like `firebase-admin-a14c8a5423a75469`. The Cloud Function then fails with `ERR_MODULE_NOT_FOUND` on any page that requires dynamic SSR (server-rendered at request time).

**Status**: **RESOLVED** (2026-03-21). A predeploy script (`scripts/fix-turbopack-externals.js`) now automatically patches all hashed module names back to `firebase-admin` in both `.next/server/` and `.firebase/nicer-systems/functions/.next/server/` before upload. Configured as a Firebase `predeploy` hook in `firebase.json` and as a `postbuild` step in `package.json`.

**Rule**: Do NOT remove the predeploy hook or the `fix-turbopack-externals.js` script until Turbopack fixes the upstream bug. Dynamic SSR routes (admin pages, API routes) depend on it.

**How to check**: After deploying, check Cloud Function logs — there should be NO `ERR_MODULE_NOT_FOUND` errors:
```bash
firebase functions:log --only firebase-frameworks-nicer-systems-ssrnicersystems
```

---

### P9: Admin login can fail in production if session creation assumes injected service-account secrets — RESOLVED

**Pattern**: Client Firebase auth succeeds, but `/api/auth/session` returns `401` on the live site because the deployed SSR backend tries to initialize Firebase Admin only from `FIREBASE_PRIVATE_KEY`/`FIREBASE_CLIENT_EMAIL`.

**Status**: **RESOLVED** (2026-03-21). Firebase Admin SDK in `lib/firebase/admin.ts` now supports dual-mode initialization:
1. Local/dev: explicit service-account env vars from `.env.local`
2. Deployed Firebase/GCP runtime: application default credentials with `projectId` only

Additionally, the login page (`app/admin/login/page.tsx`) retries session creation with a force-refreshed token on failure, and the session endpoint (`app/api/auth/session/route.ts`) returns specific error codes (`TOKEN_EXPIRED`, `INVALID_CREDENTIALS`) for client-side retry logic.

**Past occurrence**: 2026-03-13 admin login on `nicersystems.com` showed `Failed to create session` after successful client auth. Fixed and verified working 2026-03-21.

---

### P10: FIREBASE_PRIVATE_KEY format errors in .env.local

**Pattern**: When copying the Firebase service account private key into `.env.local`, the key header can get mangled (e.g., `-----PRIVATE KEY-----` instead of `-----BEGIN PRIVATE KEY-----`), the variable name can get corrupted (e.g., `FIREBASE_PRIVATE_KEYBEGIN`), or extra wrapping quotes can be added.

**Rule**: The `.env.local` entry must be:
1. Variable name: `FIREBASE_PRIVATE_KEY` (not `KEYBEGIN` or other variants)
2. Header: `-----BEGIN PRIVATE KEY-----` (must include `BEGIN`)
3. Footer: `-----END PRIVATE KEY-----`
4. Value wrapped in double quotes with `\n` for newlines

**Current safeguard**: `lib/firebase/admin.ts` `getAdminApp()` strips wrapping `"` or `'` quotes and replaces `\\n` with real newlines before passing to `cert()`. However, a missing `BEGIN` in the header will still cause auth failures.

**How to check**: Run `node -e "require('dotenv').config({path:'.env.local'}); const k=process.env.FIREBASE_PRIVATE_KEY; console.log('starts:', k?.substring(0,30)); console.log('ends:', k?.substring(k.length-30));"` — should show `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`.

---

### P7: QA tester false positives on components that render differently than expected

**Pattern**: Automated QA (ChatGPT Agent mode) marks sections as "FAIL/absent" when they render with different styling, naming, or structure than what the spec describes.

**Affected sections** (were falsely marked as missing):
- `IsThisForYou` — renders but QA tester didn't recognize persona cards
- `WhyNotDIY` — renders but QA tester didn't recognize comparison grid
- `HowItWorks` — renders 3 steps, spec said 4 (spec was wrong)
- `TypingIndicator` — wired in `ChatMessages.tsx` but visually subtle
- `Start Over` button — existed (error-only), just not always visible

**Rule**: When reviewing QA results, always verify "absent" findings by reading the actual component code before assuming something is missing.

---

## Resolved Issues Registry

### QA Cycle 1 (2026-03-12) — 35 FAIL → All Resolved

| ID | Issue | Root Cause | Fix | Files Changed |
|----|-------|-----------|-----|---------------|
| BUG-001 | FAQ section missing, #faq anchor dead | `FAQSection` returned `null` when Firestore empty | Always render `<section id="faq">` with fallback card | `FAQSection.tsx` |
| BUG-002 | Pricing section missing, #pricing anchor dead | No offers seeded in Firestore | Seeded 3 pricing tiers via `seed-content.ts` | Firestore data only |
| BUG-003 | Testimonials section missing | No testimonials seeded in Firestore | Seeded 4 testimonials via `seed-content.ts` | Firestore data only |
| BUG-004 | Agent chat loops on intake question | `inferIndustry()` couldn't match bare names; `detectPhase()` had no safety valve | Wider regex patterns, safety valve at 8 msgs | `conversation.ts`, `route.ts` |
| BUG-005 | No typing indicator visible | TypingIndicator was wired but subtle | Verified existing — was a QA false positive | None (already correct) |
| BUG-006 | No "Start Over" button | Button only showed on error state | Always show after 2+ user messages | `AgentChat.tsx` |
| BUG-007 | Booking CTA uses mailto: | BookingModal/Form existed but weren't wired | Replaced `<Link>` with `<BookingCTAButton>` in nav + hero | `layout.tsx`, `BrushRevealHero.tsx` |
| BUG-008 | BrushRevealCanvas not rendering | Component existed but not imported in hero | Added `React.lazy()` import + Suspense wrapper | `BrushRevealHero.tsx` |
| BUG-009 | FlowText/GlitchText not applied | Component existed but hero used plain `<span>` | Wrapped headline in `<FlowText>` | `BrushRevealHero.tsx` |
| BUG-010 | WaveDividers not between sections | Component existed but not placed in page.tsx | Added `<WaveDivider />` between major sections | `page.tsx` |
| BUG-011 | Healthcare variant typo + placeholder | Top-level fields fixed but `sections.hero` still had bad data | Fixed both top-level AND `sections.hero` fields | Firestore data via `seed-variants.ts` |
| BUG-012 | Healthcare meta_description weak | "Make the healthcare processes much faster" | Replaced with proper SEO description | Firestore data via `seed-variants.ts` |
| BUG-013 | IsThisForYou/WhyNotDIY "absent" | QA false positive — sections rendered correctly | No code change needed | None (QA error) |
| BUG-014 | HowItWorks "missing step" | Spec said 4 steps, code has 3 (correct) | Updated CLAUDE.md spec to say 3 steps | `CLAUDE.md` |
| BUG-015 | SSE no timeout handling | No timeout on SSE connection | Added 30s timeout with retry prompt | `useSSEChat.ts` |
| BUG-016 | /audit returns 404 | Deferred feature, route not deployed | Accepted as deferred — not a bug | None |
| BUG-017 | AgentDemoForm not structured form | Design decision: chat replaced form | Accepted — chat is better UX | None |
| BUG-018 | Case study thumbnails missing | Content not uploaded | Content task — not a code bug | None |
| BUG-019 | `confirming` phase loops on questions | `looksLikeQuestion()` kept agent in confirming | Expanded affirm regex to match more patterns | `conversation.ts` |
| BUG-020 | 5+ docs stale after code changes | No process to update docs with code | Created update process (Pattern P5) | 10 doc files |
| BUG-021 | 5 new variant pages return 500 | Turbopack hashes `firebase-admin` package name in SSR bundle; variants seeded after deploy need dynamic SSR which crashes | Redeployed so all 6 variants are statically pre-rendered via `generateStaticParams()` | Firestore data + redeploy |

### Post-QA Fixes (2026-03-21)

| ID | Issue | Root Cause | Fix | Files Changed |
|----|-------|-----------|-----|---------------|
| BUG-022 | Admin login fails in production (401 on session creation) | Firebase Admin SDK required service account env vars not available in Cloud Functions runtime | Dual-mode Admin SDK init: service account creds OR GCP application default credentials | `lib/firebase/admin.ts`, `app/admin/login/page.tsx`, `app/api/auth/session/route.ts` |
| BUG-023 | All dynamic SSR routes return 500 (ERR_MODULE_NOT_FOUND) | Turbopack hashes `firebase-admin` to `firebase-admin-a14c8a5423a75469` despite `serverExternalPackages` | Predeploy script patches hashed names back to real package name in both `.next/` and `.firebase/` staging | `scripts/fix-turbopack-externals.js`, `firebase.json`, `package.json` |
| BUG-024 | Session endpoint returns generic error on all failures | No error differentiation between expired tokens and invalid credentials | Session route returns specific error codes (`TOKEN_EXPIRED`, `INVALID_CREDENTIALS`) with server-side logging | `app/api/auth/session/route.ts` |
| BUG-025 | Login race condition with stale auth state | `signOut()` not awaited before new `signIn()`, causing token mismatch | Login page awaits stale auth cleanup; retries session creation with force-refreshed token | `app/admin/login/page.tsx` |
| BUG-026 | Admin SDK fails to parse private key with wrapping quotes | `.env.local` `FIREBASE_PRIVATE_KEY` can have extra `"` or `'` wrapping from copy-paste; header was `-----PRIVATE KEY-----` instead of `-----BEGIN PRIVATE KEY-----` | `getAdminApp()` now strips wrapping quotes before replacing `\\n`; `.env.local` key header corrected | `lib/firebase/admin.ts`, `.env.local` |
| BUG-027 | Session error message is generic "Failed to create session" | Session endpoint swallowed actual error details | Error message now includes the underlying cause (`Failed to create session: <message>`) | `app/api/auth/session/route.ts` |

---

## Pre-Deploy QA Checklist

Run this before every deploy to catch the patterns above.

### Code Checks
```bash
# 1. TypeScript compiles
npx tsc --noEmit

# 2. Build succeeds
npm run build

# 3. No unused marketing components (Pattern P4)
echo "--- Checking component usage ---"
for f in components/marketing/*.tsx; do
  name=$(basename "$f" .tsx)
  count=$(grep -rl "$name" app/ components/ --include="*.tsx" 2>/dev/null | wc -l)
  if [ "$count" -le 1 ]; then echo "WARNING: $name only referenced in itself"; fi
done
```

### Live Site Checks (after deploy)
1. **Anchors exist**: All nav links (#pricing, #faq, #see-it-work, #how-it-works) scroll to a visible section
2. **Sections render**: Pricing shows 3 tiers, FAQ shows questions, Testimonials show quotes
3. **Agent chat works**: Type a bare industry name → agent asks follow-up → advances phases
4. **Booking modal opens**: Click "Book a Scoping Call" in nav → modal appears with date picker
5. **Variant pages load**: Visit /healthcare, /construction, /staffing → custom hero content, no placeholders
6. **Visual effects active**: Canvas overlay visible behind hero (subtle), text animation on headline, wave dividers between sections

### Documentation Sync Check
After making code changes, verify these files are current:
- [ ] `CLAUDE.md` — project structure, components table, collections table, dev commands
- [ ] `CODEX.md` — repo structure, API routes, scripts
- [ ] `docs/API_Spec.md` — all API endpoints
- [ ] `docs/Data_Model.md` — all Firestore fields
- [ ] `docs/Sitemap_Routes.md` — all routes
- [ ] `docs/Backlog.md` — completed/deferred status
- [ ] `docs/Phased_Implementation_Plan.md` — phase status

---

## Adding New Issues

When you find a bug, add it to the **Resolved Issues Registry** with:

```markdown
| BUG-NNN | Short description | Root cause | How it was fixed | Files changed |
```

If it reveals a recurring **pattern**, add it to the **Active Patterns to Avoid** section with:

```markdown
### PN: Pattern name
**Pattern**: What goes wrong
**Rule**: What to do instead
**Past occurrence**: When it happened
**How to check**: Command or manual step to verify
```
