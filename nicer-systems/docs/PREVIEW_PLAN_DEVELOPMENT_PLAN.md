# Preview Plan Agent — Development Plan

**Date**: 2026-03-21
**Status**: Partially implemented — update before using as an execution source
**Scope**: All gaps, deferred features, and underdeveloped areas in the Preview Plan agent system

---

## Current State Summary

The preview plan agent is a 6-stage Gemini pipeline (intake → workflow → automation → dashboard → ops_pulse → roadmap) with three entry points (SSE chat, form demo, guided audit wizard), plan storage/sharing, section refinement, and email delivery. The **core pipeline works** but has significant gaps in UX polish, persistence, test coverage, and deferred features.

---

## Phase 1: Critical Fixes (Bugs & Broken Flows)

These are things that are broken or will fail in production today.

### 1A. Fix PlanWithRefine roadmap handler
- **File**: `app/(marketing)/plan/[id]/PlanWithRefine.tsx`
- **Status**: Completed
- **Notes**: `getSectionContent()` now formats `plan.roadmap.phases` into readable text for roadmap refinement.

### 1B. Split refinement preview from persistence
- **Files**: `app/api/agent/refine/route.ts`, `app/api/agent/refine/apply/route.ts`, `hooks/useRefineSection.ts`, `components/marketing/SectionRefiner.tsx`
- **Status**: Completed
- **Notes**: Preview generation now happens through `/api/agent/refine`, while accepted edits persist only through `/api/agent/refine/apply` after the user clicks Apply.

### 1C. Make refinement saves transactional
- **File**: `lib/firestore/plans.ts`
- **Status**: Completed
- **Notes**: `savePlanRefinement()` now uses a Firestore transaction so version increments and version-history writes stay consistent under concurrent saves.

### 1D. Fix conversation streaming — use generateContentStream
- **File**: `lib/agents/conversation.ts`
- **Status**: Completed
- **Notes**: `generateConversationalResponse()` now uses `generateContentStream()` and yields chunks during conversational phases.

### 1E. Add email unsubscribe link
- **File**: `lib/agents/email-template.ts`
- **Status**: Completed
- **Notes**: Preview-plan emails now include an unsubscribe link using the existing tokenized route.

---

## Phase 2: UX Polish (User-Facing Gaps)

### 2A. Add per-stage progress feedback during plan build
- **Files**: `components/marketing/ChatPlanCard.tsx`, `hooks/useSSEChat.ts`
- **Issue**: During the 30s build phase, users see "Analyzing your bottleneck..." then wait. Section completions stream in, but there's no progress bar or stage indicator
- **Fix**: Add a progress tracker component showing 6 stages with checkmarks/spinners as each completes. The SSE events already carry `plan_section` with the stage key
- **Effort**: Medium

### 2B. Add streaming to guided audit wizard
- **File**: `components/marketing/GuidedAuditWizard.tsx`, `app/api/agent/audit/route.ts`
- **Issue**: Audit wizard calls `runAgentChain()` (non-streaming) and blocks for ~30s with only "Generating audit..." spinner
- **Fix**: Switch audit route to SSE with `runAgentChainStreaming()`, add `useSSEChat`-style hook, show section-by-section reveal
- **Effort**: Large

### 2C. Add "retry failed section" UI
- **Files**: `components/marketing/PlanDisplay.tsx`, `components/marketing/SectionRefiner.tsx`
- **Issue**: When a stage fails, fallback empty data is shown with a warning, but there's no button to regenerate just that section
- **Fix**: Add "Retry" button on failed sections that calls `/api/agent/refine` with a canned prompt like "Regenerate this section from scratch"
- **Effort**: Medium

### 2D. Wire PlanVersionDiff component
- **File**: `components/marketing/PlanVersionDiff.tsx`
- **Issue**: Built but never imported — SectionRefiner uses an inline diff instead
- **Fix**: Either integrate into PlanWithRefine as a version history viewer or remove the dead component
- **Effort**: Small

### 2E. Add markdown rendering in chat
- **Files**: `components/marketing/ChatMessages.tsx`, `components/marketing/ChatPlanCard.tsx`
- **Issue**: Agent responses and plan content render as plain text — formatting, lists, and emphasis are lost
- **Fix**: Add lightweight markdown renderer (e.g., `react-markdown` or custom minimal parser for bold/lists/links only)
- **Effort**: Medium

---

## Phase 3: Reliability & Resilience

### 3A. Add fallback to local agent templates
- **File**: `lib/agents/runner.ts`
- **Status**: Completed
- **Notes**: Runner now merges Firestore templates with local `agents/*.md` files and logs a warning when Firestore is empty or unavailable.

