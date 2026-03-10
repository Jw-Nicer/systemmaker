# ADR-001: Firebase over Supabase
**Date:** 2026-03-10 | **Status:** Accepted

## Context
Nicer Systems needed auth, database, storage, and hosting for a single-tenant agency site. The app serves one admin user (the founder) and public visitors — there is no multi-tenant requirement. The deployment model needed to support Next.js SSR with minimal configuration.

## Decision
Firebase (Firestore + Auth + Storage + App Hosting) as the full backend platform.

## Consequences
**Positive:**
- Zero-config hosting with SSR via Cloud Functions and Firebase App Hosting
- Generous free tier on the Blaze plan (pay-as-you-go with no baseline cost for low traffic)
- Familiar to the founder — faster iteration on admin features
- Firestore's document model maps naturally to the content types (case studies, leads, plans)
- Built-in Auth with session cookie support for admin routes

**Negative:**
- Vendor lock-in to Google Cloud (Firestore queries, security rules, Auth SDK are non-portable)
- No SQL — complex aggregations require client-side logic or Cloud Functions
- No built-in row-level security policies like Supabase's Postgres RLS
- Firestore indexes must be manually created for compound queries

## Alternatives Considered
- **Supabase** — Was in the original spec. Postgres with RLS is more powerful for complex queries, but the deployment model (separate hosting + Supabase backend) added complexity. Firebase App Hosting provided a simpler single-vendor deploy.
- **PlanetScale + Vercel** — More moving parts (separate DB, separate hosting, separate auth). Overkill for a single-admin agency site. Would be reconsidered if the product moves to multi-tenant SaaS.
