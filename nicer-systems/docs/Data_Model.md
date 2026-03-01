# Data Model (Firebase Firestore)
**Doc Date:** 2026-02-27 | **Updated:** 2026-03-01

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
- tools (string[])
- challenge (string)
- solution (string)
- metrics (array) // [{label, before, after}]
- thumbnail_url (string)
- is_published (boolean)
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

### faqs
- id (auto-generated doc ID)
- question (string)
- answer (string)
- sort_order (number)
- is_published (boolean)

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
- status (string) // new|qualified|booked|closed|unqualified
- created_at (timestamp)

### events
- id (auto-generated doc ID)
- event_name (string)
- payload (map)
- created_at (timestamp)

### agent_templates
- id (auto-generated doc ID)
- key (string, unique) // intake_agent, workflow_mapper, etc.
- name (string)
- description (string)
- markdown (string) // prompt template content
- updated_at (timestamp)

## Storage (Firebase Storage)
- Case study media (thumbnails, images)
- Testimonial avatars
- Public read, authenticated write (see `storage.rules`)
