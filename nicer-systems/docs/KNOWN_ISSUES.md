# Known Issues & Lessons Learned

**Purpose**: Central registry of all bugs, mistakes, and patterns found during QA and development. Every AI agent and developer MUST read this file before making changes to avoid repeating past mistakes.

**Updated**: 2026-03-12

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

### P8: Turbopack hashes firebase-admin package name in SSR bundles

**Pattern**: When Next.js 16 with Turbopack builds for Firebase Hosting Cloud Functions, the SSR bundle renames `firebase-admin` to something like `firebase-admin-a14c8a5423a75469`. The Cloud Function then fails with `ERR_MODULE_NOT_FOUND` on any page that requires dynamic SSR (server-rendered at request time).

**Rule**: All pages that use `firebase-admin` (variant pages, case study detail, admin pages) must either:
1. Be **statically pre-rendered** at build time via `generateStaticParams()` — this is the current workaround
2. OR add `firebase-admin` to `serverExternalPackages` in `next.config.ts` if dynamic SSR is needed

**Current workaround**: All 6 industry variant pages are statically generated via `generateStaticParams()` in `app/(marketing)/[industry]/page.tsx`. New variants added to Firestore require a redeploy to be pre-rendered.

**How to check**: After deploying, visit a variant page that was recently added. If it returns 500, check Cloud Function logs:
```bash
firebase functions:log --only firebase-frameworks-nicer-systems-ssrnicersystems
```
Look for `ERR_MODULE_NOT_FOUND` with a hashed package name.

---

### P9: Admin login can fail in production if session creation assumes injected service-account secrets

**Pattern**: Client Firebase auth succeeds, but `/api/auth/session` returns `401` on the live site because the deployed SSR backend tries to initialize Firebase Admin only from `FIREBASE_PRIVATE_KEY`/`FIREBASE_CLIENT_EMAIL`.

**Rule**: Firebase Admin bootstrap used by SSR/auth routes must support two modes:
1. Local/dev: explicit service-account env vars from `.env.local`
2. Deployed Firebase/GCP runtime: application default credentials with `projectId`

**Past occurrence**: 2026-03-13 admin login on `nicersystems.com` showed `Failed to create session` after successful client auth, while invalid credentials still surfaced as Firebase `auth/invalid-credential`.

**How to check**:
```bash
firebase functions:log --only firebase-frameworks-nicer-systems-ssrnicersystems
```
Then submit a valid admin login and confirm there is no `/api/auth/session` `401` failure.

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
