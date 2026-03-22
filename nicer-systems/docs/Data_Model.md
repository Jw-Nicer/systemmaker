# Data Model (Firebase Firestore)
**Doc Date:** 2026-02-27 | **Updated:** 2026-03-21

## Collections

### site_settings (doc ID: `default`)
- theme_primary (string) // hex
- theme_secondary (string)
- gradient_preset (string)
- glow_intensity (number) // 0–100
- motion_intensity (number) // 0–3
- brush_style (string) // soft|hard|spray
- cta_primary_url (string)
- cta_secondary_url (string)
- updated_at (timestamp)

### case_studies
- id (auto-generated doc ID)
- slug (string, unique)
- title (string)
- client_name (string)
- industry (string)
- workflow_type (string) // matches AUDIT_WORKFLOW_TYPES: Lead intake, Scheduling, Dispatch, Approvals, Reporting, Customer updates, Billing, Document handling, Other
- tools (string[])
- challenge (string)
- solution (string)
- metrics (array) // [{label, before, after}]
- result_categories (string[]) // time_saved, error_reduction, cost_reduction, visibility_gained, throughput_increase, compliance_achieved
- thumbnail_url (string)
- status (string) // draft|review|published|archived — replaces is_published
- is_published (boolean) // derived from status === "published", kept for backward compat
- published_at (string | null) // ISO timestamp, set on first publish
- sort_order (number)
- created_at, updated_at (timestamp)

### testimonials
- id (auto-generated doc ID)
- name (string)
- role (string)
- company (string)
- quote (string)
- avatar (string) // URL
- is_published (boolean)
- sort_order (number)
- created_at, updated_at (timestamp)

### offers
- id (auto-generated doc ID)
- name (string)
- price (string)
- features (string[])
- highlight (boolean)
- is_published (boolean)
- sort_order (number)
- created_at, updated_at (timestamp)

### faqs
- id (auto-generated doc ID)
- question (string)
- answer (string)
- sort_order (number)
- is_published (boolean)
- created_at, updated_at (timestamp)

### leads
- id (auto-generated doc ID)
- name (string)
- email (string)
- company (string)
- bottleneck (string)
- tools (string)
- urgency (string) // low|medium|high|urgent
- source (string) // contact_form|agent_demo
- utm_source (string)
- utm_medium (string)
- utm_campaign (string)
- utm_content (string)
- landing_path (string)
- status (LeadStatus) // new|qualified|nurture|booked|closed|unqualified|lost
  // nurture = potential fit, not ready now — stays in email sequence
  // lost = was qualified but chose competitor, went silent, or explicitly declined
- score (number) // 0–75, computed by lib/leads/scoring.ts
- plan_id (string) // links to generated plan doc
- nurture_enrolled (boolean) // whether enrolled in email nurture sequence
- preview_plan_sent_at (timestamp) // when preview plan email was sent
- follow_up_at (timestamp) // scheduled follow-up date
- follow_up_note (string) // admin note for follow-up
- created_at (timestamp)
- updated_at (timestamp)

#### leads/{leadId}/activity (subcollection)
- id (auto-generated doc ID)
- type (string) // status_change|note_added|email_sent|follow_up_set|follow_up_completed
- timestamp (timestamp)
- admin_email (string)
- details (map) // varies by type: {from, to} for status_change, {note} for note_added, {subject, to} for email_sent

### events
- id (auto-generated doc ID)
- event_name (string)
- payload (map)
- created_at (timestamp)

### agent_templates
- id (auto-generated doc ID)
- key (string, unique) // intake_agent, workflow_mapper, automation_designer, dashboard_designer, ops_pulse_writer
- name (string)
- description (string)
- markdown (string) // prompt template content
- updated_at (timestamp)

### variants
- id (auto-generated doc ID)
- slug (string, unique) // used as URL path: /[industry]
- industry (string)
- headline (string)
- subheadline (string)
- cta_text (string)
- meta_title (string) // SEO title for the variant page
- meta_description (string) // SEO description for the variant page
- featured_industries (string[])
- sections (map, optional) // LandingVariantSections — per-section overrides
  - hero: {headline, subheadline, cta_text, proof_line}
  - demo: {eyebrow, title, description}
  - proof: {eyebrow, title, description, featured_industries[]}
  - how_it_works: {eyebrow, title, steps[{id, title, description}]}
  - features: {eyebrow, title, items[{id, title, description, visual}]}
  - pricing: {eyebrow, title, description, highlighted_tier?}
  - faq: {eyebrow, title, description}
  - final_cta: {eyebrow, title, description, cta_text}
- is_published (boolean)
- sort_order (number)
- created_at, updated_at (timestamp)

Note: When sections is omitted or partially filled, `normalizeVariantSections()` in `lib/marketing/variant-content.ts` fills in defaults. Top-level headline/subheadline/cta_text are used as fallback for sections.hero fields.

### experiments
- id (auto-generated doc ID)
- name (string)
- target (string) // what is being tested (e.g., "hero_headline")
- variants (array) // [{id, name, weight}]
- status (string) // draft|running|completed
- winner (string | null) // winning variant ID
- created_at, updated_at (timestamp)

### plans
- id (auto-generated doc ID)
- preview_plan (map) // PreviewPlan object with sections: intake, workflow, automation, dashboard, ops_pulse
- input_summary (map) // {industry, bottleneck_summary}
- lead_id (string | null) // linked lead doc
- created_at (timestamp)
- view_count (number) // incremented on public views
- is_public (boolean) // controls public access via /plan/[id]
- version (number) // current version number
- versions (array) // [{version, section, content, feedback, created_at}] — refinement history

## Storage (Firebase Storage)
- Case study media (thumbnails, images)
- Testimonial avatars
- Public read, authenticated write (see `storage.rules`)

## Firestore Security Rules Summary
| Collection | Public Read | Public Write | Auth Read | Auth Write |
|------------|-----------|-------------|-----------|-----------|
| site_settings | all | — | all | yes |
| case_studies | status=published | — | all | yes |
| testimonials | is_published=true | — | all | yes |
| offers | is_published=true | — | all | yes |
| faqs | is_published=true | — | all | yes |
| leads | — | create (restricted fields) | all | yes |
| leads/activity | — | — | all | yes |
| events | — | create (restricted fields) | all | — |
| agent_templates | — | — | all | yes |
| variants | is_published=true | — | all | yes |
| experiments | status=running | — | all | yes |
| plans | is_public=true | — | all | yes |

## Firestore Indexes
See `firestore.indexes.json` for custom composite indexes on:
- case_studies (status + sort_order)
- faqs (is_published + sort_order)
- testimonials (is_published + sort_order)
- offers (is_published + sort_order)
- variants (is_published + sort_order)
- leads (status + created_at, score + created_at)
- plans (is_public + created_at)
