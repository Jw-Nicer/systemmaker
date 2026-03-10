# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) documenting key technology and strategy choices for Nicer Systems. Each ADR explains the context, decision, trade-offs, and alternatives considered.

## Index

| ADR | Decision | Status |
|-----|----------|--------|
| [001](./001-firebase-over-supabase.md) | Firebase over Supabase for backend | Accepted |
| [002](./002-gemini-over-openai.md) | Google Gemini over OpenAI for LLM | Accepted |
| [003](./003-agency-not-saas.md) | Agency model, not multi-tenant SaaS | Accepted |
| [004](./004-resend-for-email.md) | Resend for transactional email | Accepted |

## When to Write a New ADR
Create a new ADR when making a decision that:
- Introduces or replaces a core dependency (database, framework, service provider)
- Changes the business model or user-facing architecture
- Would be hard to reverse once implemented
- A future contributor would ask "why did we do it this way?"

## Format
Use the template in each existing ADR: Context, Decision, Consequences (positive + negative), Alternatives Considered.

Number sequentially: `005-short-description.md`.
