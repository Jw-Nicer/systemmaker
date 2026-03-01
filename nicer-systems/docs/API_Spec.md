# API Spec (App Routes)
**Doc Date:** 2026-02-27 | **Updated:** 2026-03-01

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
  - returns: {lead_id}

- POST /api/events
  - body: {event_name, payload?, lead_id?}
  - creates doc in `events` collection
  - returns: 200

## Agent endpoints
- POST /api/agent/run
  - body: {templateKey, context} (agent template key + user input context)
  - runs agent chain via Gemini API
  - returns: {result} (agent output)

- POST /api/agent/send-email
  - body: {to, subject, html} (email details)
  - sends email via Resend API
  - returns: 200

## Admin endpoints (server actions)
Admin CRUD is implemented via Next.js server actions in `lib/actions/`, not REST API routes.
All actions require authentication (checked via `getSessionUser()`).

- **Case Studies**: getAllCaseStudies, createCaseStudy, updateCaseStudy, deleteCaseStudy, toggleCaseStudyPublished, reorderCaseStudies
- **Testimonials**: getAllTestimonials, createTestimonial, updateTestimonial, deleteTestimonial, toggleTestimonialPublished, reorderTestimonials
- **FAQs**: getAllFAQs, createFAQ, updateFAQ, deleteFAQ, toggleFAQPublished, reorderFAQs
- **Offers**: getAllOffers, createOffer, updateOffer, deleteOffer, toggleOfferPublished, reorderOffers
- **Leads**: getAllLeads, updateLeadStatus, exportLeadsCSV
- **Agent Templates**: getAllTemplates, updateTemplate, testRunTemplate
- **Site Settings**: managed via ThemeCustomizer component (direct Firestore writes)
