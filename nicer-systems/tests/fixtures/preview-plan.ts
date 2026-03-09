import type { PreviewPlan } from "@/types/preview-plan";

export function createPreviewPlan(): PreviewPlan {
  return {
    intake: {
      clarified_problem: "Manual intake is slow and error-prone.",
      assumptions: ["The team works from shared spreadsheets."],
      constraints: ["No ERP replacement in phase one."],
      suggested_scope: "Automate intake and reporting.",
    },
    workflow: {
      stages: [
        {
          name: "Intake",
          owner_role: "Coordinator",
          entry_criteria: "Request received",
          exit_criteria: "Request validated",
        },
      ],
      required_fields: ["client_name", "request_type"],
      timestamps: ["submitted_at"],
      failure_modes: ["Missing request data"],
    },
    automation: {
      automations: [
        {
          trigger: "New request submitted",
          steps: ["Validate fields", "Create task"],
          data_required: ["client_name"],
          error_handling: "Notify coordinator",
        },
      ],
      alerts: [
        {
          when: "Validation fails",
          who: "Ops lead",
          message: "A request needs review.",
          escalation: "Escalate after 2 hours",
        },
      ],
      logging_plan: [
        {
          what_to_log: "Validation result",
          where: "Ops log",
          how_to_review: "Weekly review",
        },
      ],
    },
    dashboard: {
      dashboards: [
        {
          name: "Ops Overview",
          purpose: "Track throughput",
          widgets: ["Open requests"],
        },
      ],
      kpis: [
        {
          name: "Cycle time",
          definition: "Time from submit to validation",
          why_it_matters: "Shows workflow speed",
        },
      ],
      views: [
        {
          name: "Pending",
          filter: "status = pending",
          columns: ["client_name", "submitted_at"],
        },
      ],
    },
    ops_pulse: {
      executive_summary: {
        problem: "Manual intake is slow and error-prone, causing delays in service delivery.",
        solution: "Automated intake validation and task creation with real-time alerting.",
        impact: "Expected to reduce cycle time by 60% and eliminate missed requests.",
        next_step: "Set up automated validation rules for the top 3 request types.",
      },
      sections: [
        {
          title: "Weekly summary",
          bullets: ["Cycle time is trending down"],
        },
      ],
      scorecard: ["Cycle time"],
      actions: [
        {
          priority: "high",
          owner_role: "Ops lead",
          action: "Review failed validations daily",
        },
      ],
      questions: ["Which requests fail validation most often?"],
    },
    roadmap: {
      phases: [
        {
          week: 1,
          title: "Foundation & Data Setup",
          tasks: [
            {
              task: "Audit current intake spreadsheet — document all fields and flag missing data. Deliverable: cleaned data with 100% of active records validated.",
              effort: "large",
              owner_role: "Operations Coordinator",
            },
            {
              task: "Set up Zapier account and connect to Gmail and Google Sheets for initial automation testing.",
              effort: "small",
              owner_role: "Operations Coordinator",
            },
          ],
          dependencies: ["None — this is the first phase"],
          risks: [
            "Data may be messier than expected — budget an extra day for cleanup if needed",
          ],
          quick_wins: [
            "Auto-confirm receipt of new requests via email within first 2 hours",
          ],
        },
        {
          week: 2,
          title: "Core Workflow Build",
          tasks: [
            {
              task: "Build standardized intake form with all required fields from workflow analysis. Deliverable: form tested with 5 sample submissions.",
              effort: "medium",
              owner_role: "Operations Coordinator",
            },
          ],
          dependencies: ["Week 1 data audit complete"],
          risks: [
            "Staff may resist changing from email to form intake — schedule a 15-minute demo to show benefits",
          ],
          quick_wins: [
            "Create a shared status view so everyone can see pending items without asking",
          ],
        },
        {
          week: 3,
          title: "Go-Live & Monitoring",
          tasks: [
            {
              task: "Deploy dashboards and set up monitoring alerts. Run 1-week parallel with manual backup.",
              effort: "medium",
              owner_role: "Ops lead",
            },
          ],
          dependencies: ["Week 2 form build complete"],
          risks: [
            "Parallel run may surface edge cases — keep manual fallback active for 1 week",
          ],
          quick_wins: [],
        },
      ],
      critical_path: "Data audit → Form build → Automation testing → Go-live with monitoring dashboards active",
      total_estimated_weeks: 3,
    },
  };
}
