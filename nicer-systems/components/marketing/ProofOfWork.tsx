import { getPublishedCaseStudies, getIndustries } from "@/lib/firestore/case-studies";
import { ProofOfWorkClient } from "./ProofOfWorkClient";

export async function ProofOfWork() {
  let caseStudies = await getPublishedCaseStudies();
  let industries = await getIndustries(caseStudies);

  // Fallback if no published case studies yet
  if (caseStudies.length === 0) {
    caseStudies = [
      {
        id: "placeholder-1",
        title: "Logistics Workflow Overhaul",
        slug: "logistics-workflow",
        client_name: "Sample Client",
        industry: "Logistics",
        tools: ["Zapier", "Airtable"],
        challenge: "Manual dispatch tracking causing 3-hour delays in delivery updates.",
        solution: "",
        metrics: [{ label: "Delay reduction", before: "3 hours", after: "15 min" }],
        thumbnail_url: "",
        is_published: true,
        created_at: "",
        updated_at: "",
        sort_order: 0,
      },
      {
        id: "placeholder-2",
        title: "Finance Reconciliation System",
        slug: "finance-reconciliation",
        client_name: "Sample Client",
        industry: "Finance",
        tools: ["Google Sheets", "Make"],
        challenge: "Weekly reconciliation taking 2 full days of manual work.",
        solution: "",
        metrics: [{ label: "Time saved", before: "2 days", after: "2 hours" }],
        thumbnail_url: "",
        is_published: true,
        created_at: "",
        updated_at: "",
        sort_order: 1,
      },
      {
        id: "placeholder-3",
        title: "Healthcare Intake Automation",
        slug: "healthcare-intake",
        client_name: "Sample Client",
        industry: "Healthcare",
        tools: ["Notion", "Zapier"],
        challenge: "Patient intake forms processed manually, causing backlogs.",
        solution: "",
        metrics: [{ label: "Processing time", before: "45 min", after: "5 min" }],
        thumbnail_url: "",
        is_published: true,
        created_at: "",
        updated_at: "",
        sort_order: 2,
      },
    ];
    industries = ["Finance", "Healthcare", "Logistics"];
  }

  return <ProofOfWorkClient caseStudies={caseStudies} industries={industries} />;
}