### 3B. Add template invalidation on admin update
- **File**: `lib/actions/agent-templates.ts`, `lib/agents/runner.ts`
- **Status**: Completed
- **Notes**: Admin template updates already call `invalidateTemplateCache()` after save.

### 3C. Add plan deduplication / caching
- **File**: `lib/agents/runner.ts`, `app/api/agent/chat/route.ts`
- **Issue**: Same input generates a new plan every time — costs 6+ Gemini API calls with no dedup
- **Fix**: Hash the `AgentRunInput`, check Firestore for recent plans with matching hash (within 24h). Return cached plan if found. Add `input_hash` field to plans collection
- **Effort**: Medium

### 3D. Harden extraction fallbacks
- **File**: `lib/agents/conversation.ts`
- **Issue**: Gemini extraction can silently fail (`catch` at line 434 falls back to regex-only). The regex heuristics miss many natural language patterns
- **Fix**: Log extraction failures to analytics. Add more regex patterns for common bottleneck descriptions. Add a "Did I get that right?" confirmation when extraction uncertainty is high
- **Effort**: Medium

### 3E. Add SSE reconnection logic
- **File**: `hooks/useSSEChat.ts`
- **Issue**: If SSE connection drops during building phase, the plan is lost with no recovery. The 30s timeout exists but there's no auto-reconnect
- **Fix**: On connection drop during `building`, show "Connection lost — reconnecting..." and retry with the same input. Store partial plan sections already received
- **Effort**: Large

---

## Phase 4: Test Coverage

### 4A. Unit tests for phase detection heuristics
- **Files**: New test file `tests/conversation-phase.test.ts`
- **Cover**: `detectPhase()` all transitions, `hasRevisionSignal()` patterns, `extractHeuristicIntakeData()` all inferrence functions, 8-message safety valve
- **Effort**: Medium

### 4B. Unit tests for agent runner pipeline
- **Files**: New test file `tests/agent-runner.test.ts`
- **Cover**: Full chain with mocked Gemini, parallel stage execution, graceful degradation (one stage fails), template cache behavior, model fallback logic
- **Effort**: Large

### 4C. Integration tests for refinement flow
- **Files**: New test file `tests/refinement-flow.test.ts`
- **Updated target**: Cover `/api/agent/refine` preview route, `/api/agent/refine/apply` persistence route, Firestore version history updates, section replacement correctness, and roadmap support
- **Effort**: Medium

### 4D. E2E tests for guided audit
- **Files**: New test file `e2e/guided-audit.spec.ts`
- **Cover**: 4-step wizard form completion, validation errors, plan generation, result display, share link
- **Effort**: Medium

### 4E. Add golden test cases for agent output quality
- **Files**: New directory `tests/golden/`, new test file `tests/agent-quality.test.ts`
- **Cover**: Define 3-5 canonical inputs with expected output structure. Run agent chain against them (mocked Gemini with saved responses). Assert output schema compliance, minimum section sizes, cross-reference consistency
- **Effort**: Large

---

## Phase 5: Deferred Features

### 5A. PDF export
- **Files**: `app/api/plans/export/route.ts`, new `lib/plans/export-pdf.ts`
- **Issue**: Export route exists for markdown only. PDF is listed but not implemented. PlanDisplay links to `?format=pdf` but it's not handled
- **Fix**: Add PDF generation using a headless renderer (e.g., `@react-pdf/renderer` or Puppeteer) or convert markdown → PDF server-side
- **Effort**: Large

### 5B. Proposal generator
- **Issue**: Listed as deferred in CLAUDE.md. The idea is to convert a PreviewPlan into a formal client-facing proposal document
- **Depends on**: PDF export (5A)
- **Fix**: Add a 7th agent stage (`proposal_writer`) that takes the full PreviewPlan and generates a formatted proposal with pricing estimates, timeline, and scope of work
- **Effort**: XL

### 5C. Chat-driven refinement (conversational)
- **Issue**: Refinement currently requires leaving the chat and using the SectionRefiner UI. In the follow_up phase, users can ask questions but can't say "make the workflow simpler" and have it applied
- **Fix**: In the follow_up phase, detect refinement intent in user messages. Extract the target section and feedback. Call `refinePlanSection()` and emit the updated section via SSE
- **Effort**: Large

### 5D. CRM sync
- **Issue**: Listed as deferred. Leads exist only in Firestore
- **Fix**: Add webhook-based sync to HubSpot/Close/ClickUp when leads are created or status changes. Configuration in admin settings
- **Effort**: XL

