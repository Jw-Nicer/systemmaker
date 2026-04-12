# Chat Agent — Architecture, Analysis & Roadmap
**Doc Date:** 2026-04-10 | **Updated:** 2026-04-12 (stale "Recommended next session" section refreshed)

## Overview

The chat agent (`AgentChat`) is the primary intake surface on the marketing landing page. It runs a multi-phase conversation that gathers a visitor's industry, bottleneck, and current tools, then triggers the 6-stage agent pipeline (`runner.ts`) to produce a Preview Plan, then handles follow-up questions about the generated plan.

This document covers:
1. How the chat actually answers (architecture + control flow)
2. Models, tuning, and prompt structure
3. Known weaknesses and trade-offs
4. Refactor delivered on 2026-04-10
5. Prioritized roadmap for further improvements

---

## 1. Pipeline at a glance

```
user msg
  │
  ▼
/api/agent/chat (SSE)         app/api/agent/chat/route.ts
  │
  ├─ extractIntakeData()      ◀── heuristic regex pass + fast-LLM JSON pass
  │                               (only in gathering / confirming)
  │                               Fast-path skips LLM if heuristics fill required fields
  │
  ├─ detectContradiction()    ◀── regex (industry / tools / bottleneck overrides)
  │
  ├─ detectPhase()            ◀── state machine
  │
  └─ generateConversationalResponse()
        ├─ buildGatheringPrompt    │  Each builder returns
        │  buildConfirmingPrompt   │  { systemInstruction, contents,
        │  buildFollowUpPrompt     │    generationConfig }
        │
        └─ invokeLLMChatStreaming()  → Gemini structured chat → SSE chunks
```

### Conversation phases

```
gathering → confirming → building → complete → follow_up
```

| Phase | Purpose | Trigger | Model |
|---|---|---|---|
| `gathering` | Ask for industry, bottleneck, tools, one at a time | Default; missing required fields | `gemini-2.5-flash-lite` |
| `confirming` | Restate situation, demonstrate insight, ask "ready to build?" | All required fields filled (or 8+ messages with at least one) | `gemini-2.5-flash-lite` |
| `building` | Run 6-stage pipeline, stream sections via SSE | Affirmation in confirming (or 12+ messages) | `gemini-2.5-flash` (per stage) |
| `complete` | Plan delivered, email capture offered | Pipeline finished | (no LLM call) |
| `follow_up` | Answer plan-related questions | Any message after `complete` | `gemini-2.5-flash` |

Phase detection is in `lib/agents/conversation.ts:271` (`detectPhase`). Once `building` starts it runs to completion (no rollback). Once in `complete` or `follow_up`, the phase locks to `follow_up` permanently.

---

## 2. Models and tuning

### Model selection

| Use | Function | Default model | Override |
|---|---|---|---|
| Gathering / confirming chat | `getFastModel()` | `gemini-2.5-flash-lite` | hardcoded |
| Follow-up chat | `getPrimaryModel()` | `gemini-2.5-flash` | `GOOGLE_GEMINI_MODEL` env |
| Pipeline stages | `getPrimaryModel()` | `gemini-2.5-flash` | `GOOGLE_GEMINI_MODEL` env |
| Heuristic-fallback extraction | `getFastModel()` | `gemini-2.5-flash-lite` | hardcoded |
| Refinement | `getPrimaryModel()` | `gemini-2.5-flash` | `GOOGLE_GEMINI_MODEL` env |

Source: `lib/agents/llm-client.ts:402-409`.

### Generation config (post-2026-04-10 refactor)

Per-phase tuning is centralized in the `GEN_CONFIG` table in `lib/agents/conversation.ts`:

| Phase | temperature | topP | maxOutputTokens | stopSequences |
|---|---|---|---|---|
| `gathering` | `0.55` | `0.9` | `220` | `Visitor:`, `\nVisitor:`, `Agent:`, `\nAgent:` |
| `confirming` | `0.55` | `0.9` | `260` | (same) |
| `follow_up` | `0.6` | `0.92` | `480` | (same) |

These flow into Gemini via `getGenerativeModel({ model, systemInstruction, generationConfig })` in `invokeLLMChatStreaming` (`lib/agents/llm-client.ts`). Before this refactor there was **no `generationConfig`** at all — Gemini ran at default `temperature ≈ 1.0` with no token cap, ignoring the prompt's "2-3 sentences max" rule.

