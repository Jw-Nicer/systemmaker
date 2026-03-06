# Admin Spec (CMS + Settings + Leads CRM)
**Doc Date:** 2026-02-27 | **Updated:** 2026-03-05

## Roles
MVP: Single role: Admin (authenticated via Firebase Auth, email/password)
Later: Editor, Analyst, Admin

## Admin Pages

### Dashboard (`/admin`)
- Real Firestore metrics (total leads, case studies, experiments)
- Recent leads list with status badges
- Overdue follow-up reminders widget
- Upcoming follow-ups widget

### Content CRUD
All content pages share common patterns:
- Form validation on all fields (Zod schemas)
- Auto-slug generation with edit override (case studies, variants)
- Draft/published separation (`is_published` toggle)
- Drag-to-reorder (`sort_order`)
- Audit fields (created_at, updated_at)

| Page | Route | Features |
|------|-------|----------|
| Case Studies | `/admin/case-studies` | CRUD, media upload, metrics editor, publish/draft |
| Testimonials | `/admin/testimonials` | CRUD, avatar upload, publish/draft |
| FAQs | `/admin/faqs` | CRUD, reorder, publish/draft |
| Offers | `/admin/offers` | CRUD, pricing tiers, highlight toggle, publish/draft |

### Leads CRM (`/admin/leads`)
- View all leads with status filter (new, qualified, booked, closed, unqualified)
- Lead score display (0–75 points, auto-computed)
- CSV export
- Click to view lead detail

### Lead Detail (`/admin/leads/[id]`)
- Full lead information display
- Activity timeline (status changes, notes, email logs)
- Add notes
- Update status (logs to activity timeline)
- Set follow-up reminder (date + note)
- View linked preview plan (if generated)

### Landing Variants (`/admin/variants`)
- CRUD for industry-specific landing pages
- Fields: slug, industry, headline, subheadline, cta_text, featured_industries
- Published variants appear at `/[industry]` routes

### A/B Experiments (`/admin/experiments`)
- Create experiment with name, target, and variant definitions
- Start/stop experiments
- View experiment status
- Declare winner

### Agent Templates (`/admin/agent-templates`)
- Markdown editor for agent prompt templates
- Test runner (run template against sample input)
- Templates stored in Firestore `agent_templates` collection

### Theme Settings (`/admin/settings`)
- Color picker (primary, secondary)
- Gradient preset selector
- Glow intensity slider (0–100)
- Motion intensity slider (0–3)
- Live preview
- Saves to `site_settings/default` doc, applies site-wide via CSS variables

## Core workflows
### Publish case study
1) Create draft with title, slug, industry, tools
2) Upload media (thumbnail)
3) Add challenge, solution, metrics
4) Save + preview
5) Publish (toggle is_published)

### Manage leads
1) View leads dashboard with status filter
2) Click lead to view detail
3) Add notes, update status
4) Set follow-up reminders
5) Export qualified leads to CSV

### Run A/B test
1) Create experiment with target and variants
2) Start experiment (status → running)
3) Monitor results via analytics
4) Declare winner and stop experiment

### Update theme
1) Change colors / glow / motion intensity
2) Preview in-panel
3) Save → applies site-wide instantly via CSS variables
