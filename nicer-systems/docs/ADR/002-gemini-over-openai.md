# ADR-002: Google Gemini over OpenAI
**Date:** 2026-03-10 | **Status:** Accepted

## Context
The agent chain (intake -> workflow_mapper -> automation_designer -> dashboard_designer -> ops_pulse_writer) requires an LLM with strong structured output capabilities. The chain runs server-side on every audit submission and chat conversation. While current traffic is low (agency model — see ADR-003), each plan generation runs 5 sequential LLM calls, so per-token cost compounds quickly as lead volume grows.

## Decision
Google Gemini via the `@google/generative-ai` SDK as the sole LLM provider.

## Consequences
**Positive:**
- Lower cost per token compared to GPT-4 at the time of decision
- Good structured output support (JSON mode) for the agent chain's typed responses
- Aligns with the Firebase/Google Cloud ecosystem — single vendor relationship
- Sufficient quality for the operational analysis and plan generation use cases

**Negative:**
- Smaller ecosystem and less community tooling than OpenAI
- Fewer third-party integrations and middleware (e.g., LangChain support was OpenAI-first)
- Model capabilities shift rapidly — this decision should be revisited periodically

## Alternatives Considered
- **OpenAI GPT-4** — Higher cost per token, no Firebase ecosystem synergy. Stronger community tooling but not worth the premium for this use case.
- **Anthropic Claude** — Strong reasoning capabilities, but separate billing and no Google Cloud integration benefits. Would be a good choice if the app moved off Firebase.
