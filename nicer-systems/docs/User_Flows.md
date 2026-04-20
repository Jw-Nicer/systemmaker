# User Flows (Current Key Journeys)
**Doc Date:** 2026-02-27 | **Updated:** 2026-04-20

## Visitor flow A: Book a scoping call
Homepage or variant page → primary CTA (hero "Book a Scoping Call" or pricing-card free "Book a Discovery Call") → BookingModal date/time picker → lead created or updated with booked status → admin notified. The free Discovery Call (pricing card, `sort_order: 0`) and the hero Scoping Call share the same modal — labels are kept distinct on purpose so the funnel can measure cannibalization via `pricing_tier_click` distribution.

## Visitor flow B: Generate a plan via chat
Homepage → See it work → multi-phase chat intake → plan builds inline → share or email plan → book or continue follow-up chat

## Visitor flow C: Generate a plan via guided audit
Homepage or variant page → guided audit CTA → `/audit` wizard → richer structured intake → preview plan generated → share, email, or book

## Visitor flow D: Visit an industry page
Ad / referral / direct industry URL → `/[industry]` → tailored landing content → chat, audit, or booking CTA → lead capture / booking

## Visitor flow E: Open a shared plan
Shared link → `/plan/[id]` → read plan → share / refine / book → optional lead capture or booking

## Admin flow A: Update homepage layout
Admin login → homepage layout page → reorder or hide sections → save → marketing homepage renders new layout

## Admin flow B: Preview unpublished content
Admin login → preview site or preview variant → inspect draft content with preview banner → return to CMS and adjust as needed

## Admin flow C: Publish proof-of-work
Admin login → case studies → create or edit → preview → publish → public case-study surfaces update

## Admin flow D: Manage leads
Admin login → leads dashboard → filter → open lead detail → add note / change status / set follow-up → continue pipeline management

## Admin flow E: Run an experiment
Admin login → experiments → create or edit experiment → start → monitor → declare winner or stop

## Admin flow F: Update agent behavior
Admin login → agent templates → edit markdown template → test run → save → future runs use updated template
