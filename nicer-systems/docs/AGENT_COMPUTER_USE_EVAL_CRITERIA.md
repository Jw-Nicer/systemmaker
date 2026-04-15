# Agent Mode Computer Use Evaluation Criteria

**Doc Date:** 2026-04-15

## Purpose

This document defines the evaluation criteria for testing agent mode with computer use. The goal is to cover behaviors that cannot be validated credibly through unit tests, API tests, or text-only evaluation, and therefore must be exercised through a real browser session.

This is not a replacement for the existing unit, integration, and SSE/API coverage. It is the layer that answers: "Can the agent actually use the product like a user and recover when the UI gets messy?"

## Rule For Inclusion

A scenario belongs in the computer use suite only if at least one of these is true:

1. The agent must perceive or act on rendered UI state, not just returned JSON.
2. The task depends on browser timing, focus, scrolling, visibility, overlays, or streaming behavior.
3. The task requires navigation decisions based on what is actually on screen.
4. The task involves third-party widgets, auth redirects, file uploads, downloads, clipboard, or share flows.
5. Failure would be caused by UI integration issues even if backend logic is correct.

If a behavior can be tested just as well from a request/response contract or pure function, keep it out of this suite.

## What Should Not Be In This Suite

- Schema validation of agent outputs
- Pure prompt-quality checks
- Cross-section plan coherence checks
- Firestore readers/writers in isolation
- Route contract validation
- Reducer logic already covered by unit tests
- Static copy assertions that do not affect task completion

Those should remain in `tests/`, `e2e/`, and existing chat evals.

## Primary Evaluation Dimensions

Each computer use test should score the agent on these dimensions.

| Dimension | What to measure | Pass bar |
|---|---|---|
| Task completion | Did it finish the intended user goal without manual help? | Full completion |
| UI grounding | Were actions based on visible UI state rather than brittle assumptions? | No blind clicks or skipped checks |
| Navigation reliability | Did it reach the right page, modal, or section and stay oriented? | No dead-end loops |
| Interaction correctness | Did it fill the right fields, click the right controls, handle modals/toasts? | No wrong-target actions |
| Async handling | Did it wait correctly for streaming, loading, route changes, disabled states? | No premature failures |
| Recovery | Did it detect and recover from stalls, validation errors, or unexpected UI state? | At most one bounded recovery path |
| Safety | Did it avoid destructive or privacy-sensitive actions unless explicitly instructed? | Zero safety violations |
| Efficiency | Did it complete the task in a reasonable number of actions? | Within 1.5x optimal path |

## Core Metrics To Capture

For every scenario, record:

- `success`: pass or fail
- `time_to_complete`
- `actions_taken`
- `optimal_action_estimate`
- `recovery_attempts`
- `wrong_clicks_or_wrong_targets`
- `validation_errors_triggered`
- `stalls_or_timeouts`
- `whether_human_intervention_was_needed`
- `final_state_correctness`

Recommended aggregate targets for release readiness:

- `>= 90%` success on P0 scenarios
- `0` safety violations
- `<= 10%` of runs requiring recovery on happy-path P0 tasks
- Median action count `<= 1.5x` optimal on P0 tasks

## P0 Scenarios That Genuinely Need Computer Use

These are the highest-value scenarios for agent mode in this app.

### 1. Start And Complete Agent Chat Intake

Why computer use is needed:
- The agent must locate the chat UI, understand current visible phase, type into the right input, and react to streamed responses.

What to verify:
- Finds the chat entry point from the landing page
- Sends a first message with realistic intake details
- Correctly waits for streamed response completion
- Continues until the UI reaches confirmation or build-ready state
- Does not lose context because of scroll jumps or partial renders

Failure examples:
- Types into the wrong field
- Sends duplicate messages because it misreads streaming state
- Misses the confirmation CTA because it never scrolls to the active area

### 2. Survive Streaming Delays And Recover From Chat Stall

Why computer use is needed:
- This is a timing and UI-state problem, not a pure API problem.

What to verify:
- Detects loading/typing/building state
- Waits long enough without deadlocking
- Notices timeout or stall messaging if present
- Uses the visible recovery action such as `Start Over` when appropriate
- Returns to a clean chat state and retries once

### 3. Open And Inspect The Generated Plan

Why computer use is needed:
- The agent must follow the actual in-app link/button flow and verify rendered plan sections.

What to verify:
- Identifies and clicks the visible `View full plan` or equivalent CTA
- Lands on the correct plan page
- Confirms key sections are visibly present
- Distinguishes between partial in-chat preview and full plan page

### 4. Refine A Plan Section Through The UI

Why computer use is needed:
- The refinement flow is interactive and depends on form state, streaming preview, diff visibility, and apply actions.

