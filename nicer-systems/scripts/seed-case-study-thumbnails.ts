/**
 * Updates existing case study docs with Unsplash thumbnail URLs.
 * Usage: npx tsx scripts/seed-case-study-thumbnails.ts
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

const thumbnails: Record<string, string> = {
  "automated-invoice-processing-plumbing":
    "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=1200&h=400&fit=crop",
  "client-onboarding-law-firm":
    "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&h=400&fit=crop",
  "appointment-reminders-dental-practice":
    "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=1200&h=400&fit=crop",
  "lead-tracking-dashboard-roofing":
    "https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=1200&h=400&fit=crop",
  "time-off-request-workflow-staffing":
    "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=400&fit=crop",
  "vendor-payment-reconciliation-property-management":
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&h=400&fit=crop",
  "inventory-reorder-alerts-auto-parts":
    "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&h=400&fit=crop",
  "customer-feedback-routing-hvac":
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&h=400&fit=crop",
};

async function updateThumbnails() {
  const collection = db.collection("case_studies");

  for (const [slug, url] of Object.entries(thumbnails)) {
    const snapshot = await collection.where("slug", "==", slug).limit(1).get();

    if (snapshot.empty) {
      console.log(`No doc found for slug "${slug}" — skipping.`);
      continue;
    }

    const doc = snapshot.docs[0];
    await doc.ref.update({
      thumbnail_url: url,
      updated_at: new Date().toISOString(),
    });
    console.log(`Updated thumbnail for "${slug}"`);
  }

  console.log("\nThumbnail update complete.");
}

updateThumbnails().catch(console.error);
