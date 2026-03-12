# API Spec (App Routes)
**Doc Date:** 2026-02-27 | **Updated:** 2026-03-12

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

- POST /api/booking
  - body: {name, email, date, time, message?, source?}
  - creates Google Calendar event via service account
  - creates lead record if email is new
  - returns: {success: true, booking_id}

- GET /api/leads/unsubscribe?token={hashedLeadId}
  - verifies token against lead_id
  - sets nurture_unsubscribed: true on lead doc
  - returns: HTML confirmation page

- GET /api/plans/export?id={planId}
  - generates PDF export of preview plan
  - returns: PDF file download

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

- POST /api/agent/audit
  - body: {industry, workflow_type, team_size, stack_maturity, bottleneck, manual_steps?, handoff_breaks?, visibility_gap?, current_tools[], volume?, urgency?, time_lost_per_week?, compliance_notes?, desired_outcome}
  - runs full agent chain (same as /api/agent/run but with richer intake)
  - stores result in plans collection with source: "guided_audit"
  - returns: {preview_plan, plan_id, lead_id}

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
- **Variants**: getAllVariants, createVariant, updateVariant, deleteVariant, toggleVariantPublished, reorderVariants, bulkTogglePublished, getVariantAnalytics
- **Experiments**: getAllExperiments, createExperiment, updateExperiment, deleteExperiment, startExperiment, stopExperiment, declareWinner
- **Site Settings**: managed via ThemeCustomizer component (direct Firestore writes)
