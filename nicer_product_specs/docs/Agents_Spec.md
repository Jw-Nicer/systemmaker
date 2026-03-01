# Agents (Markdown-driven Templates)
**Doc Date:** 2026-02-27

## Purpose
Agent templates are stored as markdown and used to generate the visitor “Preview Plan” and internal drafts.

## Template keys (Phase 2)
- intake_agent
- workflow_mapper
- automation_designer
- dashboard_designer
- ops_pulse_writer

## Inputs schema
- industry
- bottleneck
- current_tools
- volume (optional)
- stakeholders (optional)

## Outputs schema
- workflow_stages []
- recommended_data_fields []
- dashboard_kpis []
- alert_rules []
- 30_day_plan []
- assumptions []
- next_steps []

## Guardrails
- Do not claim access to user systems
- Do not request credentials
- Use “draft” language
- Keep outputs concise and skimmable
