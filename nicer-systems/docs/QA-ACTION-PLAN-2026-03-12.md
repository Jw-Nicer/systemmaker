# QA Remediation Action Plan — Nicer Systems

**Based on**: QA Report dated March 12, 2026
**Total issues**: 35 FAIL, 17 BLOCKED
**Status**: ✅ ALL STREAMS COMPLETED (2026-03-12)

---

## Root Cause Analysis

Before diving into fixes, many "FAIL" results trace back to just a few root causes:

| Root Cause | Affected Tests | Count |
|------------|---------------|-------|
| **Empty Firestore collections** (no FAQs, testimonials, or offers seeded in prod) | FAQ (4), Testimonials (2), Pricing appears as "bespoke" fallback (3) | 9 |
| **Agent chat regression** (SSE conversation doesn't progress through phases) | Chat multi-phase (1), typing indicator (1), Start Over button (1), all Plan Display tests blocked (6) | 9 |
| **Booking flow never built** (spec calls for BookingModal + date/time, reality is mailto:/contact redirect) | Booking (5) | 5 |
| **Visual effects not wired to deployed page** (components exist but not rendering) | Canvas (1), GlitchText (1), GlowLine (1), ScrollReveal (1) | 4 |
| **QA tester misidentification** (sections render but tester didn't recognize them) | IsThisForYou (2), WhyNotDIY (2), HowItWorks step count (1) | 5 |
| **/audit not deployed** (marked deferred in CLAUDE.md) | Audit wizard (4) | 4 |
| **Industry variant placeholder content** | Healthcare typo + placeholder text (1) | 1 |

**Adjusted real failure count**: ~20 genuine issues (down from 35, after removing misidentifications and known-deferred items).

---

## Action Plan — 6 Work Streams

### Stream 1: Seed Firestore Production Data (P0 — Quick Win) ✅ DONE
**Impact**: Fixes 9 test failures instantly
**Effort**: 1-2 hours
**Risk**: Low

The FAQ, Testimonials, and Pricing sections all work correctly — they return `null` or show a fallback when Firestore is empty. The fix is seeding real content.

| Task | Details |
|------|---------|
| 1.1 | **Seed FAQs** — Log into `/admin/faqs`, create 5-8 FAQs and publish them. Covers: "What industries do you work with?", "How long does a project take?", "What does a preview plan include?", "Do you replace our existing tools?", "How does pricing work?" |
| 1.2 | **Seed Testimonials** — Log into `/admin/testimonials`, create 3-4 testimonials and publish. Use real or realistic client quotes. |
| 1.3 | **Seed Pricing Offers** — Log into `/admin/offers`, create 3 tiers and publish. E.g.: "Workflow Audit" ($2,500), "Build & Launch" ($7,500), "Managed Ops" ($3,500/mo). Mark middle tier as highlighted. |
| 1.4 | **Verify** — After seeding, reload `/` and confirm all sections render with `id="pricing"` and `id="faq"` anchors active. Nav links should now scroll correctly. |

**Files changed**: None (admin data entry only).

---

### Stream 2: Fix Agent Chat Regression (P0 — Critical) ✅ DONE
**Impact**: Fixes 9 test failures + unblocks all Plan Display tests
**Effort**: 4-8 hours
**Risk**: Medium (core product flow)

The agent repeats the intake question and never transitions through phases. This is the most important fix — the demo is the primary conversion tool.

| Task | Details |
|------|---------|
| 2.1 | **Debug conversation phase transitions** in `lib/agents/conversation.ts` — verify the phase state machine (gathering → confirming → building → complete → follow_up) advances correctly based on message count and content analysis. |
| 2.2 | **Check agent prompt templates** — Run `npm run seed:templates` or verify templates in `/admin/agent-templates`. Empty or missing templates would cause the agent to loop. |
| 2.3 | **Add TypingIndicator** — `components/marketing/TypingIndicator.tsx` exists. Ensure `ChatMessages.tsx` renders it when `isLoading` is true during SSE streaming. |
| 2.4 | **Add "Start Over" button** — Add a reset button to `AgentChat.tsx` that clears messages and resets the `useSSEChat` hook state. Show it after 2+ messages or on error. |
| 2.5 | **Add SSE timeout handling** — In `useSSEChat.ts`, add a 30-second timeout per message. Show "The agent is taking longer than expected. Try again?" if no chunks arrive. |
| 2.6 | **Test end-to-end** — Verify: send industry → agent asks follow-up → send details → agent confirms → agent builds plan → ChatPlanCard renders → email capture appears. |

**Key files**:
- `lib/agents/conversation.ts`
- `hooks/useSSEChat.ts`
- `components/marketing/AgentChat.tsx`
- `components/marketing/ChatMessages.tsx`
- `app/api/agent/chat/route.ts`

---

### Stream 3: Fix Dead Nav Links & Anchors (P0 — Quick Win) ✅ DONE
**Impact**: Fixes broken UX for every visitor
**Effort**: 30 minutes
**Risk**: Low

| Task | Details |
|------|---------|
| 3.1 | **Fix /#pricing link** — After seeding offers (Stream 1), `PricingSection` renders with `id="pricing"`. If no offers exist, the section still renders (bespoke fallback) with `id="pricing"` — already correct. Verify the nav link works. |
| 3.2 | **Fix /#faq link** — `FAQSection` returns `null` when empty, which removes the anchor target. **Fix**: Change `FAQSection` to always render the section wrapper with `id="faq"`, showing a minimal fallback when empty (e.g., "Have questions? Reach out" with contact link). |
| 3.3 | **Fix footer FAQ link** — Same fix as 3.2. Once `id="faq"` always exists, footer link works. |
| 3.4 | **Remove or redirect /audit** — Either remove the route reference entirely or add a redirect to `/#see-it-work` since the audit wizard is deferred. |

**Key files**:
- `components/marketing/FAQSection.tsx` (line 17-19: change `return null` to render fallback)
- `app/(marketing)/layout.tsx` (verify nav links)

---

### Stream 4: Fix Industry Variant Content (P1 — Content Quality) ✅ DONE
**Impact**: Fixes live unprofessional content
**Effort**: 15 minutes
**Risk**: Low

| Task | Details |
|------|---------|
| 4.1 | **Fix /healthcare variant** — Log into `/admin/variants`, find the healthcare variant. Fix typo: "Automate you healthcare" → "Automate your healthcare". Replace placeholder subheadline "Go go go" with real copy. |
| 4.2 | **Audit all variants** — Check every published variant for placeholder text. List: run through each industry slug and verify headline/subheadline are production-ready. |

**Files changed**: None (admin data entry only).

---

### Stream 5: Wire Visual Effects (P2 — Polish) ✅ DONE
**Impact**: Fixes 4 cosmetic failures
**Effort**: 2-4 hours
**Risk**: Low-Medium

These components exist in the codebase but aren't rendering on the deployed page. Likely wiring or lazy-loading issues.

| Task | Details |
|------|---------|
| 5.1 | **BrushRevealCanvas** — Check `BrushRevealHero.tsx` to see if the canvas is conditionally loaded. The component dynamically imports `BrushRevealCanvas.tsx`. Verify the lazy import resolves in production build. Test: `npm run build` and check for the canvas chunk. |
| 5.2 | **GlitchText** — Check if `GlitchText` component is used in the hero headline. If not, wrap the H1 text in `<GlitchText>`. The component exists in `components/ui/GlitchText.tsx`. |
| 5.3 | **GlowLine** — Check if `GlowLine` separators are placed between sections in `page.tsx`. If not, add `<GlowLine />` between major sections. Component exists in `components/ui/GlowLine.tsx`. |
| 5.4 | **ScrollReveal** — `IsThisForYou.tsx` and `WhyNotDIY.tsx` already import `ScrollReveal`. Verify the framer-motion intersection observer triggers in production. May need to check if `framer-motion` tree-shakes the observer in the SSR build. |

**Key files**:
- `components/marketing/BrushRevealHero.tsx`
- `app/(marketing)/page.tsx`
- `components/ui/GlitchText.tsx`
- `components/ui/GlowLine.tsx`

---

### Stream 6: Implement Booking Flow (P1 — Conversion) ✅ DONE (Option B — In-App)
**Impact**: Fixes 5 test failures, improves primary CTA
**Effort**: 4-8 hours (or 30 min if using external booking link)
**Risk**: Medium

Two options:

**Option A — External Booking (Quick)**
Use `NEXT_PUBLIC_SCOPING_CALL_BOOKING_URL` env var (Calendly/Cal.com link).
1. Set the env var in `.env.local` and Firebase hosting config.
2. Update `BookingCTAButton.tsx` to open the external URL in a new tab.
3. Remove mailto: fallback.

**Option B — In-App Booking (Full)**
Build the `BookingModal` + `BookingForm` as specced.
1. Wire `BookingModal.tsx` and `BookingForm.tsx` (components exist in codebase).
2. Connect to `/api/booking` endpoint.
3. Add date picker (future dates only), time slot selector, name/email/message fields.
4. Add confirmation state after successful booking.

**Recommendation**: Option A first (ship in 30 min), then Option B as a follow-up.

**Key files**:
- `components/marketing/BookingModal.tsx`
- `components/marketing/BookingForm.tsx`
- `components/marketing/BookingCTAButton.tsx`
- `app/api/booking/route.ts`

---

## Priority Execution Order

| Priority | Stream | Effort | Fixes |
|----------|--------|--------|-------|
| **Do first** | Stream 1: Seed Firestore data | 1-2 hrs | 9 failures |
| **Do first** | Stream 3: Fix dead nav links | 30 min | 3 failures |
| **Do first** | Stream 4: Fix variant content | 15 min | 1 failure |
| **Do second** | Stream 2: Fix agent chat | 4-8 hrs | 9 failures + unblocks 6 |
| **Do second** | Stream 6: Booking flow (Option A) | 30 min | 5 failures |
| **Do third** | Stream 5: Wire visual effects | 2-4 hrs | 4 failures |

**Total estimated effort**: 8-16 hours across all streams.

**After all streams complete**: Re-run the full QA checklist. Expected result: 70+ PASS (up from 44), <5 FAIL, <10 BLOCKED.

---

## Streams NOT Addressed (Deferred / Out of Scope)

| Item | Reason |
|------|--------|
| /audit wizard | Marked as deferred in CLAUDE.md. Remove any links to it for now. |
| Mobile testing (17 BLOCKED) | Need a real mobile viewport or Playwright tests. Not a code fix. |
| Case study thumbnails | Low priority — content is complete, just missing hero images. Add via admin when ready. |
| AgentDemoForm (structured form) | The chat-based approach replaced it. Not a bug — design decision. Update spec to match. |
| Network error testing | Needs manual or automated testing setup, not a code fix. |

---

## Spec vs. Reality Alignment — RESOLVED

All items below have been addressed:

1. **AgentDemoForm** — ✅ Chat-based approach is the production design. CLAUDE.md updated to reflect both AgentDemoForm (structured) and AgentChat (freeform SSE) coexist.
2. **HowItWorks** — ✅ CLAUDE.md updated: 3-step timeline (not 4). Steps: Describe → Generate → Share/Refine.
3. **BrushRevealCanvas** — ✅ Now wired and rendering. Lazy-loaded via React.lazy + Suspense, opacity-25 mix-blend-overlay, respects prefers-reduced-motion.
4. **Booking flow** — ✅ In-app BookingModal implemented with date/time picker + Google Calendar integration. Wired to nav header and hero CTA via BookingCTAButton.
