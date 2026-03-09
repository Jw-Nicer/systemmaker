# Agent Pipeline
**Doc Date:** 2026-03-09

## Overview
Five agents chain together to produce a Preview Plan from visitor intake data. The pipeline runs via Gemini API calls, with each agent receiving structured context from previous agents. Templates are stored as markdown in Firestore (`agent_templates` collection) and assembled into prompts by `lib/agents/prompts.ts`.

## Pipeline Order and Data Flow

```
User Input (industry, bottleneck, current_tools, urgency?, volume?)
    |
    v
[1] intake_agent          --> IntakeOutput
    |
    v
[2] workflow_mapper       --> WorkflowMapperOutput
    |
    +-----------+-----------+
    |                       |
    v                       v
[3] automation_designer   [4] dashboard_designer    (parallel)
    |                       |
    +-----------+-----------+
                |
                v
[5] ops_pulse_writer      --> OpsPulseOutput
    |
    v
PreviewPlan (all 5 sections + consistency warnings)
```

Steps 3 and 4 run in parallel via `Promise.all` since both depend only on the workflow mapper output.

## Input/Output Mapping

### 1. intake_agent
| Direction | Fields |
|-----------|--------|
| **Receives** | `industry`, `bottleneck`, `current_tools`, `urgency`, `volume` (raw user input) |
| **Produces** | `clarified_problem`, `assumptions[]`, `constraints[]`, `suggested_scope` |

Restates the visitor's bottleneck in precise operational terms. All downstream agents depend on `clarified_problem`.

### 2. workflow_mapper
| Direction | Fields |
|-----------|--------|
| **Receives** | `clarified_problem`, `industry`, `current_tools`, `assumptions`, `suggested_scope` (from intake) |
| **Produces** | `stages[]` (name, owner_role, entry/exit criteria), `required_fields[]`, `timestamps[]`, `failure_modes[]` |

Central hub of the pipeline. Its output feeds both parallel agents and ops_pulse.

### 3. automation_designer
| Direction | Fields |
|-----------|--------|
| **Receives** | `stages`, `required_fields`, `current_tools`, `failure_modes` (from workflow) |
| **Produces** | `automations[]` (trigger, steps, data_required, error_handling), `alerts[]`, `logging_plan[]` |

### 4. dashboard_designer
| Direction | Fields |
|-----------|--------|
| **Receives** | `stages`, `timestamps`, `industry`, `required_fields` (from workflow) |
| **Produces** | `dashboards[]` (name, purpose, widgets), `kpis[]` (name, definition, why_it_matters), `views[]` |

### 5. ops_pulse_writer
| Direction | Fields |
|-----------|--------|
| **Receives** | `kpis`, `dashboards` (from dashboard), `failure_modes` (from workflow) |
| **Produces** | `executive_summary`, `sections[]`, `scorecard[]`, `actions[]`, `questions[]` |

## How runner.ts Executes the Chain

Two entry points in `lib/agents/runner.ts`:

- **`runAgentChain()`** -- Synchronous chain. Returns a complete `PreviewPlan` when all 5 stages finish. Used by `/api/agent/run`.
- **`runAgentChainStreaming()`** -- Streaming variant. Calls `onSection(step, label, data)` as each stage completes. Used by `/api/agent/chat` for SSE delivery.

Each stage calls `runAgentWithTemplate<T>()` which:
1. Builds the prompt via `buildPrompt(template, context)` from `prompts.ts`
2. Calls Gemini with JSON response mode and a per-stage timeout
3. Strips markdown fences, parses JSON, validates against a Zod schema
4. Runs `assertSafeAgentObject()` to check for prompt injection artifacts

Templates are fetched once per chain run via `getAllTemplates()` (batch Firestore read, cached for 5 minutes).

## How conversation.ts Orchestrates Multi-Phase Chat

The SSE chat at `/api/agent/chat` manages a conversation through five phases:

| Phase | What happens | Model used |
|-------|-------------|------------|
| **gathering** | Agent asks intake questions one at a time. Heuristic + LLM extraction fills `ExtractedIntake` fields. | gemini-2.0-flash |
| **confirming** | All required fields collected. Agent summarizes and asks for confirmation. Revision signals return to gathering. | gemini-2.0-flash |
| **building** | User confirmed. `runAgentChainStreaming()` executes the 5-agent pipeline, streaming section completions via SSE. | gemini-2.5-flash (chain) |
| **complete** | Plan delivered inline in chat. | -- |
| **follow_up** | Post-plan questions answered with plan context. | gemini-2.5-flash |

