# QA Remediation Plan — Nicer Systems Preview-Plan Web App

## Shared Context

- **Project**: Next.js 16 app in `nicer-systems/`
- **Key layout**: `app/(marketing)/layout.tsx` (nav + footer)
- **Run dev**: `cd nicer-systems && npm run dev`
- **Deploy**: `npm run deploy`
- **Do NOT break** existing functionality — make targeted fixes only
- **Read `CLAUDE.md`** for full project structure, conventions, and tech stack

---

## Terminal Assignment Map

| Terminal | Issues Covered | Impact | Key Files |
|----------|---------------|--------|-----------|
| T1 | Broken pricing nav + CTA clarity | High + Medium | `app/(marketing)/layout.tsx`, `components/marketing/PricingSection.tsx` |
| T2 | mailto: Book a Call + Contact form feedback | High + Medium | `app/(marketing)/contact/page.tsx`, `lib/validation.ts` |
| T3 | Agent chat stall + Demo scroll reset | High + Low | `components/marketing/AgentChat.tsx`, `hooks/useSSEChat.ts`, `app/api/agent/chat/route.ts` |
| T4 | Case studies 404 + empty page UX | High + Low | `app/(marketing)/case-studies/page.tsx`, `app/(marketing)/layout.tsx` |
| T5 | Color contrast accessibility + Analytics consent UX | Medium + Medium | Multiple marketing components, `components/ui/AnalyticsConsentControls.tsx`, `lib/analytics-consent.ts` |
| T6 | Redundant footer CTAs + general CTA consolidation | Low + Medium | `app/(marketing)/layout.tsx`, `components/marketing/FinalCTA.tsx` |

---

## Detailed Plan by Terminal

### T1 — Pricing Navigation & CTA Clarity
**Files**: `app/(marketing)/layout.tsx`, `components/marketing/PricingSection.tsx`

1. Fix the `navLinks` array — the "Pricing" link should anchor to `#pricing` (not `/pricing`)
2. Verify `PricingSection` renders on the homepage with an `id="pricing"` attribute
3. If no offers exist in Firestore, show a fallback: "Pricing is bespoke — contact us for a quote" with a CTA to `/contact`
4. Differentiate CTAs: "Get Preview Plan" vs "Request Quote" vs "Book Call" — each should route to distinct actions

### T2 — Book a Scoping Call & Contact Form Feedback
**Files**: `app/(marketing)/contact/page.tsx`

1. Replace the `mailto:` link on "Book a Scoping Call" with a Calendly embed or direct URL (check if a `NEXT_PUBLIC_BOOKING_URL` env var exists; if so, use it)
2. Add a fallback: if no booking URL configured, show an inline form or phone number instead of mailto
3. After contact form submission, display a success toast/message: "Thanks for reaching out! We'll respond within 24 hours."
4. Add error feedback for failed submissions
5. Ensure server-side validation prevents empty required fields (name, email, company)

### T3 — Agent Chat Stall & Demo Scroll
**Files**: `components/marketing/AgentChat.tsx`, `hooks/useSSEChat.ts`, `app/api/agent/chat/route.ts`, `lib/agents/conversation.ts`

1. Debug SSE streaming — add a timeout (30s) that shows "The agent is taking longer than expected. Try again?" if no chunks arrive
2. Add error handling for dropped SSE connections — reconnect or show error state
3. Add a "Start Over" button visible when the conversation stalls or errors
4. Fix scroll behavior: after sending a message, auto-scroll to the latest response (not to the top of the section)
5. Ensure `useSSEChat` handles all edge cases: network errors, empty responses, malformed JSON chunks

### T4 — Case Studies Page & Navigation
**Files**: `app/(marketing)/case-studies/page.tsx`, `app/(marketing)/layout.tsx`, `CaseStudiesListClient.tsx`

1. In the case studies listing page, if no published studies exist, show a friendly message: "Case studies coming soon — see a live preview plan instead" with a CTA to `#see-it-work`
2. Conditionally hide the "Case Studies" nav link if no published case studies exist (or show with a "Coming Soon" badge)
3. Fix the "Back to home" link on the empty state to be more descriptive
4. Ensure `/case-studies` never returns a 404 — it should always render the listing page (even if empty)