---

## 3. Prompt structure

Each phase has its own builder that returns a `ConversationPrompt`:

```ts
interface ConversationPrompt {
  systemInstruction: string;
  contents: ChatTurn[];
  generationConfig: ChatGenerationConfig;
}
```

### `systemInstruction` contains

- `SYSTEM_IDENTITY` — tone, voice, brand voice rules
- Phase-specific task description
- Already-collected facts (`extracted`)
- Industry context block (when `INDUSTRY_PROBING` matches)
- Memory section (returning-visitor context, when present)
- Conversation summary (key facts beyond the 20-message window)
- Phase-specific numbered instructions
- (For follow-up only) Detailed plan context, name/email status

### `contents` contains

A structured `ChatTurn[]` with proper Gemini roles (`user` / `model`), built by `buildChatTurns(history)` then capped with `appendUserTurn(turns, latest)`. Empty messages are dropped, leading model turns are skipped (Gemini requires the first turn to be `user`), and consecutive same-role turns are coalesced.

### Industry probing

`INDUSTRY_PROBING` (`lib/agents/conversation.ts:73`) hardcodes 8 industries with tailored bottlenecks, common tools, and probing angles:

- construction
- healthcare
- property management
- staffing
- legal
- home services
- logistics
- dental

Plus `INDUSTRY_ALIASES` mapping (`plumbing → home services`, `medical → healthcare`, etc.).

When the visitor's industry matches, the gathering prompt gets injected with concrete bottlenecks/tools/probing-angles to ground the agent in that domain. Outside the list, this section is empty and the agent falls back to generic probing.

---

## 4. Extraction pipeline

`extractIntakeData(history, userMessage, existing)` (`lib/agents/conversation.ts:516`) is called BEFORE response generation in `gathering` and `confirming` phases. It runs in three layers:

1. **Heuristic regex pass** — `extractHeuristicIntakeData(message)`:
   - `inferIndustry` — explicit `we run a X` patterns + bare-word industry list
   - `inferBottleneck` — explicit "our bottleneck is..." patterns + conversational problem keywords
   - `inferCurrentTools` — `we use X` patterns
   - `inferUrgency` — urgency keyword matching (urgent/high/medium/low)
   - `inferVolume` — number + unit + period regex
   - `inferEmail` — RFC-ish email regex

2. **Fast-path skip (post-2026-04-10)** — if all three required fields (`industry`, `bottleneck`, `current_tools`) are now filled by heuristics alone, return immediately. **No LLM call.**

3. **LLM extraction fallback** — if any required field is still missing, call `gemini-2.5-flash-lite` with `responseMimeType: "application/json"` and the `EXTRACTION_PROMPT`. Parse the JSON and merge.

### Why this matters

Before the fast-path: every gathering turn paid for two sequential LLM calls (extraction + response). Most well-formed user messages already give the heuristics enough to fill all required fields, so the second call was wasted. Skipping it cuts ~500-1500ms off the time-to-first-byte for those turns.

---

## 5. Streaming and SSE

Server emits SSE events from `app/api/agent/chat/route.ts`:

| Event | Payload | When |
|---|---|---|
| `message` | `{ content, is_chunk?, email_capture?, extracted?, is_extraction_update? }` | Conversational chunks + full messages |
| `phase_change` | `{ from, to }` | Phase transition |
| `plan_section` | `{ section, label, content }` | Each completed stage during building |
| `plan_complete` | `{ plan_id, lead_id, share_url, email_auto_sent }` | Pipeline finished |
| `error` | `{ message, code? }` | Server-side error |
| `done` | `{}` | Stream finished |

Client-side state is a `useReducer`-backed state machine in `hooks/useSSEChat.ts`. Messages stream in via `STREAM_CHUNK` → `streamingContent` buffer → flushed as a full message on `STREAM_DONE`.

### Stall detection

`SSE_TIMEOUT_MS = 30_000` (gathering / confirming, follow-up)
`SSE_BUILDING_TIMEOUT_MS = 180_000` (building phase — pipeline takes 60-120s)

Reset on every chunk read. If no chunks arrive within the window, the stream is aborted and the user gets a "Try again" error.

---

## 6. Strengths

