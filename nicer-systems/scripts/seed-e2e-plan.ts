/**
 * Seed a known plan doc in Firestore for use by the computer-use runbooks
 * that need `/plan/{id}` to render real content (runbooks 3, 4, 5).
 *
 * The doc is written with a stable ID so tests are deterministic across
 * runs. Re-running the script overwrites the existing doc.
 *
 * Usage:
 *   npm run seed:e2e-plan
 *
 * Optional env:
 *   E2E_PLAN_ID   Override the default plan ID ("e2e-computer-use-plan").
 *
 * Output: prints the seeded plan ID and URL. Capture the ID and set it
 * as E2E_PLAN_ID when invoking the Playwright runbook suite.
 */
import { config as loadEnv } from "dotenv";
// Prefer .env.local (where Admin SDK creds live per CLAUDE.md), fall back to .env.
loadEnv({ path: ".env.local" });
loadEnv();
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import type { PreviewPlan } from "../types/preview-plan";

const PLAN_ID = process.env.E2E_PLAN_ID || "e2e-computer-use-plan";

const PREVIEW_PLAN: PreviewPlan = {
  intake: {
    clarified_problem:
      "Maintenance requests arrive through phone and email, then staff copy them into a spreadsheet. Vendor assignment is delayed and tenants keep asking for updates.",
    assumptions: [
      "Team of 10–15 coordinators handle ~120 requests/week",
      "Existing stack: AppFolio, Gmail, Google Sheets",
    ],
    constraints: [
      "No engineering resources on staff",
      "Tenants prefer email and SMS over phone",
    ],
    suggested_scope:
      "Build a centralized intake portal with automatic routing to the right vendor and status updates pushed back to tenants.",
  },
  workflow: {
    stages: [
      {
        name: "Request intake",
        owner_role: "Coordinator",
        entry_criteria: "Request received via portal, email, or phone",
        exit_criteria: "Request normalized into the intake system",
      },
      {
        name: "Vendor routing",
        owner_role: "Ops lead",
        entry_criteria: "Normalized request with unit + category",
        exit_criteria: "Vendor assigned and notified",
      },
      {
        name: "Completion + tenant update",
        owner_role: "Vendor",
        entry_criteria: "Work complete with photos",
        exit_criteria: "Tenant notified and request closed",
      },
    ],
    required_fields: ["unit_number", "tenant_name", "category", "priority"],
    timestamps: ["submitted_at", "assigned_at", "completed_at"],
    failure_modes: [
      "Duplicate entries when tenants submit twice",
      "Lost attachments from email forwards",
      "Stale vendor assignments when a vendor stops responding",
    ],
  },
  automation: {
    automations: [
      {
        trigger: "New maintenance request submitted",
        steps: [
          "Normalize request into intake table",
          "Classify category (plumbing/electrical/general)",
          "Route to vendor based on category and availability",
          "Send tenant a confirmation with ETA",
        ],
        data_required: ["unit_number", "category", "vendor_roster"],
        error_handling: "Escalate to coordinator if no vendor responds in 15 minutes",
        platform: "zapier",
        estimated_setup_minutes: 90,
      },
    ],
    alerts: [
      {
        when: "Request aged over 48 hours without vendor response",
        who: "Ops lead",
        message: "Maintenance request {id} needs re-routing",
        escalation: "Page vendor manager after 72 hours",
      },
    ],
    logging_plan: [
      {
        what_to_log: "Every status change on a request",
        where: "intake table + audit sheet",
        how_to_review: "Weekly ops pulse",
      },
    ],
  },
  dashboard: {
    dashboards: [
      {
        name: "Maintenance ops",
        purpose: "Daily standup and aging review",
        widgets: ["Open requests by stage", "Aging requests over 48h", "Vendor response time"],
      },
    ],
    kpis: [
      {
        name: "Request cycle time",
        definition: "Median hours from submit to complete",
        why_it_matters: "Tenant satisfaction tracks this within 10%",
      },
      {
        name: "First-response SLA",
        definition: "Percent of requests with vendor assigned in 1 hour",
        why_it_matters: "Leading indicator for overall cycle time",
      },
    ],
    views: [
      {
        name: "Aging requests",
        filter: "status != complete AND submitted_at > 48h ago",
        columns: ["unit_number", "category", "assigned_vendor", "hours_open"],
      },
    ],
  },
  ops_pulse: {
    executive_summary: {
      problem: "Manual maintenance intake delays vendor assignment and tenant follow-up",
      solution: "Centralized intake + automatic routing + status updates",
      impact: "Cut cycle time by ~40% and eliminate the follow-up backlog",
      next_step: "Pilot the new intake with one property for two weeks",
    },
    sections: [
      {
        title: "Weekly ops review",
        bullets: [
          "Review aging requests over 48 hours",
          "Audit vendor response time",
          "Confirm tenant notifications went out",
        ],
      },
    ],
    scorecard: ["Cycle time under 24h", "First-response SLA above 90%", "No requests aged beyond 72h"],
    actions: [
      {
        priority: "high",
        owner_role: "Ops lead",
        action: "Stand up the intake portal and wire the routing automation",
      },
    ],
    questions: ["Which property pilots first?", "Who approves vendor roster changes?"],
  },
};

async function main() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")!,
      }),
    });
  }

  const db = getFirestore();
  const cleanPlan = JSON.parse(JSON.stringify(PREVIEW_PLAN));

  await db
    .collection("plans")
    .doc(PLAN_ID)
    .set({
      preview_plan: cleanPlan,
      input_summary: {
        industry: "Property Management",
        bottleneck_summary:
          "Manual maintenance intake with delayed vendor assignment and tenant follow-up",
      },
      lead_id: null,
      input_hash: null,
      heuristic_score: 0.85,
      created_at: FieldValue.serverTimestamp(),
      view_count: 0,
      is_public: true,
      version: 1,
      versions: [],
    });

  console.log(`Seeded plan: ${PLAN_ID}`);
  console.log(`URL: /plan/${PLAN_ID}`);
  console.log(`\nNext: set E2E_PLAN_ID=${PLAN_ID} and run npm run test:computer-use`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to seed e2e plan:", err);
  process.exit(1);
});
