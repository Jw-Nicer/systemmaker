# API Spec (App Routes)
**Doc Date:** 2026-02-27 | **Updated:** 2026-03-05

## Auth endpoints
- POST /api/auth/session
  - body: {idToken} (Firebase ID token)
  - sets HTTP-only session cookie
  - returns: 200

- POST /api/auth/signout
  - clears session cookie
  - redirects to /admin/login

## Public endpoints
- POST /api/leads
  - body: {name, email, company, bottleneck?, tools?, urgency?, source?, utm_source?, utm_medium?, utm_campaign?, utm_content?, landing_path?}
  - validates with Zod leadSchema
  - creates doc in `leads` collection
  - computes lead score (0–75) and stores on doc
  - enrolls in nurture email sequence (5-email series via Resend scheduledAt)
  - sends admin notification email via Resend
  - returns: {lead_id}

- POST /api/events
  - body: {event_name, payload?, lead_id?}
  - creates doc in `events` collection
  - returns: 200

- GET /api/plans?id={planId}
  - returns: plan document (preview_plan, input_summary, view_count, version)
  - increments view_count on each public fetch

## Agent endpoints
- POST /api/agent/run
  - body: {industry, bottleneck, current_tools, urgency?, volume?}
  - runs agent chain via Gemini API (intake → workflow_mapper → automation_designer → dashboard_designer → ops_pulse_writer)
  - returns: {preview_plan, lead_id, steps_completed}
  - error returns: {error, failed_step?}

- POST /api/agent/chat
  - body: {message, conversation_id?, plan_id?}
  - SSE streaming endpoint (Content-Type: text/event-stream)
  - Multi-phase conversation flow:
    1. **gathering** — Agent asks intake questions
    2. **confirming** — Agent summarizes and confirms understanding
    3. **building** — Agent generates preview plan (streams progress)
    4. **complete** — Plan ready, presented to user
    5. **follow_up** — Post-plan refinement and questions
  - SSE event types: `message`, `phase`, `plan`, `error`, `done`
  - Rate limit: 20 messages per 10 minutes per session
  - returns: streaming SSE events

- POST /api/agent/refine
  - body: {plan_id, section, feedback}
  - refines a specific section of a preview plan based on user feedback
  - stores version history in plan's `versions[]` array
  - Rate limit: 10 refines per 10 minutes per session
  - returns: {updated_section, version}

- POST /api/agent/send-email
  - body: {name, email, preview_plan, lead_id?}
  - sends preview-plan email via Resend API
  - returns: {success: true}

## Admin endpoints (server actions)
Admin CRUD is implemented via Next.js server actions in `lib/actions/`, not REST API routes.
All actions require authentication (checked via `getSessionUser()`).

- **Case Studies**: getAllCaseStudies, createCaseStudy, updateCaseStudy, deleteCaseStudy, toggleCaseStudyPublished, reorderCaseStudies
- **Testimonials**: getAllTestimonials, createTestimonial, updateTestimonial, deleteTestimonial, toggleTestimonialPublished, reorderTestimonials
- **FAQs**: getAllFAQs, createFAQ, updateFAQ, deleteFAQ, toggleFAQPublished, reorderFAQs
- **Offers**: getAllOffers, createOffer, updateOffer, deleteOffer, toggleOfferPublished, reorderOffers
- **Leads**: getAllLeads, updateLeadStatus, exportLeadsCSV
- **Lead Activity**: getLeadActivity, addNote, logStatusChange, logEmailSent
- **Agent Templates**: getAllTemplates, updateTemplate, testRunTemplate
- **Variants**: getAllVariants, createVariant, updateVariant, deleteVariant, toggleVariantPublished
- **Experiments**: getAllExperiments, createExperiment, updateExperiment, deleteExperiment, startExperiment, stopExperiment, declareWinner
- **Site Settings**: managed via ThemeCustomizer component (direct Firestore writes)