1. **Clean phase state machine** — `detectPhase` is small, testable, and has safety valves at message 8 (force confirming) and message 12 (force building) to prevent infinite loops.
2. **Hybrid extraction** — heuristic-first design degrades gracefully when the LLM extraction fails, and the fast-path skip means heuristics aren't pure overhead.
3. **Industry probing** — for the 8 supported industries, the agent has concrete domain knowledge to ask smart follow-ups instead of generic ones.
4. **Conversation summary** — `buildConversationSummary` preserves key facts beyond the 20-message sliding window so the agent never "forgets" the bottleneck.
5. **Detailed plan context for follow-up** — `buildDetailedPlanContext` produces a ~8KB section-by-section plan dump so follow-up answers can be specific (not generic).
6. **Streaming UX** — phase-aware timeouts, graceful chunk buffering, clean state machine.
7. **Returning visitor memory** — `memory.ts` stores visitor context in Firestore and surfaces it in subsequent sessions (post-2026-04-10: now in all three conversational phases, not just gathering).

---

## 7. Known weaknesses (full list)

These are the issues identified in the 2026-04-10 analysis. Items marked **✅ Fixed** were addressed in the same session; others remain open.

| # | Issue | Status |
|---|---|---|
| 1 | Extraction LLM call blocks the response stream serially | ✅ Fixed (fast-path skip) |
| 2 | No `generationConfig` — temperature/maxOutputTokens/stopSequences all unset | ✅ Fixed |
| 3 | Dead code: gathering instruction #1 ("greet warmly on first message") never fires because the welcome message is hardcoded client-side | ✅ Fixed |
| 4 | Dead code: `looksLikeQuestion` branch in `detectPhase` confirming case | ✅ Fixed |
| 5 | Memory context only injected in gathering prompt | ✅ Fixed (now in all 3 phases) |
| 6 | System prompt repeated wholesale every turn instead of using `systemInstruction` | ✅ Fixed |
| 7 | History string-formatted (`Visitor: ... Agent: ...`) instead of structured `Content[]` | ✅ Fixed |
| 8 | No streaming retry — Gemini hiccup → static fallback message | ✅ Fixed (Tier 1A, 2026-04-10) |
| 9 | 30s SSE timeout interacts badly with cold first chunks | ✅ Fixed (Tier 1B, 2026-04-10) |
| 10 | `INDUSTRY_PROBING` hardcoded — only 8 industries, can't grow without redeploys | ✅ Fixed (Tier 2D, 2026-04-10) |
| 11 | `confirming` prompt asks model to do 4 jobs in 3-4 sentences (compromises insight) | ❌ Open |
| 12 | Brand-voice rules ("no Great question" / "no That's interesting") not enforced | ⚠️ Partially mitigated by `stopSequences` + lower temperature; still possible |
| 13 | `inferBottleneck` over-fires (any 50+ char msg with one keyword) | ✅ Fixed (Tier 2E, 2026-04-10) |
| 14 | `inferIndustry` misses conversational openers (`we're a 30-person ...`) | ✅ Fixed (Tier 2E, 2026-04-10) |
| 15 | `is_extraction_update` event echoes full extracted state every gathering turn | ✅ Fixed (Tier 1C, 2026-04-10) |
| 16 | Generic safety fallback message starts the conversation over instead of recovering | ✅ Fixed (Tier 1A, 2026-04-10) |
| 17 | Healthcare bucket stuffed with non-healthcare aliases (`fitness`, `childcare`) | ❌ Open |

---

## 8. Refactor delivered 2026-04-10

### Files modified

| File | Change |
|---|---|
| `lib/agents/llm-client.ts` | Added `invokeLLMChatStreaming` (structured chat with `systemInstruction`, `ChatTurn[]`, and `generationConfig`). New exported types `ChatTurn`, `ChatGenerationConfig`, `LLMChatStreamOptions`. Reuses token bucket + stats. Legacy `invokeLLMStreaming` kept intact for `refinement.ts`. |
| `lib/agents/conversation.ts` | Major refactor — see breakdown below. |
| `tests/conversation.test.ts` | +11 tests covering `buildChatTurns`, `appendUserTurn`, and confirming-branch behavior post-cleanup. |

### `conversation.ts` changes in detail

