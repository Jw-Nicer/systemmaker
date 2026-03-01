/**
 * Seed script — run once to populate default site_settings.
 * Usage: npx tsx scripts/seed-firestore.ts
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

async function seed() {
  // Default site settings
  const settingsRef = db.collection("site_settings").doc("default");
  const existing = await settingsRef.get();

  if (existing.exists) {
    console.log("site_settings/default already exists — skipping.");
  } else {
    await settingsRef.set({
      theme_primary: "#00d4ff",
      theme_secondary: "#7c3aed",
      gradient_preset: "dark-navy",
      glow_intensity: 60,
      motion_intensity: 2,
      brush_style: "soft",
      cta_primary_url: "#contact",
      cta_secondary_url: "#contact",
      updated_at: new Date(),
    });
    console.log("Created site_settings/default.");
  }

  console.log("Seed complete.");
}

seed().catch(console.error);
