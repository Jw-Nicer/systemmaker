# UI/UX Spec (Public + Admin)
**Doc Date:** 2026-02-27 | **Updated:** 2026-03-05

## Public pages
### Landing sections (order)
1. Hero (Brush Reveal + clear offer + CTAs)
2. "See it work" (Mini Agent form + SSE streaming chat)
3. Proof of Work (gallery row + 3 featured cases with filter chips)
4. How It Works (4-step timeline with scroll animation)
5. Pricing/Offer (3 tiers from Firestore)
6. FAQ (accordion from Firestore)
7. CTA (book / contact)

### Brush Reveal Interaction Spec
- Visual: two layers with a "blueprint grid" overlay on top
- Cursor: becomes a brush circle with subtle glow
- Interaction: painting reveals the layer underneath (HTML5 Canvas)
- Constraint: maintain 60fps on desktop; degrade gracefully
- Mobile: finger drag reveals; if low perf, fallback to swipe crossfade
- Reduced motion: disable particle drift + provide static images

### Ambient "Workflow Graph"
- SVG node/edge network behind certain sections
- Subtle motion, robotic feel
- Pause when tab not active
- Respects reduced motion preference

### Agent Chat UI
- Multi-turn conversation interface with streaming responses
- Typing indicator during agent processing
- Inline plan cards when plan is generated
- Phase-aware UI (gathering questions, confirming, building progress, complete view)
- Section refinement controls on completed plans
- Share buttons for generated plans

### Proof of Work Gallery
- Filter chips: Industry, Tool, Workflow
- Each card: title, 1-line result, 1–2 metrics, thumbnail
- Click → detail page with story structure + related recommendations + CTA

### Case Study Detail
- Challenge / Solution / Metrics layout
- Before/after metrics display
- Related case study recommendations (same industry)
- CTA at bottom

### Industry Variant Pages (`/[industry]`)
- Dynamic landing pages with admin-managed content
- Customized headline, subheadline, CTA text per industry
- Featured industries for cross-linking

### Shareable Plan Page (`/plan/[id]`)
- Public view of generated preview plan
- All sections displayed (workflow, automation, dashboard, ops pulse)
- Section refinement UI (if plan owner)
- Version diff comparison
- Share buttons (social + copy link)
- CTA to generate own plan or book a call

### Contact Page
- Form + scheduler embed/link
- Inline "what happens next" checklist

## Admin pages
### Dashboard (`/admin`)
- Real Firestore metrics (leads count, case studies count, experiments)
- Recent leads list with status badges and scores
- Overdue follow-up reminders widget
- Upcoming follow-ups widget
- Quick action links

### Case Studies Manager
- Create/edit/publish with form validation
- Drag reorder featured cases
- Media uploader (image/video via Firebase Storage)
- Industry and tools tagging
- Preview button for draft

### Leads Dashboard (`/admin/leads`)
- Status filter tabs (new, qualified, booked, closed, unqualified)
- Lead score display (0–75)
- CSV export button
- Click row → lead detail page

### Lead Detail (`/admin/leads/[id]`)
- Full lead information card
- Activity timeline (status changes, notes, email logs)
- Add note form
- Status update dropdown (logs to timeline)
- Follow-up reminder (date picker + note)
- Linked preview plan (if generated)

### Landing Variants (`/admin/variants`)
- CRUD list with publish/draft toggle
- Fields: slug, industry, headline, subheadline, CTA text, featured industries
- Preview of how variant will appear

### A/B Experiments (`/admin/experiments`)
- Create experiment with name, target, variants
- Start/stop toggle
- Status display (draft, running, completed)
- Declare winner button

### Theme Customizer (`/admin/settings`)
- Color pickers + preset gradients
- Glow intensity slider (0–100)
- Motion intensity slider (0–3)
- Brush style selector
- Live preview panel
- Save applies site-wide via CSS variables

### Agent Templates (`/admin/agent-templates`)
- Markdown editor for each template
- Test-run with sample inputs via Gemini
- Template list with last-updated timestamps