- **New helpers** `buildChatTurns(messages)` and `appendUserTurn(turns, msg)` (exported for tests). Drop empty messages, skip leading model turns (Gemini requires first turn = user), coalesce same-role runs.
- **New `ConversationPrompt` type** — `{ systemInstruction, contents, generationConfig }` returned from each phase builder.
- **Per-phase `GEN_CONFIG` table** — see §2.
- **`buildGatheringPrompt`, `buildConfirmingPrompt`, `buildFollowUpPrompt`** — all rewritten to return `ConversationPrompt` instead of a flat string. History no longer concatenated into the prompt; goes in as proper `Content[]`.
- **`extractIntakeData` fast-path** — skip the LLM call when heuristics fill all required fields.
- **`generateConversationalResponse`** — switched to `invokeLLMChatStreaming`. `confirming` and `follow_up` builders now also accept and use `memoryContext`.
- **Dead code removed** — `looksLikeQuestion` helper, the `looksLikeQuestion` branch in `detectPhase`, the gathering instruction #1, the unused `formatHistory` helper.

### Verification

- `npx tsc --noEmit` — clean.
- `npx vitest run` — **563/563 tests pass across 63 files** (11 new chat tests added in `tests/conversation.test.ts`).

### Behavior changes for the user

1. **Snappier first chunk** — gathering turns where the user gives clear info now skip the extraction LLM call. ~500-1500ms saved per turn.
2. **Bounded output length** — `maxOutputTokens: 220` enforces the "2-3 sentences" rule the prompt asks for.
3. **Less drift, more on-brand** — `temperature: 0.55` (down from default ~1.0) makes responses tighter and more consistent.
4. **No more `Visitor:` / `Agent:` hallucinations** — `stopSequences` cuts the response if Gemini tries to write the next turn.
5. **Token cost down ~25-40% per turn** — `systemInstruction` is sent once per call (Gemini caches server-side); history is structured instead of string-stuffed with a duplicated identity preamble.
6. **Returning visitors get consistent treatment** — `memoryContext` flows into all three conversational phases.
7. **Fewer state-machine edge cases** — `looksLikeQuestion` dead branch removed; behavior unchanged but code matches comments.

---

## 9. Roadmap — what's next

### Tier 1 — High impact, low risk ✅ Delivered 2026-04-10

