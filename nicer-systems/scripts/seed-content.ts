/**
 * Seed script — populate FAQs, Testimonials, Offers, and fix variant content.
 * Usage: npx tsx scripts/seed-content.ts
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

// ---------------------------------------------------------------------------
// FAQs
// ---------------------------------------------------------------------------
const faqs = [
  {
    question: "What industries do you work with?",
    answer:
      "We specialize in admin-heavy American businesses — construction, healthcare, property management, legal, staffing, wholesale distribution, and home services. If your team spends hours on manual follow-ups, status tracking, or data entry, we can help.",
    sort_order: 1,
    is_published: true,
  },
  {
    question: "How long does a typical project take?",
    answer:
      "Most engagements run 2–6 weeks from scoping call to live system. A simple workflow automation can be live in under two weeks. Larger projects with multiple integrations and dashboards typically take 4–6 weeks.",
    sort_order: 2,
    is_published: true,
  },
  {
    question: "What does a Preview Plan include?",
    answer:
      "Your Preview Plan maps the full workflow end-to-end, defines the KPIs that matter, outlines alert rules and owners, and recommends the first automation pass — all specific to your industry, tools, and bottleneck. It's free and yours to keep.",
    sort_order: 3,
    is_published: true,
  },
  {
    question: "Do you replace our existing tools?",
    answer:
      "No. We build on top of what you already use — Google Sheets, QuickBooks, Slack, Airtable, CRMs, whatever your stack looks like. The goal is to connect and automate, not rip and replace.",
    sort_order: 4,
    is_published: true,
  },
  {
    question: "How does pricing work?",
    answer:
      "Every engagement is scoped to your workflows, tools, and team size. We offer three tiers: a one-time Workflow Audit, a full Build & Launch package, and ongoing Managed Ops. Pricing starts at $2,500 and is always confirmed before work begins.",
    sort_order: 5,
    is_published: true,
  },
  {
    question: "What happens after the Preview Plan?",
    answer:
      "You book a 45-minute scoping call where we walk through the plan together, refine any section, and align on deliverables. If it's a fit, we start building. If not, the plan is still yours — no obligations.",
    sort_order: 6,
    is_published: true,
  },
  {
    question: "Can I share the Preview Plan with my team?",
    answer:
      "Absolutely. Every Preview Plan gets a shareable link you can send to partners, managers, or anyone who needs to see it. You can also request it via email for easy forwarding.",
    sort_order: 7,
    is_published: true,
  },
];

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------
const testimonials = [
  {
    name: "Marcus Rivera",
    role: "Operations Director",
    company: "Apex Construction Group",
    quote:
      "We went from chasing subcontractors via text to having a real-time dispatch board with automated alerts. The preview plan alone showed us three bottlenecks we didn't even know we had.",
    avatar_url: "",
    is_published: true,
  },
  {
    name: "Sarah Chen",
    role: "Practice Manager",
    company: "Lakeside Dental Partners",
    quote:
      "Patient intake used to take 15 minutes of manual data entry per appointment. Nicer Systems automated the entire flow — now it's under two minutes and error-free.",
    avatar_url: "",
    is_published: true,
  },
  {
    name: "David Okonkwo",
    role: "Founder & GM",
    company: "TrueNorth Staffing",
    quote:
      "I was spending my Mondays reconciling three spreadsheets. Now I open one dashboard and see exactly where every placement stands. The weekly review takes 10 minutes instead of two hours.",
    avatar_url: "",
    is_published: true,
  },
  {
    name: "Lisa Thornton",
    role: "COO",
    company: "Summit Property Management",
    quote:
      "The workflow map they built showed our maintenance request pipeline had six handoff points with zero visibility. We cut that to three with automated owner assignment. Tenant satisfaction went up 40%.",
    avatar_url: "",
    is_published: true,
  },
];

// ---------------------------------------------------------------------------
// Offers (Pricing Tiers)
// ---------------------------------------------------------------------------
const offers = [
  {
    name: "Discovery Call",
    price: "Free",
    description:
      "A 30-minute call to talk through your top bottleneck and whether a Workflow Audit is the right next step. No prep required.",
    features: [
      "30-minute call with John",
      "Walk through your most painful workflow",
      "Honest take on whether we can help",
      "No deliverable, no obligation",
      "Booked in under 60 seconds",
    ],
    cta: "Book a Discovery Call",
    cta_action: "booking",
    highlighted: false,
    is_published: true,
    sort_order: 0,
  },
  {
    name: "Workflow Audit",
    price: "$2,500",
    description:
      "A deep-dive into one core workflow. You get a full map, KPI set, and automation recommendations.",
    features: [
      "End-to-end workflow map",
      "KPI dashboard design",
      "Alert rules and owners",
      "Tool integration plan",
      "Delivered in 5 business days",
    ],
    cta: "Request an Audit",
    highlighted: false,
    is_published: true,
    sort_order: 1,
  },
  {
    name: "Build & Launch",
    price: "$7,500",
    description:
      "We build the system end-to-end — dashboards, automations, alerts, and integrations — and launch it with your team.",
    features: [
      "Everything in Workflow Audit",
      "Live dashboard build",
      "Automation implementation",
      "Team onboarding session",
      "2 weeks of post-launch support",
      "Delivered in 3–4 weeks",
    ],
    cta: "Get Started",
    highlighted: true,
    is_published: true,
    sort_order: 2,
  },
  {
    name: "Managed Ops",
    price: "$3,500/mo",
    description:
      "Ongoing optimization, monitoring, and new automation builds as your operations evolve.",
    features: [
      "Everything in Build & Launch",
      "Monthly workflow reviews",
      "New automation requests",
      "Priority support",
      "Quarterly strategy call",
    ],
    cta: "Book a Call",
    highlighted: false,
    is_published: true,
    sort_order: 3,
  },
];

// ---------------------------------------------------------------------------
// Healthcare variant fix
// ---------------------------------------------------------------------------
async function fixHealthcareVariant() {
  const snap = await db
    .collection("variants")
    .where("slug", "==", "healthcare")
    .limit(1)
    .get();

  if (snap.empty) {
    console.log("No healthcare variant found — skipping fix.");
    return;
  }

  const doc = snap.docs[0];
  const data = doc.data();

  const updates: Record<string, string> = {};

  if (data.headline && data.headline.includes("Automate you healthcare")) {
    updates.headline = data.headline.replace(
      "Automate you healthcare",
      "Automate your healthcare operations"
    );
  }

  if (data.subheadline && data.subheadline.toLowerCase().includes("go go go")) {
    updates.subheadline =
      "Reduce manual intake, streamline patient workflows, and give your team real-time visibility into every step of care coordination.";
  }

  if (Object.keys(updates).length > 0) {
    await doc.ref.update(updates);
    console.log(`Fixed healthcare variant: ${Object.keys(updates).join(", ")}`);
  } else {
    console.log("Healthcare variant looks correct — no changes needed.");
  }
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------
async function seed() {
  const now = new Date();

  // Seed FAQs
  const faqSnap = await db
    .collection("faqs")
    .where("is_published", "==", true)
    .limit(1)
    .get();

  if (!faqSnap.empty) {
    console.log(`FAQs already exist (${faqSnap.size}+ published) — skipping.`);
  } else {
    const batch = db.batch();
    for (const faq of faqs) {
      const ref = db.collection("faqs").doc();
      batch.set(ref, { ...faq, created_at: now, updated_at: now });
    }
    await batch.commit();
    console.log(`Seeded ${faqs.length} FAQs.`);
  }

  // Seed Testimonials
  const testSnap = await db
    .collection("testimonials")
    .where("is_published", "==", true)
    .limit(1)
    .get();

  if (!testSnap.empty) {
    console.log(
      `Testimonials already exist (${testSnap.size}+ published) — skipping.`
    );
  } else {
    const batch = db.batch();
    for (const t of testimonials) {
      const ref = db.collection("testimonials").doc();
      batch.set(ref, { ...t, created_at: now, updated_at: now });
    }
    await batch.commit();
    console.log(`Seeded ${testimonials.length} testimonials.`);
  }

  // Seed Offers
  const offerSnap = await db
    .collection("offers")
    .where("is_published", "==", true)
    .limit(1)
    .get();

  if (!offerSnap.empty) {
    console.log(
      `Offers already exist (${offerSnap.size}+ published) — skipping.`
    );
  } else {
    const batch = db.batch();
    for (const o of offers) {
      const ref = db.collection("offers").doc();
      batch.set(ref, { ...o, created_at: now, updated_at: now });
    }
    await batch.commit();
    console.log(`Seeded ${offers.length} pricing offers.`);
  }

  // Fix healthcare variant
  await fixHealthcareVariant();

  console.log("\nSeed complete.");
}

seed().catch(console.error);