### T5 — Accessibility & Analytics Consent
**Files**: Multiple marketing components, `components/ui/AnalyticsConsentControls.tsx`, `lib/analytics-consent.ts`

1. Audit text-on-background contrast in: `BrushRevealHero.tsx`, `HowItWorks.tsx`, `PricingSection.tsx`, `FinalCTA.tsx`
2. Increase contrast to meet WCAG AA (4.5:1 for normal text, 3:1 for large text) — darken text or add overlays
3. Update the analytics consent banner to explain purpose: "We use analytics to improve your experience"
4. Defer the consent banner — show it after 5 seconds or on first interaction, not immediately on page load
5. Add a "Manage preferences" link in the footer that reopens the consent panel

### T6 — Footer Cleanup & CTA Consolidation
**Files**: `app/(marketing)/layout.tsx`, `components/marketing/FinalCTA.tsx`

1. Simplify footer columns — remove links that duplicate the top nav exactly
2. Keep only essential footer links: Privacy, Terms, Contact, and a single "Get Started" CTA
3. In `FinalCTA.tsx`, ensure the two CTAs are clearly differentiated (one for booking, one for the demo)
4. Remove or consolidate any dead links (e.g., Pricing link in footer if it just scrolls to the same anchor)

---

## Terminal Prompts (copy-paste into each terminal)

### T1
```
Read QA-PLAN.md section T1. Fix the broken "Pricing" navigation link in `app/(marketing)/layout.tsx` so it anchors to `#pricing` on the homepage, ensure `PricingSection.tsx` has `id="pricing"` and shows a "Pricing is bespoke — contact us" fallback when no Firestore offers exist, and differentiate the homepage CTAs so "Get Preview Plan," "Request Quote," and "Book Call" each route to distinct destinations.
```

### T2
```
Read QA-PLAN.md section T2. Replace the `mailto:` link on "Book a Scoping Call" in `app/(marketing)/contact/page.tsx` with a Calendly URL or the `NEXT_PUBLIC_BOOKING_URL` env var with a fallback contact method, and add a visible success message ("Thanks for reaching out! We'll respond within 24 hours.") plus error feedback after contact form submission, ensuring server-side validation rejects empty required fields.
```

### T3
```
Read QA-PLAN.md section T3. Debug the SSE agent chat in `hooks/useSSEChat.ts` and `app/api/agent/chat/route.ts` — add a 30-second timeout that shows "The agent is taking longer than expected — try again?" with a "Start Over" button when the conversation stalls or errors, and fix the demo scroll behavior in `components/marketing/AgentChat.tsx` so after sending a message the view auto-scrolls to the latest response instead of jumping to the top of the section.
```

### T4
```
Read QA-PLAN.md section T4. Update `app/(marketing)/case-studies/page.tsx` so it never returns a 404 — when no published case studies exist, show a friendly empty state ("Case studies coming soon — see a live preview plan instead") with a CTA linking to `#see-it-work`, conditionally hide or badge the "Case Studies" nav link in `app/(marketing)/layout.tsx` when no content exists, and make the empty-state "Back to home" link more descriptive.
```

### T5
```
Read QA-PLAN.md section T5. Audit and fix text-on-background color contrast in `BrushRevealHero.tsx`, `HowItWorks.tsx`, `PricingSection.tsx`, and `FinalCTA.tsx` to meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text), and update the analytics consent banner in `AnalyticsConsentControls.tsx` to explain its purpose, defer it by 5 seconds or until first interaction, and add a "Manage preferences" link in the footer.
```

### T6
```
Read QA-PLAN.md section T6. Simplify the footer in `app/(marketing)/layout.tsx` by removing links that duplicate the top navigation and keeping only essential links (Privacy, Terms, Contact, one "Get Started" CTA), and in `components/marketing/FinalCTA.tsx` ensure the two CTAs are clearly differentiated — one for booking a scoping call and one for running the interactive demo — removing or consolidating any dead or redundant links.
```

---

## Acceptance Criteria (All Terminals)

- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No new console errors in browser
- [ ] Navigation links work correctly (no dead routes, no 404s)
- [ ] Mobile responsive — test at 375px width
- [ ] All existing tests still pass
