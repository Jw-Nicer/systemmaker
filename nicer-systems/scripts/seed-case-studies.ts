/**
 * Seed script — populates case_studies collection with sample data.
 * Usage: npx tsx scripts/seed-case-studies.ts
 *
 * Requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * in your .env.local (loaded via dotenv).
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const db = getFirestore();

const caseStudies = [
  {
    title: "Automated Invoice Processing for Regional Plumbing Company",
    slug: "automated-invoice-processing-plumbing",
    client_name: "FlowRight Plumbing",
    industry: "Home Services",
    tools: ["Zapier", "Google Sheets", "QuickBooks Online"],
    challenge:
      "FlowRight Plumbing was losing 12+ hours per week to manual invoice entry. Technicians would fill out paper job sheets, the office manager would re-key everything into QuickBooks, and errors were common — duplicate entries, wrong amounts, missing line items. Late invoicing meant late payments, hurting cash flow.",
    solution:
      "We built a simple automation pipeline: technicians now fill out a Google Form on their phones when a job is complete. Zapier picks up the submission, formats the line items, and creates a draft invoice in QuickBooks Online. The office manager just reviews and sends. A Google Sheet serves as the audit log so nothing falls through the cracks.",
    metrics: [
      { label: "Weekly hours on invoicing", before: "12 hrs", after: "2 hrs" },
      { label: "Invoice error rate", before: "18%", after: "2%" },
      { label: "Average days to invoice", before: "5 days", after: "Same day" },
    ],
    thumbnail_url: "",
    is_published: true,
    sort_order: 0,
  },
  {
    title: "Client Onboarding System for Boutique Law Firm",
    slug: "client-onboarding-law-firm",
    client_name: "Hartley & Associates",
    industry: "Legal",
    tools: ["Airtable", "Calendly", "DocuSign", "Zapier"],
    challenge:
      "New client intake involved a chain of emails, phone calls, and paper forms. Partners were spending 45 minutes per new client just on admin — sending engagement letters, collecting documents, scheduling the initial consult. Clients would drop off mid-process because it felt clunky and slow.",
    solution:
      "We designed a self-service onboarding flow. New clients receive a single link that walks them through an Airtable form (intake questions), Calendly booking (initial consult), and DocuSign (engagement letter). Zapier ties it together — each step triggers the next automatically, and the firm gets a Slack notification when a client completes the full sequence.",
    metrics: [
      {
        label: "Onboarding time per client",
        before: "45 min",
        after: "5 min",
      },
      { label: "Client drop-off rate", before: "30%", after: "8%" },
      {
        label: "Time to first consult",
        before: "7 days",
        after: "2 days",
      },
    ],
    thumbnail_url: "",
    is_published: true,
    sort_order: 1,
  },
  {
    title: "Appointment Reminder System for Multi-Location Dental Practice",
    slug: "appointment-reminders-dental-practice",
    client_name: "BrightSmile Dental Group",
    industry: "Healthcare",
    tools: ["Twilio", "Google Sheets", "Zapier"],
    challenge:
      "No-shows were costing BrightSmile an estimated $4,200/month across their three locations. Front desk staff were manually calling patients the day before appointments, but with 60+ appointments daily, many calls never got made. When they did call, they often reached voicemail anyway.",
    solution:
      "We set up an automated SMS reminder system. Appointment data syncs from their scheduling software to a Google Sheet. Zapier monitors the sheet and triggers Twilio SMS messages — one reminder 48 hours before and another 2 hours before. Patients can reply 'C' to confirm or 'R' to reschedule, which updates the sheet and alerts the front desk.",
    metrics: [
      { label: "Monthly no-show rate", before: "22%", after: "7%" },
      {
        label: "Staff hours on reminder calls",
        before: "15 hrs/week",
        after: "0 hrs",
      },
      {
        label: "Estimated monthly revenue recovered",
        before: "$0",
        after: "$3,100",
      },
    ],
    thumbnail_url: "",
    is_published: true,
    sort_order: 2,
  },
  {
    title: "Lead Tracking Dashboard for Roofing Contractor",
    slug: "lead-tracking-dashboard-roofing",
    client_name: "Summit Roofing Co.",
    industry: "Construction",
    tools: ["Airtable", "Typeform", "Zapier", "Google Data Studio"],
    challenge:
      "Summit Roofing was getting leads from five different sources — Google Ads, Facebook, Angi, referrals, and walk-ins — but everything lived in the owner's head or scattered sticky notes. They had no idea which channel was actually profitable, and follow-ups were inconsistent. Roughly 40% of leads never got a callback.",
    solution:
      "We centralized everything into Airtable as a lightweight CRM. Typeform handles web inquiries. Zapier routes leads from all five sources into a single Airtable base with source tracking. Each lead gets an automatic status (New → Contacted → Quoted → Won/Lost). A Google Data Studio dashboard shows close rates and ROI by channel in real time. Daily digest emails remind the team of untouched leads.",
    metrics: [
      { label: "Leads without follow-up", before: "40%", after: "3%" },
      { label: "Quote-to-close rate", before: "15%", after: "28%" },
      {
        label: "Time to identify best lead source",
        before: "Guesswork",
        after: "Real-time",
      },
    ],
    thumbnail_url: "",
    is_published: true,
    sort_order: 3,
  },
  {
    title: "Employee Time-Off Request Workflow for Staffing Agency",
    slug: "time-off-request-workflow-staffing",
    client_name: "PeopleBridge Staffing",
    industry: "Staffing & HR",
    tools: ["Google Forms", "Google Sheets", "Zapier", "Slack"],
    challenge:
      "PeopleBridge managed 120+ temporary workers across dozens of client sites. Time-off requests came in via text, email, phone calls, and even in-person — all to different coordinators. Requests got lost, double-bookings happened, and there was no central record. HR spent hours each week sorting it out manually.",
    solution:
      "We replaced the chaos with a single Google Form link that every worker bookmarks. Submissions land in a structured Google Sheet that auto-calculates coverage gaps by client site. Zapier sends the request to the right coordinator via Slack for one-click approval. Once approved, the worker gets an automatic confirmation email and the master schedule updates.",
    metrics: [
      { label: "Lost/missed requests per month", before: "8–12", after: "0" },
      {
        label: "HR hours on PTO coordination",
        before: "6 hrs/week",
        after: "1 hr/week",
      },
      {
        label: "Double-booking incidents",
        before: "3–4/month",
        after: "0",
      },
    ],
    thumbnail_url: "",
    is_published: true,
    sort_order: 4,
  },
  {
    title: "Vendor Payment Reconciliation for Property Management Firm",
    slug: "vendor-payment-reconciliation-property-management",
    client_name: "Keystone Property Group",
    industry: "Real Estate",
    tools: ["Google Sheets", "Zapier", "QuickBooks Online", "Slack"],
    challenge:
      "Keystone manages 45 rental properties and works with 30+ vendors (plumbers, electricians, landscapers). Each month, the bookkeeper spent two full days cross-referencing vendor invoices against work orders to make sure they matched before paying. Discrepancies were common and required back-and-forth emails that dragged on for days.",
    solution:
      "We built a reconciliation sheet that pulls work order data and invoice data into side-by-side columns automatically. Zapier watches for new invoices in QuickBooks and matches them against the work order log by vendor and property. Mismatches get flagged instantly with a Slack alert to the bookkeeper, who can resolve them before payment day instead of discovering them mid-reconciliation.",
    metrics: [
      {
        label: "Monthly reconciliation time",
        before: "16 hrs",
        after: "3 hrs",
      },
      {
        label: "Payment discrepancies caught late",
        before: "5–8/month",
        after: "0–1/month",
      },
      {
        label: "Vendor payment disputes",
        before: "2–3/month",
        after: "Rare",
      },
    ],
    thumbnail_url: "",
    is_published: true,
    sort_order: 5,
  },
  {
    title: "Inventory Reorder Alerts for Auto Parts Distributor",
    slug: "inventory-reorder-alerts-auto-parts",
    client_name: "PartsPro Distribution",
    industry: "Wholesale & Distribution",
    tools: ["Google Sheets", "Zapier", "Twilio", "Gmail"],
    challenge:
      "PartsPro tracked inventory in spreadsheets but had no automated reorder system. The warehouse manager would do a manual count every Friday and place orders based on gut feel. Stockouts on popular parts happened 2–3 times per month, causing lost sales and frustrated customers. Overstocking on slow-moving parts tied up $40K+ in unnecessary inventory.",
    solution:
      "We added reorder-point logic directly in their existing Google Sheets setup. Each SKU now has a minimum threshold based on 90-day sales velocity. When stock dips below the threshold, Zapier fires an SMS alert to the warehouse manager and auto-generates a draft purchase order email to the supplier. A weekly summary report highlights slow-movers that should be discounted or returned.",
    metrics: [
      { label: "Monthly stockouts", before: "2–3", after: "0" },
      {
        label: "Excess inventory value",
        before: "$42K",
        after: "$18K",
      },
      {
        label: "Time on manual inventory checks",
        before: "4 hrs/week",
        after: "30 min/week",
      },
    ],
    thumbnail_url: "",
    is_published: true,
    sort_order: 6,
  },
  {
    title: "Customer Feedback Collection & Routing for HVAC Company",
    slug: "customer-feedback-routing-hvac",
    client_name: "ComfortZone HVAC",
    industry: "Home Services",
    tools: ["Typeform", "Zapier", "Google Sheets", "Slack", "Google Business Profile"],
    challenge:
      "ComfortZone had no system for collecting customer feedback after service calls. They knew word-of-mouth mattered but had only 12 Google reviews after 3 years in business. When complaints came in, they arrived via random texts and emails with no tracking — the same issues kept recurring because there was no pattern visibility.",
    solution:
      "We set up an automated feedback loop. Two hours after each service call, the customer receives a Typeform survey via text. Positive responses (4–5 stars) get an automatic follow-up asking for a Google review with a direct link. Negative responses (1–3 stars) trigger an immediate Slack alert to the owner with the customer's details for same-day follow-up. All responses log to Google Sheets for monthly trend analysis.",
    metrics: [
      { label: "Google reviews", before: "12 total", after: "85+ in 6 months" },
      { label: "Average rating", before: "3.8 stars", after: "4.7 stars" },
      {
        label: "Complaint response time",
        before: "2–5 days",
        after: "Same day",
      },
    ],
    thumbnail_url: "",
    is_published: true,
    sort_order: 7,
  },
];

async function seed() {
  const collection = db.collection("case_studies");
  const now = new Date().toISOString();

  for (const cs of caseStudies) {
    // Check if slug already exists
    const existing = await collection
      .where("slug", "==", cs.slug)
      .limit(1)
      .get();

    if (!existing.empty) {
      console.log(`Skipping "${cs.title}" — slug already exists.`);
      continue;
    }

    await collection.add({
      ...cs,
      created_at: now,
      updated_at: now,
    });
    console.log(`Created: "${cs.title}"`);
  }

  console.log("\nCase studies seed complete.");
}

seed().catch(console.error);
