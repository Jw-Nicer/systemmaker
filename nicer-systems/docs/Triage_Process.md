# Triage Process

## Issue Categories

| Category | Label | Description |
|----------|-------|-------------|
| Bug | `bug` | Something broken that affects users or leads |
| Feature Request | `feature` | New capability or enhancement |
| Content Update | `content` | Copy changes, case study updates, FAQ edits |

## Priority Levels

| Priority | Label | SLA | Examples |
|----------|-------|-----|----------|
| P0 | `p0` | Fix same day | Lead capture broken, site down, agent chain failing, email delivery broken |
| P1 | `p1` | Fix within 1 week | UI rendering issue, scoring bug, broken link, degraded experience |
| P2 | `p2` | Backlog (monthly review) | Nice-to-have improvement, minor cosmetic issue, copy tweak |

## Where Issues Live

GitHub Issues on the repo. Use labels: `bug`, `feature`, `content`, `p0`, `p1`, `p2`.

Every issue should have exactly one category label and one priority label.

## Bug Report Template

```
### Summary
[One-sentence description]

### Steps to Reproduce
1. Go to ...
2. Click ...
3. Observe ...

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Screenshots
[Attach if applicable]

### Environment
- Browser:
- Device:
- URL:
```

## Feature Request Template

```
### Problem Statement
[What pain point or gap does this address?]

### Proposed Solution
[How should it work?]

### Impact Estimate
- Who benefits: [leads / admin / both]
- Frequency: [daily / weekly / rare]
- Effort guess: [small / medium / large]

### Alternatives Considered
[Other approaches and why this one is better]
```

## Content Update Template

```
### What to Update
[Page / section / component affected]

### Current Copy
[Paste current text or describe current state]

### New Copy
[Paste desired text or describe desired state]

### Reason
[Why this change is needed — new client result, outdated info, etc.]
```

## Triage Rules

1. **P0 = fix same day.** Drop everything. If it blocks revenue or lead capture, it's P0.
2. **P1 = fix within 1 week.** Schedule into the current week's work.
3. **P2 = backlog.** Review monthly during the monthly ops review (see `SOP_Founder_Operations.md`).
4. When in doubt, label P1. It's better to over-prioritize than let a real issue sit.
5. When hiring a VA or contractor, share this doc as part of onboarding.
