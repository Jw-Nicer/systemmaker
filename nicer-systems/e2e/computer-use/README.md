# Computer-Use Scenario Harness

Executable implementation of the release-gating runbooks defined in
`docs/AGENT_COMPUTER_USE_RUNBOOKS.md`, scored against the dimensions in
`docs/AGENT_COMPUTER_USE_EVAL_CRITERIA.md`.

## What this is — and is not

This harness drives the same Playwright browser used by the rest of the
e2e suite through each runbook's happy-path (and its permitted recovery
step). It counts actions, classifies them against the runbook's
`optimal_action_estimate`, and writes a structured scorecard so runs are
comparable release-over-release.

It is **not** a full agent-mode benchmark. It is a deterministic
ceiling: if the scripted path through the UI can't reach a passing
scorecard, a real agent won't either. Once a runbook passes here, the
next layer is to replace the scripted driver with an actual agent and
grade the same scorecard.

## Running

```bash
# Runbooks 1, 2, 6, 7 run with no setup (self-contained mocks).
npm run test:computer-use

# Runbooks 3, 4, 5 need a seeded plan doc in Firestore.
npm run seed:e2e-plan                # writes plans/e2e-computer-use-plan
E2E_PLAN_ID=e2e-computer-use-plan npm run test:computer-use

# Single runbook:
npm run test:computer-use -- --grep "runbook-1"
```

Scorecards are written to `test-results/computer-use/<runbook>-<iso>.json`.
The harness unit tests (scoring math) live in
`tests/computer-use-harness.test.ts` and run under `npm run test`.

## Covered runbooks

| Runbook | Spec | Status |
|---|---|---|
| 1 — Chat intake from landing page | `runbook-1-chat-intake.spec.ts` | Covered |
| 2 — Recover from chat stall or slow stream | `runbook-2-stall-recovery.spec.ts` | Covered |
| 3 — Open and inspect the generated full plan | `runbook-3-open-plan.spec.ts` | Covered (needs `E2E_PLAN_ID`) |
| 4 — Refine one plan section and apply it | `runbook-4-refine-section.spec.ts` | Covered (needs `E2E_PLAN_ID`) |
| 5 — Share, export, or email the plan | `runbook-5-share-plan.spec.ts` | Covered (needs `E2E_PLAN_ID`) |
| 6 — Guided audit wizard | `runbook-6-guided-audit.spec.ts` | Covered |
| 7 — Primary flow on mobile viewport | `runbook-7-mobile-intake.spec.ts` | Covered |

### Plan seeding

Runbooks 3, 4, 5 start on `/plan/{id}`, which is a server component that
reads the plan doc directly from Firestore — not routable through
Playwright mocks. `scripts/seed-e2e-plan.ts` writes a known plan doc via
the Admin SDK. The doc ID is stable (`e2e-computer-use-plan` by default)
so re-runs are idempotent.

Runbook 4 mocks `/api/agent/refine` and `/api/agent/refine/apply` so the
seeded doc stays clean across runs — applies are intercepted and never
hit Firestore.

### Adding a new runbook

The harness (`harness.ts`, `types.ts`) is already general — adding a new
runbook is:

1. Define a `RunbookDef` constant.
2. Build a spec that instantiates `TrackedSession`, wraps every page
   interaction with `session.click/fill/selectOption`, calls
   `markGoalReached()` + `markFinalState()`, and ends with `finalize()`.
3. Assert the hard-fail conditions the runbook names (no human
   intervention, no wrong targets, etc).

## Scoring

See `harness.ts → scoreDimensions()` for the exact rules. The total
rolls up to the runbook doc's readiness bands:

- `10-12` → `ready`
- `7-9` → `brittle`
- `0-6` → `not_reliable`
