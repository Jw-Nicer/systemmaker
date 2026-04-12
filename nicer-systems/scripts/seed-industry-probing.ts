/**
 * Seed the `industry_probing` Firestore collection with the 8 hardcoded
 * defaults that previously lived inline in lib/agents/conversation.ts.
 *
 * Idempotent — re-runnable. Existing entries (matched by slug) get
 * updated; new ones get created. Aliases that previously lived in the
 * separate INDUSTRY_ALIASES table are now folded into the canonical
 * entry's `aliases` array.
 *
 * Run: npx tsx scripts/seed-industry-probing.ts
 */
import "dotenv/config";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

interface SeedEntry {
  slug: string;
  display_name: string;
  common_bottlenecks: string[];
  common_tools: string[];
  probing_angles: string[];
  aliases: string[];
  sort_order: number;
}

const SEED_DATA: SeedEntry[] = [
  {
    slug: "construction",
    display_name: "Construction",
    common_bottlenecks: [
      "field crew scheduling and dispatch",
      "job costing and change order tracking",
      "permit and inspection tracking",
      "subcontractor coordination",
      "daily log and progress reporting",
    ],
    common_tools: ["Procore", "Buildertrend", "CoConstruct", "QuickBooks", "spreadsheets", "text/WhatsApp groups"],
    probing_angles: [
      "How do you track jobs from estimate to closeout?",
      "Where does info get lost between field and office?",
      "How do change orders flow through your process?",
    ],
    aliases: [],
    sort_order: 0,
  },
  {
    slug: "healthcare",
    display_name: "Healthcare",
    common_bottlenecks: [
      "patient intake and paperwork",
      "appointment scheduling and no-shows",
      "insurance verification and prior auth",
      "referral tracking",
      "compliance documentation",
    ],
    common_tools: ["Epic", "Athenahealth", "DrChrono", "SimplePractice", "fax machines", "paper forms"],
    probing_angles: [
      "What happens between a patient calling in and being seen?",
      "Where does staff spend the most time on admin?",
      "How do referrals get tracked once they leave your office?",
    ],
    aliases: ["medical", "senior care", "veterinary", "fitness", "childcare"],
    sort_order: 1,
  },
  {
    slug: "property management",
    display_name: "Property Management",
    common_bottlenecks: [
      "tenant communication and requests",
      "maintenance work order tracking",
      "lease renewal management",
      "rent collection follow-up",
      "vendor coordination for repairs",
    ],
    common_tools: ["AppFolio", "Buildium", "Rent Manager", "Yardi", "spreadsheets", "email"],
    probing_angles: [
      "How do maintenance requests flow from tenant to vendor to completion?",
      "What happens when a lease is approaching renewal?",
      "Where do work orders get stuck or lost?",
    ],
    aliases: ["real estate"],
    sort_order: 2,
  },
  {
    slug: "staffing",
    display_name: "Staffing",
    common_bottlenecks: [
      "candidate sourcing and screening",
      "timesheet collection and approval",
      "client job order management",
      "onboarding documentation",
      "payroll reconciliation",
    ],
    common_tools: ["Bullhorn", "JobDiva", "Avionté", "spreadsheets", "email"],
    probing_angles: [
      "What does your process look like from job order to placement?",
      "How do timesheets get collected, approved, and sent to payroll?",
      "Where do candidates fall through the cracks?",
    ],
    aliases: [],
    sort_order: 3,
  },
  {
    slug: "legal",
    display_name: "Legal",
    common_bottlenecks: [
      "client intake and conflict checks",
      "document review and drafting",
      "billing and time tracking",
      "deadline and statute tracking",
      "case file organization",
    ],
    common_tools: ["Clio", "MyCase", "PracticePanther", "NetDocuments", "Outlook", "Excel"],
    probing_angles: [
      "What does new client intake look like end to end?",
      "How do attorneys track deadlines and key dates?",
      "Where does time tracking break down?",
    ],
    aliases: [],
    sort_order: 4,
  },
  {
    slug: "home services",
    display_name: "Home Services",
    common_bottlenecks: [
      "dispatching and routing",
      "estimate-to-invoice workflow",
      "customer follow-up after service",
      "parts and inventory tracking",
      "review and referral collection",
    ],
    common_tools: ["ServiceTitan", "Housecall Pro", "Jobber", "QuickBooks", "paper invoices"],
    probing_angles: [
      "How does a job move from the call to completion?",
      "What happens between finishing a job and getting paid?",
      "How do you handle callbacks or warranty work?",
    ],
    aliases: [
      "plumbing",
      "hvac",
      "electrical",
      "landscaping",
      "roofing",
      "pest control",
      "cleaning",
      "auto repair",
      "salon",
      "spa",
    ],
    sort_order: 5,
  },
  {
    slug: "logistics",
    display_name: "Logistics",
    common_bottlenecks: [
      "dispatch and route optimization",
      "proof of delivery tracking",
      "driver communication",
      "load planning and dock scheduling",
      "invoice reconciliation",
    ],
    common_tools: ["TMS software", "spreadsheets", "WhatsApp groups", "QuickBooks", "EDI systems"],
    probing_angles: [
      "How do loads get assigned to drivers today?",
      "What visibility do you have once a truck leaves the yard?",
      "Where do billing disputes come from?",
    ],
    aliases: ["trucking", "distribution", "wholesale", "moving", "storage"],
    sort_order: 6,
  },
  {
    slug: "dental",
    display_name: "Dental",
    common_bottlenecks: [
      "patient scheduling and recall",
      "insurance verification",
      "treatment plan follow-up",
      "front desk workflow",
      "new patient onboarding",
    ],
    common_tools: ["Dentrix", "Eaglesoft", "Open Dental", "Weave", "paper charts"],
    probing_angles: [
      "What does your new patient flow look like from first call to first appointment?",
      "How do you handle treatment plan acceptance and follow-up?",
      "Where does insurance verification slow things down?",
    ],
    aliases: [],
    sort_order: 7,
  },
];

async function main() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }

  const db = getFirestore();
  const collection = db.collection("industry_probing");

  let created = 0;
  let updated = 0;

  for (const entry of SEED_DATA) {
    // Match by slug — idempotent re-runs
    const existing = await collection.where("slug", "==", entry.slug).limit(1).get();

    if (existing.empty) {
      await collection.add({
        ...entry,
        is_published: true,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });
      created++;
      console.log(`  + created ${entry.slug}`);
    } else {
      await collection.doc(existing.docs[0].id).update({
        ...entry,
        is_published: true,
        updated_at: FieldValue.serverTimestamp(),
      });
      updated++;
      console.log(`  ~ updated ${entry.slug}`);
    }
  }

  console.log(`\nDone. ${created} created, ${updated} updated.`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