Key mechanisms:
- **`detectPhase()`** -- Determines phase transitions based on current phase, extracted data, and the latest user message. Required fields: `industry`, `bottleneck`, `current_tools`.
- **`extractIntakeData()`** -- Two-layer extraction: regex heuristics run first, then Gemini (fast model) parses the conversation for structured data. Heuristic results are used as fallback if Gemini extraction fails.
- **`generateConversationalResponse()`** -- Async generator that produces the agent's text reply for gathering, confirming, and follow_up phases. Safety checks via `assertSafeAgentText()` with a fallback response on failure.
- **`hasRevisionSignal()`** -- Detects user corrections ("no", "wait", "actually we use...") to revert from confirming back to gathering.

History is trimmed to the last 20 messages to keep prompt size manageable.

## How refinement.ts Handles Section-Level Updates

Post-plan, users can refine any of the 5 sections individually via `/api/agent/refine`.

**`refinePlanSection(section, feedback, fullPlan)`**:
1. Extracts the current section data from the full plan
2. Builds a refinement prompt containing the plan summary, current section JSON, and sanitized user feedback
3. Calls Gemini (JSON mode) with up to 2 retries on transient errors
4. Parses and returns the updated section data plus a human-readable summary

**`refinePlanSectionStreaming()`** -- Streaming variant using `generateContentStream()`. Yields text chunks for real-time UI updates, then parses the accumulated result.

**`getSectionSuggestions(plan, section)`** -- Deterministic (no LLM call). Analyzes the plan content and returns contextual refinement chip suggestions. For example: if a workflow has generic owner roles, it suggests "Specify role titles". Includes cross-section consistency warnings from `plan.warnings` when relevant. Returns up to 4 suggestions per section.

Feedback is sanitized to strip prompt injection patterns (instruction-like prefixes, markdown headers, code fences) and truncated to 2000 characters.

## Error Handling and Fallback Behavior

### Model fallback (runner.ts)
- Default model cascade: `gemini-2.5-flash` then `gemini-2.0-flash`
- Per-model: up to 2 retries with exponential backoff (300ms base + jitter) for transient errors (429, 500-504, timeouts, rate limits)
- Model availability errors (not found, permission denied) skip immediately to the next model
- Non-transient, non-availability errors also skip to the next model

### Per-stage timeouts
| Stage | Timeout |
|-------|---------|
| intake_agent | 15s |
| workflow_mapper | 25s |
| automation_designer | 30s |
| dashboard_designer | 30s |
| ops_pulse_writer | 25s |

### Graceful degradation (streaming variant)
- **Critical stages** (intake, workflow): Failure throws and aborts the entire chain. The pipeline cannot continue without them.
- **Non-critical stages** (automation, dashboard): Failure is caught. The plan is returned with empty placeholder data for the failed section, plus a warning.
- **ops_pulse**: Skipped entirely if both automation AND dashboard failed (no meaningful input). Otherwise runs with whatever data is available.
- Failed sections include a warning: `"This section failed to generate and contains placeholder data. You can try refining it with feedback."`

### JSON parsing fallback
If the Gemini response does not parse as JSON directly, `runAgentWithTemplate` attempts to extract the outermost `{...}` block from the response text before failing.

### Conversation extraction fallback
If Gemini extraction times out or fails, `extractIntakeData()` falls back to regex heuristic results. The conversation continues without interruption.

### Safety and size limits
- All agent outputs pass through `assertSafeAgentObject()` (prompt injection detection)
- Conversational responses pass through `assertSafeAgentText()` with a safe fallback message on failure
- Max response size: 512KB per agent stage, 256KB per refinement
- Max prompt size: 100KB (context truncated if exceeded)
- Refinement feedback: sanitized and truncated to 2000 chars

### Plan consistency validation
After the chain completes, `validatePlanConsistency(plan)` checks for cross-section issues (e.g., KPIs referencing fields not in the workflow). Warnings are attached to `plan.warnings[]`.