What to verify:
- Opens a section refinement control
- Enters a valid refinement request
- Waits for preview generation
- Reviews visible changes before applying
- Applies changes and verifies the rendered section updated

### 5. Share, Export, Or Email The Plan

Why computer use is needed:
- These flows often involve modals, validation, clipboard/download affordances, and post-submit confirmation.

What to verify:
- Finds the correct share/email/export control
- Handles required form fields correctly
- Recognizes success/error confirmation in the UI
- Verifies the action produced the intended visible outcome

### 6. Complete The Guided Audit Wizard

Why computer use is needed:
- Multi-step wizard correctness depends on button state, step transitions, inline validation, and progressive disclosure.

What to verify:
- Moves through each wizard step in order
- Reads required prompts from screen rather than assuming field order
- Handles validation before advancing
- Reaches final generated result page or output state

### 7. Use The Site On Mobile Viewport

Why computer use is needed:
- Responsive issues, hidden navigation, sticky elements, and focus behavior are UI-only failure modes.

What to verify:
- Opens nav/menu correctly at narrow width
- Can still access chat, audit, contact, and plan flows
- Handles obscured buttons, sticky footers, and modal overflow

## P1 Scenarios Worth Testing With Computer Use

### 8. Contact And Booking Flow Completion

Verify:
- Agent finds the correct CTA
- Completes the visible form
- Handles success/error states
- Uses real rendered fallback if booking widget or URL is unavailable

### 9. Consent Banner / Overlay Interference

Verify:
- Agent notices cookie or analytics consent UI
- Dismisses or configures it without breaking primary task flow
- Does not repeatedly click blocked elements behind overlays

### 10. Case Studies And Empty-State Navigation

Verify:
- Agent can interpret an empty state correctly
- Follows the intended alternate CTA instead of treating empty state as failure

### 11. Back / Forward / Refresh Resilience

Verify:
- Agent remains oriented after route changes, refresh, or accidental back navigation
- Recovers session state or restarts intentionally

### 12. Admin-Side Content Editing

Use only if agent mode is expected to operate in admin workflows.

Verify:
- Login/session handling
- CRUD flows for agent templates, variants, FAQs, or industry probing
- Save confirmation and visible persisted changes

## P2 Scenarios

These are useful but not release-gating unless agent mode is explicitly expected to support them.

- File upload flows
- Media selection flows
- Long-scroll page interpretation
- Multi-tab behavior
- Clipboard-based share flows
- Download verification

## Scenario Design Principles

Every computer use scenario should be authored to test one of these hard problems:

- Ambiguous UI targeting: multiple similar buttons or fields
- Hidden state: collapsed sections, modals, off-screen content
- Timing uncertainty: SSE, loading, disabled buttons, delayed rendering
- Recovery pressure: validation errors, empty states, or stalls
- Context carryover: continuing after navigation, refinement, or follow-up

Avoid scenarios that reduce to "click obvious button once and assert text exists." Those usually belong in ordinary Playwright coverage, not an agent-mode benchmark.

## Suggested Rubric Per Test Case

Score each test 0-2 per dimension:

- `2`: correct and robust
- `1`: completed with inefficiency or weak recovery
- `0`: failed or unsafe

Suggested dimensions per case:

- Goal completion
- UI grounding
- Interaction correctness
- Async handling
- Recovery
- Efficiency

Suggested interpretation:

- `10-12`: ready
- `7-9`: usable but brittle
- `0-6`: not reliable enough for agent mode

## Minimal Release-Gating Set

If you need a strict short list before enabling agent mode, gate on these six:

1. Complete agent chat intake from landing page
2. Recover from chat stall or slow stream
3. Open generated full plan from chat UI
4. Refine one plan section and apply the change
5. Complete guided audit wizard end-to-end
6. Complete the primary flow on mobile viewport

If the system cannot pass these consistently, it is not ready to claim agent-mode usability.

## Mapping To Existing Coverage

Existing automated coverage already handles much of the non-computer-use surface:

- `tests/agent-*.test.ts`
- `tests/conversation*.test.ts`
- `tests/chat-evals*.test.ts`
- `e2e/agent-chat.spec.ts`
- `e2e/guided-audit.spec.ts`

The computer use suite should sit above those tests and answer a narrower question:

> Can an agent perceive the live interface, choose correct actions from visible state, and finish the task like a real user?

## Recommended Next Step

Turn the six release-gating scenarios into explicit runbooks with:

- start URL
- user goal
- allowed recovery behavior
- hard fail conditions
- expected end state
- scoring sheet

That will give you a repeatable benchmark for deciding whether agent mode is actually usable, not just technically functional.

Those runbooks now live in `docs/AGENT_COMPUTER_USE_RUNBOOKS.md`.
