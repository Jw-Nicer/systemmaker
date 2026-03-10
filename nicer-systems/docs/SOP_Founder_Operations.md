# Founder Operations SOP

## Daily (15 min)
- [ ] Check [admin dashboard](/admin) for new leads (score ≥50 = immediate action)
- [ ] Review overdue follow-ups widget on the dashboard
- [ ] Respond to any leads with score ≥50 within 4 hours

## Weekly (Friday, 45 min)
- [ ] Review all leads from the week in [Leads](/admin/leads)
  - Triage each `new` lead → `qualified`, `nurture`, or `unqualified`
  - `nurture` = potential fit but not ready now (stays in email sequence)
  - `unqualified` = not a fit at all
- [ ] Update follow-up dates for qualified leads
- [ ] Move any silent qualified leads (>14 days no reply) → `lost`
- [ ] Check nurture email performance (Resend dashboard)
- [ ] Review A/B experiment results in [Experiments](/admin/experiments) (if running)
- [ ] Publish any draft case studies in [Case Studies](/admin/case-studies)
- [ ] Check PostHog for landing page conversion trends
- [ ] Update implementation tracker for active clients

## Monthly (1st Monday, 60 min)
- [ ] Review lead-to-close conversion rate across all statuses
- [ ] Update case studies with new client results
- [ ] Review and update [agent templates](/admin/agent-templates) if patterns emerge
- [ ] Check for stale `qualified` leads (>14 days without follow-up) — move to `nurture` or `lost`
- [ ] Review `nurture` leads — any worth re-engaging?
- [ ] Mark completed engagements as `closed`

## Lead Status Definitions
| Status | Meaning | Next action |
|--------|---------|-------------|
| `new` | Just came in, not reviewed yet | Triage within 24h |
| `qualified` | Good fit, actively pursuing | Set follow-up, book call |
| `nurture` | Potential fit, not ready now | Keep in email sequence, revisit monthly |
| `booked` | Scoping call scheduled | Prep for call |
| `closed` | Deal done (or engagement complete) | Create case study |
| `unqualified` | Not a fit | No action needed |
| `lost` | Was qualified but chose competitor / went silent / declined | Review monthly for patterns |

## What's Automated vs Manual
| Process | Status | Tool |
|---------|--------|------|
| Lead capture | Automated | Firestore via API |
| Lead scoring | Automated | `lib/leads/scoring.ts` |
| Nurture emails (4-email sequence) | Automated | Resend scheduledAt |
| Admin notification on new lead | Automated | Resend |
| Lead qualification / triage | Manual | [Leads dashboard](/admin/leads) |
| Follow-up scheduling | Manual | Lead detail page |
| Scoping call booking | Manual | Email / calendar link |
| Case study creation | Manual | [Case Studies CMS](/admin/case-studies) |
| A/B experiment analysis | Manual | [Experiments](/admin/experiments) |
| Client implementation | Manual | Offline delivery |
