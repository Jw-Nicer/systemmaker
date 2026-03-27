# Agents Specification
**Doc Date:** 2026-02-27 | **Updated:** 2026-03-27

> For the full architecture deep-dive (DAG execution, tracing, self-correction, tool use, memory), see `docs/Agent_Pipeline.md`.

## Purpose
Agent templates are stored as markdown in Firestore (`agent_templates` collection) and used to generate visitor "Preview Plans" via the Gemini API. Templates are editable through the admin UI at `/admin/agent-templates`.

## LLM Provider
Google Gemini API (`@google/generative-ai ^0.24.1`)
- Primary model: `gemini-2.5-flash`
- Fallback model: `gemini-2.5-flash-lite`
- Fast model (extraction/classification): `gemini-2.5-flash-lite`
- All calls go through shared `lib/agents/llm-client.ts` (singleton, retry, token budget)

## Template Keys (6 Pipeline Stages)
| Key | Stage | Critical | Timeout | Max Corrections |
|-----|-------|----------|---------|-----------------|
| `intake_agent` | Gather + structure visitor input | Yes | 15s | 2 |
| `workflow_mapper` | Map bottleneck to workflow stages | Yes | 25s | 2 |
| `automation_designer` | Design automation rules + alerts | No | 30s | 1 |
| `dashboard_designer` | Design KPIs + dashboard views | No | 30s | 1 |
| `ops_pulse_writer` | Write exec summary + 30-day actions | No | 30s | 2 |
| `implementation_sequencer` | Build week-by-week roadmap | No | 30s | 1 |

## Pipeline Architecture (DAG Orchestrator)

The pipeline runs as a Directed Acyclic Graph defined in `lib/agents/registry.ts`:

```
[intake] → [workflow] → [automation, dashboard] (parallel) → [ops_pulse, implementation_sequencer] (parallel)
```

- **Critical stages** (intake, workflow): failure aborts the pipeline
- **Non-critical stages**: failure produces empty placeholders + warnings (graceful degradation)
- **Execution**: `orchestrateAgentPipeline()` in `lib/agents/runner.ts`
- **Adding a new stage**: registry entry + template + schema — no runner changes needed

### Stage Execution Flow
Each stage goes through:
1. Context assembly (typed protocol from `context.ts`)
2. Tool use / RAG (grounded data from `tools.ts`)
3. Prompt assembly (template + context + tool results)
4. LLM call with self-correction (schema validation → error feedback → retry)
5. Output safety guardrails (prompt injection, secret leak detection)
6. Trace span recorded (stage, model, latency, corrections)

## API Endpoints

| Route | Purpose |
|-------|---------|
| `POST /api/agent/run` | Synchronous pipeline → returns full PreviewPlan |
| `POST /api/agent/chat` | SSE streaming chat with 5-phase conversation + plan generation |
| `POST /api/agent/audit` | Guided audit (4-step form) → full pipeline |
| `POST /api/agent/refine` | Stream refined section preview (no persistence) |
| `POST /api/agent/refine/apply` | Persist accepted refinement to Firestore |
| `POST /api/agent/send-email` | Email preview plan via Resend |

## Agent Chat (5-Phase Conversation)
SSE streaming via `/api/agent/chat`:
1. **gathering** — Collect industry, bottleneck, tools (with industry-aware probing)
2. **confirming** — Summarize understanding, add insight, ask to proceed
3. **building** — Run 6-stage pipeline, stream sections as they complete
4. **complete** — Plan ready, offer email capture
5. **follow_up** — Answer questions with detailed plan context (full section details, not just names)

Features:
- Memory: Recalls returning visitors by email, personalizes greetings
- Contradiction detection: Catches when user corrects earlier statements
- Conversation summary: Key facts persist beyond 20-message context window

## Plan Refinement (Two-Step Flow)
1. `POST /api/agent/refine` — streams refined section preview (no save)
2. User reviews changes (diff view available)
3. `POST /api/agent/refine/apply` — persists to Firestore with version history

Supported sections: scope, workflow, kpis, alerts, actions, roadmap

