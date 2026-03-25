# Agentic Workflow Pipeline
**Doc Date:** 2026-03-25

## Overview

Nicer Systems uses a **DAG-driven agentic workflow** to generate operational Preview Plans from visitor intake data. The pipeline consists of 6 specialized agents orchestrated by a generic DAG executor, with full observability, self-correction, tool use, and graceful degradation.

### Agentic Architecture Patterns

| Pattern | Implementation | Module |
|---------|---------------|--------|
| **DAG Orchestration** | Dependency-driven tier execution | `runner.ts` |
| **Self-Correction (ReAct)** | Schema validation → error feedback → retry | `self-correction.ts` |
| **Tool Use / RAG** | Case studies, benchmarks, plan search | `tools.ts` |
| **Guardrails (3-layer)** | Input sanitization, output safety, cross-section coherence | `prompts.ts`, `safety.ts`, `validation.ts` |
| **Observability / Tracing** | Trace IDs, spans, structured logging | `tracing.ts` |
| **Human-in-the-Loop (HITL)** | Preview → approve → apply refinement | `refinement.ts` |
| **Agent Memory** | Episodic memory for returning visitors | `memory.ts` |
| **Graceful Degradation** | Critical vs non-critical stages, fallback outputs | `runner.ts`, `context.ts` |
| **Model Routing & Fallback** | Multi-model cascade, token budget | `llm-client.ts` |
| **Routing Signals** | Dynamic behavior based on stage output | `registry.ts` |
| **Evaluation (Evals)** | LLM-as-judge quality scoring, golden tests | `evals.ts` |
| **Streaming Agent UX** | SSE section-by-section delivery | `runner.ts`, `conversation.ts` |
| **Prompt Versioning** | Template hash tracking, version metadata | `prompts.ts` |
| **Structured Output** | JSON mode + Zod schema guardrails | `schemas.ts` |
| **Context Protocol** | Typed data flow between stages | `context.ts` |

## Module Architecture

```
lib/agents/
├── runner.ts            # DAG Orchestrator — walks pipeline, manages execution
├── registry.ts          # Pipeline DAG — stage configs, dependencies, routing signals
├── context.ts           # Context Protocol — typed data flow between stages
├── llm-client.ts        # Shared LLM Client — singleton, retry, model routing
├── self-correction.ts   # ReAct Loop — self-correction on validation failure
├── tracing.ts           # Observability — traces, spans, structured logging
├── tools.ts             # Tool Use / RAG — grounded generation via real data
├── evals.ts             # Evaluation — LLM-as-judge, golden test suite
├── memory.ts            # Agent Memory — episodic memory for returning visitors
├── prompts.ts           # Context Assembly — template + context + sanitization
├── schemas.ts           # Output Guardrails — Zod schemas per stage
├── safety.ts            # Safety Guardrails — prompt injection, secret detection
├── validation.ts        # Coherence Guardrails — cross-section consistency
├── conversation.ts      # Conversation Agent — multi-phase intake chat
├── refinement.ts        # Refinement Agent — section-level plan updates
└── email-template.ts    # Email rendering for plan delivery
```

## Pipeline DAG

```
User Input (industry, bottleneck, current_tools, urgency?, volume?)
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  Tier 1: [intake_agent]  (critical)                 │
│  ├── Context: raw visitor input                     │
│  ├── Tools: searchCaseStudies                       │
│  ├── Self-correction: up to 2 retries               │
│  └── Output: IntakeOutput                           │
└─────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  Tier 2: [workflow_mapper]  (critical)              │
│  ├── Context: intake.clarified_problem + scope      │
│  ├── Routing signals: complex_workflow,             │
│  │   high_failure_risk                              │
│  ├── Self-correction: up to 2 retries               │
│  └── Output: WorkflowMapperOutput                   │
└─────────────────────────────────────────────────────┘
    │
    ├───────────────────────┐
    ▼                       ▼
┌────────────────────┐ ┌────────────────────┐
│ Tier 3a:           │ │ Tier 3b:           │
│ [automation_       │ │ [dashboard_        │
│  designer]         │ │  designer]         │
│ (non-critical)     │ │ (non-critical)     │
│ Parallel execution │ │ Parallel execution │
│ Tools: searchPlans │ │ Tools: benchmarks  │
└────────────────────┘ └────────────────────┘
    │                       │
    ├───────────────────────┤
    ▼                       ▼
┌────────────────────┐ ┌────────────────────┐
│ Tier 4a:           │ │ Tier 4b:           │
│ [ops_pulse_writer] │ │ [implementation_   │
│ (non-critical)     │ │  sequencer]        │
│ Parallel execution │ │ (non-critical)     │
└────────────────────┘ └────────────────────┘
    │                       │
    └───────────┬───────────┘
                ▼
    PreviewPlan (5 sections + optional roadmap + warnings)
```

## DAG Execution Engine

The orchestrator in `runner.ts` executes the pipeline by walking the DAG:

```
1. computeExecutionTiers()     → [[intake], [workflow], [auto, dash], [ops, impl]]
2. For each tier:
   a. Filter executable stages  → skip if all dependencies failed
   b. Execute in parallel       → Promise.all(stages.map(executeStage))
   c. Collect routing signals   → checkRoutingSignals(output)
3. assemblePlan(results)        → PreviewPlan from stage outputs
4. runCrossSectionGuardrails()  → coherence warnings
5. finalizeTrace()              → structured trace log
```

**Adding a new stage requires:**
1. Add config to `PIPELINE_DAG` in `registry.ts`
2. Add context mapping in `context.ts`
3. Add template in `agents/*.md`
4. Add Zod schema in `schemas.ts`
— **No changes to runner.ts needed.**

## Stage Execution Flow

Each stage goes through this sequence:

```
1. assembleStageContext()         → typed context from prior results
2. getToolContextForStage()       → RAG: query case studies, benchmarks
3. assembleAgentContext()         → build full prompt (template + context + tools)
4. Inject routing signal hints    → upstream signals modify behavior
5. executeStageWithCorrection()   → LLM call with self-correction loop
6. enforceOutputSafety()          → check for secrets, injection, impersonation
7. endSpan()                      → record trace metrics
```

## Three-Layer Guardrail System

### Layer 1: Input Guardrails (`prompts.ts`)
- Context value sanitization (strips instruction markers, headers, template syntax)
- Field length limits (5000 chars per value, 100K total prompt)
- Key sanitization (prevents markdown injection via context keys)

### Layer 2: Output Safety Guardrails (`safety.ts`)
- Secret/credential leak detection (API keys, tokens, private keys)
- Credential request detection ("share your password")
- System access claim detection ("I accessed your CRM")
- Impersonation detection ("I am from Nicer Systems")
- Recursive scan of all string values in structured output

### Layer 3: Cross-Section Coherence Guardrails (`validation.ts`)
- Automation triggers → workflow stage references
- Dashboard KPIs → workflow field references
- Ops pulse actions → failure mode coverage
- Coverage validation (min stages, alerts, KPIs, priorities)

## Self-Correction (ReAct Loop)

When a stage's output fails schema validation:

```
Attempt 0: LLM generates output → schema validation fails
    ↓
Build correction prompt:
  - Original prompt
  - Previous invalid output (truncated)
  - Specific validation errors
  - Instructions to fix
    ↓
Attempt 1: LLM corrects output → validate again
    ↓ (if still failing)
Attempt 2: Final correction attempt
    ↓ (if still failing)
Throw error → stage fails (graceful degradation if non-critical)
```

Self-correction is tracked in trace spans: `span.corrections`, `span.metadata.wasAutoFixed`.

## Tool Use / RAG (Grounded Generation)

Agents can call tools to access real data during generation:

| Tool | Stages | Purpose |
|------|--------|---------|
| `searchCaseStudies` | intake, ops_pulse | Ground recommendations in real examples |
| `getIndustryBenchmarks` | dashboard, ops_pulse | Set realistic KPI targets |
| `searchExistingPlans` | workflow, automation | Reuse patterns from similar plans |

Tool results are injected as a "Grounded context" section in the prompt.

## Agent Memory (Episodic)

When a visitor is identified by email, the system can recall:
- Previous industry and bottleneck
- Prior plan IDs
- Interaction history (last 20)
- Known tools and preferences

Memory is stored in Firestore (`agent_memory` collection) keyed by SHA-256 hash of email.

Prompt injection for returning visitors:
```
## Returning visitor context (from agent memory)
Visitor name: John
Known industry: construction
Previous bottleneck discussed: field crew scheduling
Has 2 previous plan(s) on file
This is session #3 (returning visitor)
```

## Observability / Tracing

Every pipeline run creates a **trace** with **spans** per stage:

```json
{
  "traceId": "abc-123",
  "pipelineType": "plan_generation",
  "status": "completed",
  "totalLatencyMs": 28500,
  "spans": [
    { "stage": "intake", "model": "gemini-2.5-flash", "status": "completed", "latencyMs": 4200, "corrections": 0 },
    { "stage": "workflow", "model": "gemini-2.5-flash", "status": "completed", "latencyMs": 6100, "corrections": 1 },
    { "stage": "automation", "model": "gemini-2.5-flash", "status": "completed", "latencyMs": 7800, "corrections": 0 },
    { "stage": "dashboard", "model": "gemini-2.5-flash", "status": "completed", "latencyMs": 7200, "corrections": 0 },
    { "stage": "ops_pulse", "model": "gemini-2.0-flash", "status": "degraded", "latencyMs": 0, "corrections": 0, "error": "Timeout" },
    { "stage": "implementation_sequencer", "model": "gemini-2.5-flash", "status": "completed", "latencyMs": 8100, "corrections": 0 }
  ]
}
```

Traces are buffered in memory (last 100) and logged as structured JSON.

## Evaluation Framework