### 5E. Agent prompt A/B testing
- **Issue**: No way to compare prompt variations. Template editor has a test runner but no comparison or scoring
- **Fix**: Extend the experiments framework to support prompt variants. Store variant key on plan docs. Track conversion rate (plan → email capture → booking) by variant
- **Effort**: Large

---

## Phase 6: Observability & Operations

### 6A. Add agent pipeline metrics
- **Files**: `lib/agents/runner.ts`, `lib/analytics.ts`
- **Issue**: No visibility into stage durations, failure rates, or Gemini API costs
- **Fix**: Log per-stage timing and success/failure to analytics. Add admin dashboard widget showing: avg plan generation time, stage failure rates, plans generated/day
- **Effort**: Medium

### 6B. Add refinement analytics
- **Files**: `hooks/useRefineSection.ts`, `lib/analytics.ts`
- **Issue**: No tracking of which sections get refined most, what feedback is given, or whether refinements improve user satisfaction
- **Fix**: Track events: `plan_section_refine_start`, `plan_section_refine_complete`, `plan_section_refine_apply` with section key and feedback length
- **Effort**: Small

### 6C. Add plan quality scoring
- **Files**: New `lib/agents/quality-score.ts`
- **Issue**: No automated assessment of plan quality. Validation only checks cross-references, not content depth or actionability
- **Fix**: Score plans on: section completeness (non-empty fields), specificity (industry terms present), actionability (concrete next steps), coverage (all failure modes addressed). Display score in admin dashboard
- **Effort**: Medium

---

## Priority Matrix

| Phase | Items | Risk if Skipped | Effort |
|-------|-------|-----------------|--------|
| **Phase 1** | 1A-1D | Broken flows, compliance risk | ~1 week |
| **Phase 2** | 2A-2E | Poor UX, user drop-off | ~2 weeks |
| **Phase 3** | 3A-3E | Production failures, wasted API costs | ~2 weeks |
| **Phase 4** | 4A-4E | Regressions, no confidence in changes | ~2 weeks |
| **Phase 5** | 5A-5E | Missing revenue features | ~4-6 weeks |
| **Phase 6** | 6A-6C | Flying blind on quality/usage | ~1 week |

**Recommended order**: Phase 1 → Phase 3A/3B → Phase 2A → Phase 6A/6B → Phase 4A/4B → Phase 2 (rest) → Phase 3 (rest) → Phase 4 (rest) → Phase 5 → Phase 6C

---

## Dependency Graph

```
Phase 1 (critical fixes)
  ├─ 1A (roadmap handler) — standalone
  ├─ 1B (refinement persistence) — standalone
  ├─ 1C (conversation streaming) — standalone
  └─ 1D (unsubscribe link) — standalone

Phase 2 (UX)
  ├─ 2A (build progress) — depends on 1C working
  ├─ 2B (audit streaming) — can start independently
  ├─ 2C (retry failed sections) — depends on 1B
  ├─ 2D (version diff) — depends on 1B
  └─ 2E (markdown in chat) — standalone

Phase 3 (resilience)
  ├─ 3A (template fallback) — standalone
  ├─ 3B (cache invalidation) — standalone
  ├─ 3C (plan dedup) — standalone
  ├─ 3D (extraction hardening) — standalone
  └─ 3E (SSE reconnect) — depends on 2A

Phase 4 (tests)
  ├─ 4A (phase detection) — should follow 1C
  ├─ 4B (runner pipeline) — should follow 3A
  ├─ 4C (refinement flow) — should follow 1B
  ├─ 4D (audit e2e) — should follow 2B
  └─ 4E (golden tests) — standalone

Phase 5 (features)
  ├─ 5A (PDF export) — standalone
  ├─ 5B (proposal generator) — depends on 5A
  ├─ 5C (chat refinement) — depends on 1B, 1C
  ├─ 5D (CRM sync) — standalone
  └─ 5E (prompt A/B) — standalone

Phase 6 (observability)
  ├─ 6A (pipeline metrics) — standalone
  ├─ 6B (refinement analytics) — depends on 1B
  └─ 6C (quality scoring) — standalone
```

---

## Total Items: 27

| Priority | Count | Category |
|----------|-------|----------|
| Critical (Phase 1) | 4 | Bugs & compliance |
| High (Phase 2-3) | 10 | UX + resilience |
| Medium (Phase 4) | 5 | Test coverage |
| Low (Phase 5-6) | 8 | Features + observability |