Smart suggestions generated deterministically per section (no LLM call) by analyzing plan content for gaps.

## Inputs Schema
```typescript
{
  industry: string;      // "property management", "construction", etc.
  bottleneck: string;    // free-text operational pain point
  current_tools: string; // "AppFolio, email, spreadsheets"
  urgency?: string;      // "low" | "medium" | "high" | "urgent"
  volume?: string;       // "50 units", "200 orders/week"
}
```

## Outputs Schema (PreviewPlan)
```typescript
{
  intake:    { clarified_problem, assumptions[], constraints[], suggested_scope }
  workflow:  { stages[], required_fields[], timestamps[], failure_modes[] }
  automation:{ automations[], alerts[], logging_plan[] }
  dashboard: { dashboards[], kpis[], views[] }
  ops_pulse: { executive_summary{problem,solution,impact,next_step}, sections[], scorecard[], actions[], questions[] }
  roadmap?:  { phases[], critical_path, total_estimated_weeks }
  warnings?: { section, message }[]
}
```

Full Zod schemas in `lib/agents/schemas.ts`.

## Agentic Patterns

| Pattern | Module | Purpose |
|---------|--------|---------|
| DAG Orchestration | `runner.ts` + `registry.ts` | Dependency-driven parallel execution |
| Self-Correction | `self-correction.ts` | Schema fail → error feedback → LLM retry (max 2) |
| Tool Use / RAG | `tools.ts` | Case studies, benchmarks, existing plans for grounding |
| Observability | `tracing.ts` | Trace IDs, spans, structured logs per pipeline run |
| Agent Memory | `memory.ts` | Episodic memory for returning visitors |
| Guardrails (3-layer) | `prompts.ts`, `safety.ts`, `validation.ts` | Input sanitization, output safety, cross-section coherence |
| Model Routing | `llm-client.ts` | Multi-model fallback, token budget, retry with backoff |
| Routing Signals | `registry.ts` | Dynamic behavior based on stage output (e.g., complex_workflow) |
| Evaluation | `evals.ts` | LLM-as-judge quality scoring, golden test suite |

## Guardrails
- Input sanitization: strips instruction markers, markdown headers, template syntax (`prompts.ts`)
- Output safety: detects credential requests, system access claims, secret leaks (`safety.ts`)
- Cross-section coherence: validates automation↔workflow, KPIs↔fields references (`validation.ts`)
- Rate limits: 20 chat messages/10min, 4 runs/10min, 10 refines/10min
- Size limits: 512KB per stage, 256KB per refinement, 100KB total prompt

## Storage
- Plans stored in `plans` collection (Firestore)
- Public plans shareable at `/plan/[id]` (`is_public: true`)
- View count tracked per plan
- Version history in `versions[]` array (max 20 versions, trimmed)
- Agent memory in `agent_memory` collection (keyed by SHA-256 email hash)

## Module Reference
All 16 modules in `lib/agents/`:

| Module | Purpose |
|--------|---------|
| `runner.ts` | DAG orchestrator — walks pipeline, manages execution |
| `registry.ts` | Pipeline DAG — stage configs, dependencies, routing signals |
| `context.ts` | Context protocol — typed data flow between stages |
| `llm-client.ts` | Shared LLM client — singleton, retry, model routing |
| `self-correction.ts` | ReAct loop — self-correction on validation failure |
| `tracing.ts` | Observability — traces, spans, structured logging |
| `tools.ts` | Tool use / RAG — grounded generation via real data |
| `evals.ts` | Evaluation — LLM-as-judge, golden test suite |
| `memory.ts` | Agent memory — episodic memory for returning visitors |
| `prompts.ts` | Context assembly — template + context + sanitization |
| `schemas.ts` | Output guardrails — Zod schemas per stage |
| `safety.ts` | Safety guardrails — injection, secret detection |
| `validation.ts` | Coherence guardrails — cross-section consistency |
| `conversation.ts` | Conversation agent — multi-phase intake chat |
| `refinement.ts` | Refinement agent — section-level plan updates |
| `email-template.ts` | Email rendering for plan delivery |
