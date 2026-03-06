# DEPRECATED — Do Not Use

> **This directory is an archived snapshot from early planning (2026-02-27).**
> It contains outdated references to Supabase, PixiJS, and Vercel that do not reflect the actual implementation.

## Canonical documentation

All up-to-date documentation lives in `nicer-systems/`:

- **`nicer-systems/CLAUDE.md`** — Shared context for AI assistants
- **`nicer-systems/CODEX.md`** — Engineering implementation context
- **`nicer-systems/README.md`** — Project overview and setup
- **`nicer-systems/docs/`** — Product specs (PRD, Architecture, Data Model, API, etc.)
- **`nicer-systems/agents/`** — Agent markdown specifications

## Why this is outdated

| This directory says | Actual implementation |
|---------------------|---------------------|
| Supabase (Postgres + RLS) | Firebase (Firestore + Security Rules) |
| PixiJS for canvas | HTML5 Canvas API (no external lib) |
| Vercel for hosting | Firebase Hosting + Cloud Functions |
| Phase 3–4 not started | Phase 3–4 complete |
| No AI provider specified | Google Gemini API |
| No email provider | Resend |

**Do not follow these specs for implementation decisions.**
