# Agents (Markdown-driven Templates)
**Doc Date:** 2026-02-27 | **Updated:** 2026-03-05

## Purpose
Agent templates are stored as markdown in Firestore (`agent_templates` collection) and used to generate visitor "Preview Plans" via the Gemini API. Templates are editable through the admin UI at `/admin/agent-templates`.

## LLM Provider
Google Gemini API (`@google/generative-ai ^0.24.1`)

## Template keys
- `intake_agent` — Gathers and structures visitor input
- `workflow_mapper` — Maps bottleneck to workflow stages
- `automation_designer` — Suggests automation rules and integrations
- `dashboard_designer` — Designs KPIs and dashboard layout
- `ops_pulse_writer` — Writes 30-day plan and operational summary

## Agent Chain (via `/api/agent/run`)
Sequential execution: intake → workflow_mapper → automation_designer → dashboard_designer → ops_pulse_writer

Each step receives the output of previous steps as context.

## Agent Chat (via `/api/agent/chat`)
SSE streaming endpoint with multi-phase conversation:
1. **gathering** — Agent asks intake questions to understand the business problem
2. **confirming** — Agent summarizes understanding and confirms with user
3. **building** — Agent generates the preview plan (streams progress)
4. **complete** — Plan ready, presented inline in chat
5. **follow_up** — Post-plan questions, refinement offers, CTA

Implementation: `lib/agents/conversation.ts` handles phase detection and conversation management.

## Plan Refinement (via `/api/agent/refine`)
Users can refine individual sections of a generated plan:
- Select a section (workflow, automation, dashboard, ops_pulse)
- Provide feedback text
- Gemini regenerates that section incorporating the feedback
- Version history tracked in `plans.versions[]` array

Implementation: `lib/agents/refinement.ts`

## Inputs schema
- industry (string)
- bottleneck (string)
- current_tools (string)
- volume (optional string)
- stakeholders (optional string)

## Outputs schema (PreviewPlan)
- intake: { industry, bottleneck_summary, current_tools, goals }
- workflow: { stages[], transitions[], bottleneck_points[] }
- automation: { rules[], integrations[], estimated_time_saved }
- dashboard: { kpis[], layout_suggestions[], alert_rules[] }
- ops_pulse: { thirty_day_plan[], assumptions[], next_steps[] }

## Email Delivery
Preview plans are emailed to leads via Resend (`lib/agents/email-template.ts`).

## Guardrails
- Do not claim access to user systems
- Do not request credentials
- Use "draft" / "preview" language — not definitive claims
- Keep outputs concise and skimmable
- Filter for impersonation, unsafe claims, or leaked secrets
- Rate limits: 20 chat messages/10min, 10 refines/10min

## Storage
- Generated plans stored in `plans` collection (Firestore)
- Plans can be public (`is_public: true`) → shareable at `/plan/[id]`
- View count tracked per plan
- Version history stored in `versions[]` array