### LLM-as-Judge
Evaluates plan quality across 4 dimensions:
1. **Specificity** — concrete, industry-specific recommendations
2. **Completeness** — all required aspects covered
3. **Actionability** — clear, immediate next steps
4. **Realism** — realistic for SMB context

### Golden Test Suite
5 pre-defined test cases covering key industry × bottleneck combos:
- construction + scheduling
- healthcare + intake
- property management + maintenance
- staffing + timesheets
- legal + client intake

Each test case has a minimum score threshold. Used for regression detection when prompts change.

## Routing Signals

Stages can emit routing signals based on output content:

| Signal | Emitted By | Condition | Effect |
|--------|-----------|-----------|--------|
| `complex_workflow` | workflow | 8+ stages | Downstream uses detailed mode |
| `high_failure_risk` | workflow | 5+ failure modes | Ops pulse emphasizes risk mitigation |

Signals are injected as hints in downstream prompts:
```
## Routing context
Upstream signals: complex_workflow, high_failure_risk. Adjust detail level accordingly.
```

## Conversation Flow

The SSE chat at `/api/agent/chat` uses a **5-phase conversation agent**:

| Phase | Purpose | Agent Model |
|-------|---------|-------------|
| `gathering` | Collect industry, bottleneck, tools | gemini-2.0-flash |
| `confirming` | Confirm understanding, add insight | gemini-2.0-flash |
| `building` | Run 6-stage pipeline, emit sections | gemini-2.5-flash |
| `complete` | Present plan, offer email capture | — |
| `follow_up` | Answer questions about the plan | gemini-2.5-flash |

The conversation agent includes **industry-aware probing** (20+ industry mappings with specific bottlenecks, tools, and follow-up questions).

## Refinement Agent (HITL)

Two-step preview + apply flow:

```
1. POST /api/agent/refine     → stream refined section (no persistence)
2. User reviews diff
3. POST /api/agent/refine/apply → persist accepted refinement to Firestore
```

Smart suggestions are generated deterministically (no LLM call) by analyzing plan content for gaps and inconsistencies.

## Graceful Degradation

| Stage | Critical | On Failure |
|-------|----------|------------|
| `intake` | Yes | Pipeline aborts |
| `workflow` | Yes | Pipeline aborts |
| `automation` | No | Empty placeholder + warning |
| `dashboard` | No | Empty placeholder + warning |
| `ops_pulse` | No | Skipped if both auto + dash failed |
| `implementation_sequencer` | No | Skipped if both auto + dash failed |

Degraded stages are tracked in the trace and flagged in plan warnings.

## LLM Client

All LLM calls go through the shared client (`llm-client.ts`):

- **Singleton** Gemini client (avoids re-instantiation)
- **Retry** with exponential backoff + jitter (300ms base, 2 retries per model)
- **Model fallback** cascade (gemini-2.5-flash → gemini-2.0-flash)
- **Token budget** tracking (60 requests/minute bucket)
- **Error classification** (transient vs availability vs permanent)
- **Output size** enforcement (512KB default, 256KB for refinement)
- **Usage stats** accumulation for monitoring

## File Reference

| File | Purpose | Key Exports |
|------|---------|-------------|
| `runner.ts` | DAG orchestrator | `orchestrateAgentPipeline()`, `orchestrateAgentPipelineStreaming()` |
| `registry.ts` | Pipeline DAG config | `PIPELINE_DAG`, `computeExecutionTiers()`, `checkRoutingSignals()` |
| `context.ts` | Typed context protocol | `assembleStageContext()`, `CONTEXT_MAPPINGS`, `getFallbackOutput()` |
| `llm-client.ts` | Shared LLM client | `invokeLLM()`, `invokeLLMStreaming()`, `robustJsonParse()` |
| `self-correction.ts` | ReAct loop | `executeWithSelfCorrection()`, `executeStageWithCorrection()` |
| `tracing.ts` | Observability | `createTrace()`, `startSpan()`, `endSpan()`, `emitTraceLog()` |
| `tools.ts` | Tool use / RAG | `AGENT_TOOLS`, `getToolContextForStage()`, `executeTool()` |
| `evals.ts` | Evaluation | `evaluatePlan()`, `evaluateSection()`, `GOLDEN_TEST_CASES` |
| `memory.ts` | Episodic memory | `recallVisitorContext()`, `storeMemory()`, `buildMemoryPromptSection()` |
| `prompts.ts` | Context assembly | `assembleAgentContext()`, `getPromptVersion()` |
| `schemas.ts` | Output guardrails | `stageOutputGuardrails`, `intakeOutputSchema`, etc. |
| `safety.ts` | Safety guardrails | `enforceOutputSafety()`, `enforceTextSafety()` |
| `validation.ts` | Coherence guardrails | `runCrossSectionGuardrails()` |
| `conversation.ts` | Conversation agent | `generateConversationalResponse()`, `extractIntakeData()` |
| `refinement.ts` | Refinement agent | `refinePlanSection()`, `refinePlanSectionStreaming()` |
