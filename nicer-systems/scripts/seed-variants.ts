/**
 * Seed script — fix healthcare variant sections + create industry variants.
 * Usage: npx tsx scripts/seed-variants.ts
 *
 * Requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * in your .env.local (loaded via dotenv).
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const db = getFirestore();

// ---------------------------------------------------------------------------
// Fix healthcare variant — sections.hero still has placeholder content
// ---------------------------------------------------------------------------
async function fixHealthcareSections() {
  const snap = await db
    .collection("variants")
    .where("slug", "==", "healthcare")
    .limit(1)
    .get();

  if (snap.empty) {
    console.log("No healthcare variant found — skipping sections fix.");
    return;
  }

  const doc = snap.docs[0];
  const data = doc.data();

  const updates: Record<string, unknown> = {};

  // Fix sections.hero (still has "Automate you healthcare" and "Go go go")
  if (data.sections?.hero) {
    const hero = data.sections.hero;
    if (hero.headline?.includes("Automate you healthcare") || hero.subheadline?.toLowerCase().includes("go go go")) {
      updates["sections.hero.headline"] = "Automate your healthcare operations";
      updates["sections.hero.subheadline"] =
        "Reduce manual intake, streamline patient workflows, and give your team real-time visibility into every step of care coordination.";
    }
  }

  // Fix weak meta_description
  if (data.meta_description === "Make the healthcare processes much faster") {
    updates.meta_description =
      "Workflow automation, KPI dashboards, and alert systems for healthcare practices. Reduce intake time, eliminate manual handoffs, and improve care coordination.";
  }

  // Fix proof section featured_industries
  if (data.sections?.proof?.featured_industries?.length === 1 && data.sections.proof.featured_industries[0] === "Medical Devices") {
    updates["sections.proof.featured_industries"] = ["Healthcare", "Dental", "Medical"];
  }

  if (Object.keys(updates).length > 0) {
    await doc.ref.update(updates);
    console.log(`Fixed healthcare variant sections: ${Object.keys(updates).join(", ")}`);
  } else {
    console.log("Healthcare variant sections look correct — no changes needed.");
  }
}

// ---------------------------------------------------------------------------
// Industry variant definitions
// ---------------------------------------------------------------------------
const variants = [
  {
    slug: "construction",
    industry: "Construction",
    headline: "Stop chasing subs.\nStart tracking jobs.",
    subheadline:
      "Dispatch boards, job status tracking, and automated follow-ups for general contractors, specialty trades, and construction managers.",
    cta_text: "Book a Scoping Call",
    meta_title: "Construction Automation — Nicer Systems",
    meta_description:
      "Workflow automation and job tracking for construction companies. Real-time dispatch boards, subcontractor follow-ups, and KPI dashboards.",
    featured_industries: ["Construction", "Roofing", "Electrical", "Plumbing"],
    sections: {
      hero: {
        headline: "Stop chasing subs.\nStart tracking jobs.",
        subheadline:
          "Dispatch boards, job status tracking, and automated follow-ups for general contractors, specialty trades, and construction managers.",
        cta_text: "Book a Scoping Call",
        proof_line:
          "Get a preview plan with dispatch workflow, job tracking KPIs, and alert rules.",
      },
      demo: {
        eyebrow: "Live Demo",
        title: "Build a preview plan for your jobs",
        description:
          "Tell the agent about your dispatch or job tracking bottleneck. It maps the workflow, identifies handoff gaps, and recommends the first automation pass.",
      },
      proof: {
        eyebrow: "Results",
        title: "Construction case studies",
        description:
          "See how construction teams replaced text-and-spreadsheet workflows with real-time dashboards and automated alerts.",
        featured_industries: ["Construction", "Roofing", "Electrical", "Plumbing"],
      },
      final_cta: {
        eyebrow: "Available now",
        title: "Get your jobs\nunder control",
        description:
          "Start with a scoping call. We map your dispatch and job tracking workflow, define the KPIs, and build the system — so you stop chasing and start managing.",
        cta_text: "Book a Scoping Call",
      },
    },
  },
  {
    slug: "property-management",
    industry: "Property Management",
    headline: "Every request tracked.\nEvery tenant updated.",
    subheadline:
      "Maintenance request pipelines, vendor assignment automation, and tenant communication workflows for property managers and HOA operators.",
    cta_text: "Book a Scoping Call",
    meta_title: "Property Management Automation — Nicer Systems",
    meta_description:
      "Workflow automation for property managers. Maintenance request tracking, vendor dispatch, tenant communication, and KPI dashboards.",
    featured_industries: ["Property Management", "Real Estate"],
    sections: {
      hero: {
        headline: "Every request tracked.\nEvery tenant updated.",
        subheadline:
          "Maintenance request pipelines, vendor assignment automation, and tenant communication workflows for property managers and HOA operators.",
        cta_text: "Book a Scoping Call",
        proof_line:
          "Get a preview plan with maintenance workflow, vendor KPIs, and escalation alerts.",
      },
      demo: {
        eyebrow: "Live Demo",
        title: "Build a preview plan for your properties",
        description:
          "Tell the agent about your maintenance or tenant communication bottleneck. It maps the request pipeline and recommends automation and alert rules.",
      },
      proof: {
        eyebrow: "Results",
        title: "Property management case studies",
        description:
          "See how property teams eliminated blind spots in maintenance pipelines and cut response times with automated owner assignment.",
        featured_industries: ["Property Management", "Real Estate"],
      },
      final_cta: {
        eyebrow: "Available now",
        title: "Fix the maintenance\npipeline",
        description:
          "Start with a scoping call. We map your request pipeline, define the escalation rules, and build the system — so nothing falls through the cracks.",
        cta_text: "Book a Scoping Call",
      },
    },
  },
  {
    slug: "staffing",
    industry: "Staffing",
    headline: "Track every placement.\nClose every loop.",
    subheadline:
      "Candidate pipelines, placement tracking, and automated status updates for staffing agencies, recruiters, and temp services.",
    cta_text: "Book a Scoping Call",
    meta_title: "Staffing Agency Automation — Nicer Systems",
    meta_description:
      "Workflow automation for staffing agencies. Placement tracking, candidate pipeline dashboards, and automated client updates.",
    featured_industries: ["Staffing", "Recruiting"],
    sections: {
      hero: {
        headline: "Track every placement.\nClose every loop.",
        subheadline:
          "Candidate pipelines, placement tracking, and automated status updates for staffing agencies, recruiters, and temp services.",
        cta_text: "Book a Scoping Call",
        proof_line:
          "Get a preview plan with placement pipeline, recruiter KPIs, and follow-up alerts.",
      },
      demo: {
        eyebrow: "Live Demo",
        title: "Build a preview plan for your placements",
        description:
          "Tell the agent about your placement or candidate pipeline bottleneck. It maps the workflow, identifies where candidates stall, and recommends automation.",
      },
      proof: {
        eyebrow: "Results",
        title: "Staffing case studies",
        description:
          "See how staffing teams replaced spreadsheet reconciliation with real-time placement dashboards.",
        featured_industries: ["Staffing", "Recruiting"],
      },
      final_cta: {
        eyebrow: "Available now",
        title: "Get your pipeline\nunder control",
        description:
          "Start with a scoping call. We map your placement pipeline, define the recruiter metrics, and build the system — so you stop losing candidates in the gaps.",
        cta_text: "Book a Scoping Call",
      },
    },
  },
  {
    slug: "legal",
    industry: "Legal",
    headline: "Every case tracked.\nEvery deadline met.",
    subheadline:
      "Matter tracking, deadline alerts, and intake automation for law firms, legal ops teams, and solo practitioners.",
    cta_text: "Book a Scoping Call",
    meta_title: "Legal Operations Automation — Nicer Systems",
    meta_description:
      "Workflow automation for law firms. Matter tracking, deadline management, client intake automation, and KPI dashboards for legal operations.",
    featured_industries: ["Legal"],
    sections: {
      hero: {
        headline: "Every case tracked.\nEvery deadline met.",
        subheadline:
          "Matter tracking, deadline alerts, and intake automation for law firms, legal ops teams, and solo practitioners.",
        cta_text: "Book a Scoping Call",
        proof_line:
          "Get a preview plan with matter workflow, deadline KPIs, and escalation alerts.",
      },
      demo: {
        eyebrow: "Live Demo",
        title: "Build a preview plan for your practice",
        description:
          "Tell the agent about your case management or intake bottleneck. It maps the matter pipeline and recommends automation for deadlines, follow-ups, and status tracking.",
      },
      proof: {
        eyebrow: "Results",
        title: "Legal case studies",
        description:
          "See how legal teams automated intake workflows and eliminated missed deadlines with alert-based tracking systems.",
        featured_industries: ["Legal"],
      },
      final_cta: {
        eyebrow: "Available now",
        title: "Put your matters\nin focus",
        description:
          "Start with a scoping call. We map your case management workflow, define the deadline rules, and build the system — so nothing slips through.",
        cta_text: "Book a Scoping Call",
      },
    },
  },
  {
    slug: "home-services",
    industry: "Home Services",
    headline: "Dispatch faster.\nFollow up automatically.",
    subheadline:
      "Job scheduling, technician dispatch, and automated customer updates for HVAC, plumbing, electrical, cleaning, and landscaping companies.",
    cta_text: "Book a Scoping Call",
    meta_title: "Home Services Automation — Nicer Systems",
    meta_description:
      "Workflow automation for home service companies. Job dispatch, technician scheduling, customer follow-ups, and KPI dashboards.",
    featured_industries: ["HVAC", "Plumbing", "Electrical", "Cleaning", "Landscaping"],
    sections: {
      hero: {
        headline: "Dispatch faster.\nFollow up automatically.",
        subheadline:
          "Job scheduling, technician dispatch, and automated customer updates for HVAC, plumbing, electrical, cleaning, and landscaping companies.",
        cta_text: "Book a Scoping Call",
        proof_line:
          "Get a preview plan with dispatch workflow, technician KPIs, and customer alert rules.",
      },
      demo: {
        eyebrow: "Live Demo",
        title: "Build a preview plan for your service calls",
        description:
          "Tell the agent about your dispatch or scheduling bottleneck. It maps the service workflow, identifies delays, and recommends automation.",
      },
      proof: {
        eyebrow: "Results",
        title: "Home services case studies",
        description:
          "See how service companies replaced whiteboards and text threads with automated dispatch and real-time job tracking.",
        featured_industries: ["HVAC", "Plumbing", "Electrical", "Cleaning", "Landscaping"],
      },
      final_cta: {
        eyebrow: "Available now",
        title: "Get dispatch\nunder control",
        description:
          "Start with a scoping call. We map your service workflow, set up technician tracking, and automate customer updates — so you stop firefighting.",
        cta_text: "Book a Scoping Call",
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  // 1. Fix healthcare variant sections
  await fixHealthcareSections();

  // 2. Seed new industry variants (skip if slug already exists)
  const now = new Date();
  let seeded = 0;

  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const existing = await db
      .collection("variants")
      .where("slug", "==", v.slug)
      .limit(1)
      .get();

    if (!existing.empty) {
      console.log(`Variant "${v.slug}" already exists — skipping.`);
      continue;
    }

    await db.collection("variants").add({
      ...v,
      is_published: true,
      sort_order: i + 2, // healthcare is sort_order 0 or 1
      created_at: now,
      updated_at: now,
    });
    seeded++;
    console.log(`Seeded variant: ${v.slug} (${v.industry})`);
  }

  console.log(`\nDone. Seeded ${seeded} new variant(s).`);
}

main().catch(console.error);
