# Data Model (Supabase/Postgres)
**Doc Date:** 2026-02-27

## Tables
### site_settings (single row)
- id (uuid)
- theme_primary (text)  // hex
- theme_secondary (text)
- gradient_preset (text)
- glow_intensity (int)  // 0–100
- motion_intensity (int) // 0–3
- brush_style (text) // soft|hard|spray
- cta_primary_url (text)
- cta_secondary_url (text)
- updated_at (timestamp)

### case_studies
- id (uuid)
- slug (text, unique)
- title (text)
- industry (text)
- workflow_type (text)
- tool_stack (text[])
- summary_problem (text)
- summary_solution (text)
- metrics (jsonb) // [{label, before, after, unit}]
- media (jsonb) // [{type:image|video, url, caption}]
- tags (text[])
- is_published (bool)
- published_at (timestamp)
- created_at, updated_at

### testimonials
- id
- name (text)
- role (text)
- company (text)
- quote (text)
- avatar_url (text)
- is_published (bool)
- created_at, updated_at

### offers
- id
- name (text)
- price_range (text)
- bullets (text[])
- highlight (bool)
- is_published (bool)

### faqs
- id
- question (text)
- answer (text)
- order_index (int)
- is_published (bool)

### leads
- id
- name (text)
- email (text)
- company (text)
- bottleneck (text)
- tools (text)
- urgency (text)
- utm_source (text)
- utm_medium (text)
- utm_campaign (text)
- utm_content (text)
- landing_path (text)
- created_at (timestamp)
- status (text) // new|qualified|booked|closed|unqualified

### events (optional if PostHog is external)
- id
- lead_id (uuid, nullable)
- event_name (text)
- payload (jsonb)
- created_at

### agent_templates (Phase 2)
- id
- key (text, unique) // workflow_mapper, dashboard_designer, etc.
- markdown (text)
- updated_at

## Storage buckets
- public-media (case studies media, avatars)
- private (optional for drafts)
