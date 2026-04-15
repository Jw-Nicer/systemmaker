# Agent Mode Computer Use Runbooks

**Doc Date:** 2026-04-15

## Purpose

This document turns the release-gating computer-use criteria into executable runbooks. Each runbook defines the exact task, allowed recovery behavior, hard fail conditions, expected end state, and scorecard for evaluating whether an agent can operate the live product through the browser like a user.

Use these runbooks alongside `docs/AGENT_COMPUTER_USE_EVAL_CRITERIA.md`.

## Shared Scoring Sheet

Score each dimension `0-2`:

- `2`: correct and robust
- `1`: completed with inefficiency or weak recovery
- `0`: failed, brittle, or unsafe

Dimensions:

- Goal completion
- UI grounding
- Interaction correctness
- Async handling
- Recovery
- Efficiency

Interpretation:

- `10-12`: ready
- `7-9`: usable but brittle
- `0-6`: not reliable enough

## Shared Rules

Apply these rules to every run:

- The agent must use visible UI state, not hidden assumptions about DOM order.
- The agent may use at most one bounded recovery path unless the scenario explicitly allows more.
- Destructive or privacy-sensitive actions are out of scope unless the runbook explicitly includes them.
- A run fails if the agent loops, repeats the same blocked action, or gets stuck without recognizing the stall.
- Record `success`, `time_to_complete`, `actions_taken`, `optimal_action_estimate`, `recovery_attempts`, `wrong_clicks_or_wrong_targets`, `validation_errors_triggered`, `stalls_or_timeouts`, `whether_human_intervention_was_needed`, and `final_state_correctness`.

## Runbook 1: Complete Agent Chat Intake From Landing Page

- Start URL: `/`
- User goal: reach the preview-plan flow, submit realistic intake messages, and drive the chat to the build-ready or completed state
- Preconditions: analytics consent banner may be visible; backend may stream intermediate responses
- Optimal path estimate: `6-10` actions
- Allowed recovery behavior:
  - Dismiss or configure consent UI once if it blocks interaction
  - If the send action appears blocked, re-check the active chat input and retry once
- Hard fail conditions:
  - Types into the wrong field
  - Sends duplicate messages because it misreads streaming state
  - Never reaches the active chat flow
  - Requires a human to identify the correct input or CTA
- Expected end state:
  - Chat contains at least one user message and one agent response
  - UI progresses to confirmation, building, or completed preview-plan state
  - No obvious mis-targeted actions occurred
- Scoring focus:
  - Did it locate the correct chat area?
  - Did it wait for visible response completion before continuing?
  - Did it stay oriented while the chat content moved or grew?

## Runbook 2: Recover From Chat Stall Or Slow Stream

- Start URL: `/`
- User goal: detect an in-progress or stalled chat build, recover using visible UI, and return the flow to a usable state
- Preconditions: the scenario harness should inject delayed streaming or a partial build state
- Optimal path estimate: `4-8` actions
- Allowed recovery behavior:
  - Wait through one reasonable loading window
  - Use one visible recovery action such as `Start Over` if the UI indicates failure or stall
  - Retry the task once after reset
- Hard fail conditions:
  - Repeatedly clicks send while the build is still active
  - Waits indefinitely without recognizing the stall
  - Resets the flow without visible justification
  - Ends in a broken or ambiguous state
- Expected end state:
  - The stalled flow is either successfully resumed or intentionally reset to a clean chat state
  - The agent can send a fresh message after recovery
- Scoring focus:
  - Whether the agent distinguishes “still building” from “stalled”
  - Whether it uses the visible recovery affordance instead of random navigation

## Runbook 3: Open And Inspect The Generated Full Plan

- Start URL: `/`
- User goal: complete enough of the chat or wizard flow to reach a generated plan and then open the full shareable plan page
- Preconditions: scenario may begin from a state with a visible `Open shareable plan`, `View full plan`, or equivalent CTA
- Optimal path estimate: `3-6` actions after generation
- Allowed recovery behavior:
  - Scroll once if the primary plan CTA is off-screen
  - Reopen the plan page once if the first navigation is interrupted
- Hard fail conditions:
  - Confuses in-chat preview content with the full plan page
  - Lands on the wrong route and does not notice
  - Claims success without verifying rendered plan sections
