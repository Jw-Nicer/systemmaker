# ADR-004: Resend for Transactional Email
**Date:** 2026-03-10 | **Status:** Accepted

## Context
The app needs transactional email for three use cases: (1) admin notifications when new leads arrive, (2) automated nurture sequences (4 emails over 14 days, scheduled at days 2, 4, 7, and 14), and (3) plan delivery to leads. Nurture emails require scheduled delivery at specific future timestamps.

## Decision
Resend as the sole email provider, using its `scheduledAt` parameter for nurture email timing.

## Consequences
**Positive:**
- Simple API — send an email in one SDK call with minimal configuration
- Built-in scheduling via `scheduledAt` — no need for a separate job queue or cron for nurture sequences
- Generous free tier (100 emails/day) sufficient for early-stage lead volume
- Clean developer experience with TypeScript SDK

**Negative:**
- No built-in unsubscribe management — must be implemented manually (see Gap 4C in backlog)
- No open/click tracking on the free tier — cannot measure nurture email engagement without upgrading
- Single vendor dependency for all email — an outage blocks lead notifications and nurture delivery
- `scheduledAt` has a maximum future window (may require adjustment for longer sequences)

## Alternatives Considered
- **SendGrid** — More features (built-in unsubscribe, analytics, templates) but heavier SDK and more complex setup. Overkill for current volume.
- **AWS SES** — Cheapest at scale, but complex setup (IAM, domain verification, bounce handling). No built-in scheduling — would need SQS or a cron layer.
- **Postmark** — Excellent deliverability reputation, but no built-in scheduling. Similar simplicity to Resend otherwise.
