import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const TEMPLATES = [
  { key: "intake_agent", name: "Intake Agent", file: "intake_agent.md" },
  { key: "workflow_mapper", name: "Workflow Mapper", file: "workflow_mapper.md" },
  { key: "automation_designer", name: "Automation Designer", file: "automation_designer.md" },
  { key: "dashboard_designer", name: "Dashboard Designer", file: "dashboard_designer.md" },
  { key: "ops_pulse_writer", name: "Ops Pulse Writer", file: "ops_pulse_writer.md" },
];

async function main() {
  const app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });

  const db = getFirestore(app);
  const agentsDir = join(__dirname, "..", "agents");

  for (const template of TEMPLATES) {
    const markdown = readFileSync(join(agentsDir, template.file), "utf-8");

    // Check if template already exists by key
    const existing = await db
      .collection("agent_templates")
      .where("key", "==", template.key)
      .limit(1)
      .get();

    if (!existing.empty) {
      // Update existing
      await db.collection("agent_templates").doc(existing.docs[0].id).update({
        markdown,
        name: template.name,
        updated_at: new Date().toISOString(),
      });
      console.log(`Updated: ${template.key}`);
    } else {
      // Create new
      await db.collection("agent_templates").add({
        key: template.key,
        name: template.name,
        markdown,
        updated_at: new Date().toISOString(),
      });
      console.log(`Created: ${template.key}`);
    }
  }

  console.log("Done seeding agent templates.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
