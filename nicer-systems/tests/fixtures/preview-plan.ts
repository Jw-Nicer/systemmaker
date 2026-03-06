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
  };
}