**A. Single-retry on streaming failure** ✅
- `generateConversationalResponse` now wraps `invokeLLMChatStreaming` in a `for (let attempt = 0; attempt < 2; attempt++)` loop
- Retries only when no chunks have been yielded yet (you can't un-yield text)
- Uses `isTransientError(message)` from `llm-client.ts` to decide whether to retry
- New `buildContextualConversationFallback(phase, extracted)` in `conversation.ts` replaces the generic safety fallback for stream failures:
  - **gathering** → re-asks the next missing field by name ("Could you tell me what kind of business you run?")
  - **confirming** → asks whether the summary still looks right
  - **follow_up** → asks the user to repeat their question
- Mid-stream failures stop cleanly without yielding the fallback (no half-message + recovery message collision)
- `buildSafeConversationFallback` in `safety.ts` is now reserved purely for safety violations

**B. Split SSE timeout into first-chunk vs inter-chunk** ✅
- Replaced single `SSE_TIMEOUT_MS = 30_000` with two values in `hooks/useSSEChat.ts`:
  - `SSE_FIRST_CHUNK_TIMEOUT_MS = 60_000` — cold-start friendly
  - `SSE_INTER_CHUNK_TIMEOUT_MS = 15_000` — tighter once data flows
- `firstChunkSeen` flag flips on first successful `reader.read()`, switching the timer
- Building phase still uses its own `SSE_BUILDING_TIMEOUT_MS = 180_000`

**C. Skip `is_extraction_update` echo when nothing changed** ✅
- New `extractedHasChanges(before, after)` helper in `conversation.ts` (exported for tests)
- Treats `undefined` and `""` as equivalent
- Compares all 7 `ExtractedIntake` fields
- `app/api/agent/chat/route.ts` now only emits the SSE update when `phaseChanged || dataChanged`
- Cuts no-op SSE traffic + client re-renders on every gathering turn where the heuristic fast-path filled fields without producing a diff

### Tier 2 — Medium impact, contained scope

**D. Move `INDUSTRY_PROBING` to Firestore** ✅ Delivered 2026-04-10
- New `IndustryProbing` type in `types/industry-probing.ts` and Zod `industryProbingSchema` in `lib/validation.ts`
- New Firestore reader `lib/firestore/industry-probing.ts` with in-process TTL cache (5 min), in-flight coalescing, alias map indexing, graceful Firestore-failure fallback to last cached snapshot, and test helpers (`_setIndustryProbingCacheForTests`, `_peekIndustryProbingCache`)
- New server actions in `lib/actions/industry-probing.ts` — `getAllIndustryProbings`, `createIndustryProbing`, `updateIndustryProbing`, `deleteIndustryProbing`, `reorderIndustryProbings`, `toggleIndustryProbingPublished`. All auth-guarded; all invalidate the in-process cache after mutation
- New admin CRUD page `app/admin/(authenticated)/industry-probing/page.tsx` + `IndustryProbingManager.tsx` client component. Form fields: slug, display_name, common_bottlenecks (textarea, one per line), common_tools, probing_angles, aliases, is_published toggle, sort_order. Reuses existing `useCrudManager` hook with a custom `preparePayload` for newline → array conversion. New "Industry Probing" entry in `lib/admin/sidebar-config.ts` under the System group.
- `lib/agents/conversation.ts` — renamed hardcoded `INDUSTRY_PROBING` and `INDUSTRY_ALIASES` to `_FALLBACK` suffixes. New 2-branch lookup in `getIndustryProbing`: first checks the Firestore cache snapshot, then falls back to the hardcoded constants. Function signature stays sync so prompt builders don't need refactoring.
- `app/api/agent/chat/route.ts` warms the cache via `getIndustryProbingsFromFirestore()` non-blockingly at the start of each SSE request, then `await industryProbingPromise` before `generateConversationalResponse` runs. Cold start: ~50-200ms one-time Firestore latency on first chat turn after deploy. Subsequent turns: zero overhead (cache hit).
- New Firestore rule for `industry_probing` collection — admin-only read+write (no public access; the chat agent reads via the Admin SDK on the server)
- New seed script `scripts/seed-industry-probing.ts` populates the 8 hardcoded defaults (construction, healthcare, property management, staffing, legal, home services, logistics, dental) plus all alias mappings (plumbing/hvac/electrical → home services, real estate → property management, medical/senior care/veterinary/fitness/childcare → healthcare, trucking/distribution/wholesale/moving/storage → logistics). Idempotent — re-runnable
- New `npm run seed:industry-probing` script in `package.json`
- 12 new tests in `tests/industry-probing-cache.test.ts` covering cache population, alias indexing, casing normalization, unpublished filtering, invalidation, alias collision precedence, and Firestore-cache-overrides-fallback behavior

**E. Tighten heuristic extractors** ✅ Delivered 2026-04-10
- **`inferIndustry`** — added Branch 2 ("conversational opener with sizing prefix") that catches `we're a 30-person property management shop`, `I'm a small healthcare clinic`, `we are a 5-person legal firm`, `we're a mid-sized construction company`, etc. Uses an optional digit-based size group (`\d+[-\s]?(person|man|seat|employee|sized?)`) OR an adjective-based size group (`small|tiny|large|big|mid[-\s]?sized?|growing|young|new`), then captures the industry name before a recognizable suffix (`shop|company|firm|business|operation|team|agency|practice|clinic|office|outfit|startup|consultancy`). Same negative-words guard as Branch 1 (`use|using|problem|bottleneck|manual|urgent|currently|tool|stack`) prevents false captures like `we're using HubSpot at the moment`.
- **`inferBottleneck`** — tightened conversational branch from `(pattern OR (length>50 AND keyword))` to `(pattern AND keyword)`. Eliminates the over-fire on long messages where a problem keyword appears in passing (e.g., *"I'd love to learn how the manual review process works for new client onboarding"* — 80 chars, has `manual`, but no problem pattern). The explicit `bottleneck is X` first branch is unchanged.
- **Net effect on the fast-path skip** — more gathering turns where the user gives clear info now fill all required fields heuristically and skip the LLM extraction call (Tier 1's saving compounds: ~500-1500ms shaved on more first impressions).
- New shared `INDUSTRY_NEGATIVE_RE` constant (extracted once, reused across both industry branches) to keep the negative-words list in sync.

**F. Surface `share_url` in the chat UI** ✅ Delivered 2026-04-10
- New `share_link?: string` field on both `ChatMessage` and `SSEMessageData` (`types/chat.ts`) — per-message rather than top-level prop, so the auto-sent post-plan branch (which doesn't carry `email_capture: true`) can still surface the link
- `app/api/agent/chat/route.ts` attaches `share_link: \`/plan/${planId}\`` to BOTH post-plan branches (auto-sent + manual capture)
- `STREAM_MESSAGE` reducer action in `hooks/useSSEChat.ts` accepts `share_link` and stores it on the assistant message
- `AgentChat.tsx` includes `shareLink: msg.share_link` in the display message mapping
- `ChatMessages.tsx` adds `shareLink?: string` to its internal `ChatMessage` interface
- New `ViewFullPlanLink` subcomponent in `ChatMessages.tsx` renders a pill-style button (`View the full plan →`) inside the bubble whenever `message.shareLink` is set. Extracts plan id from the URL for the analytics payload and fires `EVENTS.AGENT_CHAT_VIEW_FULL_PLAN`
- New analytics event `AGENT_CHAT_VIEW_FULL_PLAN` added to `lib/analytics.ts`

### Tier 3 — Bigger / more architectural

**G1. Use Gemini's `chatSession` API (internals refactor)** ✅ Delivered 2026-04-11
- Refactored `invokeLLMChatStreaming` in `lib/agents/llm-client.ts` to use `model.startChat({ history })` + `chat.sendMessageStream(text)` instead of bare `model.generateContentStream({ contents })`.
- **Public signature unchanged** — callers in `conversation.ts` still pass `contents` as a single chronological array. The new internals split off the trailing user turn (validated to be `role === "user"`) and use it as the new message; the preceding turns become the chat history passed to `startChat`.
- **What this delivers**:
  - **SDK-level history validation** — `startChat` throws synchronously if the history is malformed (non-alternating roles, leading model turn, etc.) instead of silently producing weird output. Catches `buildChatTurns` regressions at the boundary.
  - **Native chat template** — Gemini handles role formatting consistently across model versions.
  - **Foundation for G2** — the `ChatSession` object can later be persisted/restored across requests if/when we add Firestore-backed session state.
- **What this does NOT change**: token cost (same payload), latency (same network round trip), behavior (same model + generation config + streaming), or per-request statelessness. This is a low-risk internals refactor — the eval suite (Tier 3 / I) is the safety net.

**G2. Server-side session pinning (deferred)**
The bigger architectural win — drop history from the request payload and let the server hold conversation state in a Firestore `chat_sessions` collection keyed by session_id. Would require:
- New `chat_sessions` collection + Firestore rules + TTL cleanup
- New session_id field in the chat request body, generated client-side and reset on `chat.reset()`
- Server reads/writes session state on every turn instead of recomputing
- Migration path for in-flight conversations during deploy
- Security model: who can read/write a session
- Race conditions on concurrent writes (rare but real with browser tab duplication)

Deferred because the current architecture works, the wire payload is bounded by the 20-message context window cap, and the operational complexity (session GC, GDPR-compliant retention, security rules, race-condition handling) is meaningful. Better to revisit when there's a concrete need (e.g., supporting cross-device chat resume, or surfacing live conversations in the admin dashboard).

**H. Cross-phase rules as first-class data** ✅ Delivered 2026-04-11 (scoped)
Original framing was "replace giant prompts with role-based persona tools" using Gemini function-calling. After scoping that out: function-calling breaks the streaming UX (model returns tool calls instead of text), and the existing prompts work well — they just have rule-duplication drift across phases. The scoped delivery instead extracts the **cross-cutting** rules into a first-class data structure while leaving phase-specific instructions inline.

- New `lib/agents/conversation-rules.ts` module — defines the `ConversationRule` interface with stable `id`, `description`, `appliesTo: ConversationPhase[]`, and optional `metadata` (`why`, `addedAt`). 5 rules currently registered:
  - `max-sentences-gathering` — gathering only, "2-3 sentences max"
  - `max-sentences-confirming` — confirming only, "3-4 sentences"
  - `max-sentences-follow_up` — follow_up only, "3-5 sentences"
  - `no-filler` — all 3 phases, "Never say 'Great question'..."
  - `no-markdown-leak` — all 3 phases, "Respond ONLY with your conversational message. No JSON, no markdown headers, no bullet lists."
- New helpers: `getSharedRulesForPhase(phase)` returns `string[]` of rule descriptions; `getRuleById(id)` for eval-failure correlation; `getRuleIdsForPhase(phase)` for dynamic discovery.
- New `renderInstructionList(items)` helper in `conversation.ts` that converts a string array into a numbered Markdown-style list, used by all 3 phase prompt builders.
- All 3 phase prompt builders (`buildGatheringPrompt`, `buildConfirmingPrompt`, `buildFollowUpPrompt`) refactored to: keep phase-specific instructions inline as a `phaseInstructions: string[]` array, concatenate with `getSharedRulesForPhase(phase)`, and render the combined list with `renderInstructionList()`. The numbered output is identical in shape to the previous hand-numbered version.
- 16 new tests in `tests/conversation-rules.test.ts`: registry sanity (id uniqueness, non-empty descriptions, valid phases), per-phase coverage (every conversational phase has rules), specific-rule cross-referencing (`max-sentences-*` only fires in its own phase, `no-filler`/`no-markdown-leak` apply to all 3), `getRuleById` happy path + miss, `getRuleIdsForPhase` ordering.

**What this enables that the old approach didn't:**
- **Stable rule ids** the eval suite can correlate failures with — when a `no-filler` rule failure spikes, you know exactly which rule regressed without parsing free-text instruction lists
- **Single source of truth for cross-cutting concerns** — a "no filler phrases" tweak now updates all 3 phases at once instead of requiring 3 hand-edits
- **Discoverability** — `metadata.why` and `metadata.addedAt` document why each rule exists and when it was added
- **Foundation for moving rules to Firestore** — same admin-CRUD pattern as Tier 2 / D could later let you tweak shared rules without redeploys (deferred until there's a concrete reason)

**What this does NOT change:** Behavior is unchanged. The eval suite (Tier 3 / I) is the safety net — the same 22 cases that pass before the refactor pass after it. The rendered prompt text is identical in structure (numbered instructions section), just sourced from a structured data layer instead of hand-glued strings.

**I. LLM-as-judge eval suite for chat answers** ✅ Delivered 2026-04-11
- New `lib/agents/chat-evals.ts` (~370 lines): types (`ChatEvalCase`, `ChatEvalCriterion`, `ChatCriterionVerdict`, `ChatEvalResult`, `ChatEvalSuiteSummary`, `PhaseAggregate`), `buildChatJudgePrompt`, `parseChatJudgeResponse` (defensive — handles malformed JSON, missing verdicts, non-string rationales, truthy/falsy passed coercion), `computeChatScore` (weighted), `runChatEval`/`runChatEvalSuite` with dependency injection (`generateResponse` + `judge` overrides), `aggregateChatEvalResults` (per-phase + per-criterion roll-up). Judge runs on `gemini-2.5-flash-lite` to reduce self-bias against the agent under test.
- New `lib/agents/chat-eval-cases.ts` (~430 lines): 22 curated cases covering all three conversational phases — 10 gathering (clear answers, vague answers, system-prompt-leak bait, off-topic pricing, returning-context revisions, unknown industry), 6 confirming (narrative restate, hedging, mid-question, explicit affirm, uncertainty, additional context), 6 follow_up (specific stage questions, pricing redirect, off-topic redirect, email-already-captured guard, encourages-email guard, quick-win plan reference). 19 reusable criteria centralized in a `C` table (concise, no-filler, no-list-formatting, no-prefix-leak, no-system-leak, asks-industry/bottleneck/tools, acks-industry-context, clarifies-vague, restates-narrative, asks-build-confirmation, addresses-latest, references-plan, no-pricing, redirects-off-topic, no-double-email-ask, no-hallucination, encourages-email).
- New `scripts/run-chat-evals.ts` CLI with colored per-case + per-phase + per-criterion summary table, sortable by failure rate, configurable via `--concurrency`, `--threshold`, `--filter` flags. Exits non-zero when the suite pass rate falls below the threshold (default 0.8).
- New `tests/chat-evals.test.ts` opt-in vitest harness gated by `RUN_LLM_EVALS=1`. Skipped during normal `npm test` runs so it doesn't burn API credits, but can be wired into a nightly CI job.
- New `tests/chat-evals-unit.test.ts` (33 tests, all pure / no LLM calls): judge prompt generation, response parsing edge cases, scoring math, suite aggregation, runner happy/failure paths via injected fakes, and golden suite sanity checks (≥20 cases, all phases covered, unique ids, non-empty messages).
- New `npm run eval:chat` script in `package.json`.
- Total new code: 5 files, ~1,200 lines including tests.

### Recommended next session
**Updated 2026-04-12** — Tiers 1, 2, and most of Tier 3 are all shipped. What remains:

**Open weaknesses from §7 that are NOT yet in any tier above:**
- **W11 — confirming prompt overloaded**: `buildConfirmingPrompt` asks the model to do 5+ jobs (restate as narrative, add insight, address latest, invite corrections, close with CTA, plus shared brevity rules) in 3-4 sentences. The 2026-04-10 refactor tightened the generation config and extracted shared rules, but the phase-specific instructions block still carries all 6 responsibilities. Next session should consider either (a) splitting `confirming` into two calls (insight-generation then confirmation-ask) so each call can breathe, or (b) consciously cutting 1-2 of the lower-priority jobs and documenting the tradeoff. Fix: `lib/agents/conversation.ts:613-669`.
- **W12 — brand-voice rules only partially enforced**: `no-filler` is in the prompt via `getSharedRulesForPhase`, and `stopSequences` + `temperature: 0.55` catch most drift, but the model can still leak filler ("Great question", "That's interesting") under rare circumstances. Full enforcement requires post-generation output filtering (string-based regex scrub of the assistant message before it hits the SSE stream). Low priority — the practical mitigation is probably already at its ceiling.
- **W17 — healthcare alias bucket contaminated**: `INDUSTRY_ALIASES_FALLBACK` in `lib/agents/conversation.ts:133-137` maps `fitness`, `childcare`, `veterinary`, `medical`, and `senior care` all to `healthcare`. This means a fitness studio or daycare gets the healthcare probing, which doesn't fit. Lowest-effort fix among the three — either add dedicated `industry_probing` entries for these sectors (uses the admin UI shipped in D) or drop the aliases so they fall through to the generic path. Ship-safe after running `tests/industry-probing-cache.test.ts` to confirm no test pins the old mapping.

**Deferred (decision point — not recommended for next session):**
- **G2 — server-side session pinning** — Operational complexity outweighs current value; see §9 Tier 3 / G2.
- **Full H — function-calling persona refactor** — Breaks streaming UX; scoped to rules-as-data via `conversation-rules.ts` instead.

**Suggested session order**: W17 (5-minute fix, surface the behavior change) → W12 (if you want to add a post-gen scrub) → W11 (actual refactor, 30-60 minutes plus eval run).

---

## 10. Reference — key file locations

| Area | File | Notes |
|---|---|---|
| Chat route handler | `app/api/agent/chat/route.ts` | SSE stream, phase routing, lead/plan persistence |
| State machine + prompts | `lib/agents/conversation.ts` | `detectPhase`, `extractIntakeData`, prompt builders, `generateConversationalResponse` |
| LLM client | `lib/agents/llm-client.ts` | `invokeLLM`, `invokeLLMStreaming`, `invokeLLMChatStreaming`, model selection, retries, token bucket |
| Memory | `lib/agents/memory.ts` | Returning-visitor recall (Firestore-backed) |
| Safety | `lib/agents/safety.ts` | Output guardrails + fallback messages |
| Client hook | `hooks/useSSEChat.ts` | SSE state machine, stall detection, action dispatch |
| Chat UI | `components/marketing/AgentChat.tsx` | Top-level chat container, email-form wiring |
| Message rendering | `components/marketing/ChatMessages.tsx` | Bubble layout, inline forms |
| Plan section card | `components/marketing/ChatPlanCard.tsx` | Per-section formatted preview during streaming |
| Full plan display | `components/marketing/PlanDisplay.tsx` | Complete plan view at `/plan/[id]` |
| Types | `types/chat.ts` | `ConversationPhase`, `ChatMessage`, `ExtractedIntake`, SSE event types |
