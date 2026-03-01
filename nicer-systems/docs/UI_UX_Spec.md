# UI/UX Spec (Public + Admin)
**Doc Date:** 2026-02-27

## Public pages
### Landing sections (order)
1. Hero (Brush Reveal + clear offer + CTAs)
2. “See it work” (Mini Agent teaser or full demo in Phase 2)
3. Proof of Work (gallery row + 3 featured cases)
4. How It Works (timeline + deliverables)
5. Pricing/Offer (3 tiers)
6. FAQ
7. CTA (book / contact)

### Brush Reveal Interaction Spec
- Visual: two layers with a “blueprint grid” overlay on top
- Cursor: becomes a brush circle with subtle glow
- Interaction: painting reveals the layer underneath
- Constraint: maintain 60fps on desktop; degrade gracefully
- Mobile: finger drag reveals; if low perf, fallback to swipe crossfade
- Reduced motion: disable particle drift + provide static images

### Ambient “Workflow Graph”
- Node/edge network behind certain sections
- Subtle motion, robotic feel
- Pause when tab not active

### Proof of Work Gallery
- Filter chips: Industry, Tool, Workflow
- Each card: title, 1-line result, 1–2 metrics, thumbnail
- Click -> detail page with story structure + CTA

### Contact Page
- Form + scheduler embed/link
- Inline “what happens next” checklist

## Admin pages
### Admin Home
- Snapshot: new leads, top-performing pages, quick links

### Case Studies Manager
- Create/edit/publish
- Drag reorder featured cases
- Media uploader (image/video)
- Preview button for draft

### Theme Customizer
- Color pickers + preset gradients
- Glow intensity slider
- Motion intensity slider
- Brush style selector
- Preview panel

### Agent Templates (Phase 2)
- Edit markdown templates
- Test-run with sample inputs
- Save version history (optional)