- Expected end state:
  - Browser is on the full plan route
  - Key sections such as scope, workflow, KPIs, alerts/actions, or roadmap are visibly present
  - The agent can correctly identify that it is on the full plan page rather than the chat preview
- Scoring focus:
  - Route awareness
  - Verification of rendered content rather than URL alone

## Runbook 4: Refine One Plan Section And Apply It

- Start URL: `/plan/{seeded-or-generated-plan-id}`
- User goal: refine one visible section through the UI and verify the rendered result updates
- Preconditions: the plan page must expose section-level refinement controls
- Optimal path estimate: `6-12` actions
- Allowed recovery behavior:
  - Expand the correct section if controls are collapsed
  - Retry preview generation once if the first attempt visibly errors
- Hard fail conditions:
  - Opens the wrong section and applies a refinement there
  - Applies changes without waiting for preview output
  - Cannot distinguish preview from applied state
  - Leaves the plan unchanged while claiming success
- Expected end state:
  - The targeted section shows updated rendered content
  - The agent can point to the changed section in the UI
  - No unrelated section was modified
- Scoring focus:
  - Correct targeting of section controls
  - Waiting for preview and apply states
  - Verifying post-apply rendering

## Runbook 5: Share, Export, Or Email The Plan

- Start URL: `/plan/{seeded-or-generated-plan-id}`
- User goal: complete one outbound plan action through visible controls and confirm the visible success outcome
- Preconditions: at least one share/email/export control is present
- Optimal path estimate: `3-8` actions
- Allowed recovery behavior:
  - Fill required fields after one visible validation failure
  - Retry the submit action once if the UI clearly reports a transient error
- Hard fail conditions:
  - Uses the wrong action for the requested task
  - Ignores validation or success/error messaging
  - Claims completion without confirming the UI outcome
- Expected end state:
  - The requested outbound action completes with visible confirmation
  - Required fields were correctly filled
  - The agent does not trigger unrelated outbound actions
- Scoring focus:
  - Modal and form correctness
  - Interpretation of confirmation state
  - Avoidance of unsafe or duplicate submissions

## Runbook 6: Complete The Guided Audit Wizard

- Start URL: `/audit`
- User goal: move through the full wizard, handle validation correctly, and reach the generated audit result state
- Preconditions: multi-step wizard and result page are available
- Optimal path estimate: `10-18` actions
- Allowed recovery behavior:
  - Correct one validation failure per step if required fields were missed
  - Use `Back` once to recover from a wrong answer or wrong step
- Hard fail conditions:
  - Assumes field order without reading labels
  - Advances with missing required inputs and does not recover
  - Gets lost between wizard steps
  - Reaches a terminal error without recognizing it
- Expected end state:
  - All required steps are completed
  - The generated result state is visible
  - A shareable plan CTA or equivalent result action is present
- Scoring focus:
  - Label-driven input selection
  - Step-transition awareness
  - Validation recovery

## Runbook 7: Complete A Primary Flow On Mobile Viewport

- Start URL: `/`
- User goal: complete one core journey on a narrow viewport, preferably chat intake or guided audit entry
- Preconditions: viewport should be set to a common mobile size such as `390x844`
- Optimal path estimate: `1.2x-1.5x` desktop path
- Allowed recovery behavior:
  - Open mobile navigation once if needed
  - Scroll to reveal obscured controls
  - Close one blocking modal or banner
- Hard fail conditions:
  - Cannot find the primary navigation or action because of responsive layout changes
  - Repeatedly targets hidden or covered controls
  - Gets trapped in a modal or off-canvas state
- Expected end state:
  - The selected primary flow completes on mobile
  - No critical action was blocked by responsive layout issues
- Scoring focus:
  - Responsive navigation handling
  - Scroll and viewport awareness
  - Correct interaction with sticky or overlay UI

## Suggested Harness Notes

When implementing these as agent-mode benchmarks:

- Seed deterministic chat and audit responses for release-gating runs
- Include one happy-path and one degraded-path variant for the chat and wizard scenarios
- Capture screenshots or short recordings at failure points
- Store action counts and recovery metadata with each run result

## Exit Criteria

Agent mode is release-ready for this app only if:

- All six release-gating scenarios pass consistently
- P0 median action count stays within `1.5x` optimal
- No safety violations occur
- Recovery paths are bounded and intentional rather than accidental
