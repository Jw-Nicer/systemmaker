# Admin Spec (CMS + Settings)
**Doc Date:** 2026-02-27

## Roles
MVP: Single role: Admin (authenticated via Firebase Auth, email/password)
Later: Editor, Analyst, Admin

## Core workflows
### Publish case study
1) Create draft
2) Upload media
3) Save + preview
4) Publish

### Update theme
1) Change colors / glow / motion
2) Preview in-panel
3) Save -> applies site-wide instantly

### Leads triage (Phase 2)
- View list
- Mark status
- Export CSV

## Required admin features
- Form validation on all fields
- Auto-slug generation with edit override
- Draft/published separation
- Basic audit fields (created_at/updated_at)
