import type { PlanSectionType } from "@/types/chat";
import type { PreviewPlan, PlanWarning } from "@/types/preview-plan";

export interface RefinementSuggestion {
  label: string;
  feedback: string;
}

export function getSectionSuggestions(
  plan: PreviewPlan,
  section: PlanSectionType
): RefinementSuggestion[] {
  const suggestions: RefinementSuggestion[] = [];

  switch (section) {
    case "intake": {
      if (plan.intake.assumptions.length < 3) {
        suggestions.push({
          label: "Add more assumptions",
          feedback: "Add more specific assumptions about our team size, tech comfort level, and current pain points.",
        });
      }
      if (plan.intake.constraints.length < 2) {
        suggestions.push({
          label: "Clarify constraints",
          feedback: "Add constraints around budget, timeline, team availability, and any compliance requirements.",
        });
      }
      if (!plan.intake.suggested_scope.toLowerCase().includes("→")) {
        suggestions.push({
          label: "Sharpen the scope",
          feedback: "Make the suggested scope more specific — include the exact start and end points of the workflow.",
        });
      }
      break;
    }

    case "workflow": {
      if (plan.workflow.stages.length > 8) {
        suggestions.push({
          label: "Simplify stages",
          feedback: `This workflow has ${plan.workflow.stages.length} stages. Can any be consolidated? Look for stages that could be merged without losing clarity.`,
        });
      }
      if (plan.workflow.stages.length < 5) {
        suggestions.push({
          label: "Add missing stages",
          feedback: "Are there any steps between these stages that were skipped? Consider handoffs, approvals, or quality checks.",
        });
      }
      const genericRoles = plan.workflow.stages.filter(
        (s) => /^(admin|manager|user|staff|team)$/i.test(s.owner_role.trim())
      );
      if (genericRoles.length > 0) {
        suggestions.push({
          label: "Specify role titles",
          feedback: `Some stages have generic owners like "${genericRoles[0].owner_role}". Use specific job titles (e.g., "Property Manager", "Billing Coordinator").`,
        });
      }
      if (plan.workflow.failure_modes.length < 3) {
        suggestions.push({
          label: "Add failure modes",
          feedback: "What commonly goes wrong? Think about: missed deadlines, incomplete data, approval bottlenecks, and communication gaps.",
        });
      }
      break;
    }

    case "automation": {
      const hasNoAlerts = plan.automation.alerts.length === 0;
      if (hasNoAlerts) {
        suggestions.push({
          label: "Add escalation alerts",
          feedback: "Add alerts for when items are stuck: missed SLAs, unacknowledged assignments, and repeated failures.",
        });
      }
      const hasNoEscalation = plan.automation.alerts.every(
        (a) => a.escalation.length < 20
      );
      if (!hasNoAlerts && hasNoEscalation) {
        suggestions.push({
          label: "Define escalation paths",
          feedback: "Each alert needs a clear escalation path: who gets notified if the first person doesn't act? What's the time limit?",
        });
      }
      if (plan.automation.logging_plan.length < 2) {
        suggestions.push({
          label: "Improve logging",
          feedback: "Add logging for: key decisions made, data changes, errors encountered, and SLA timestamps.",
        });
      }
      suggestions.push({
        label: "Add error recovery",
        feedback: "For each automation, what happens when it partially fails? Define rollback steps and manual fallback procedures.",
      });
      break;
    }

    case "dashboard": {
      const hasTimingKpi = plan.dashboard.kpis.some(
        (k) => /time|duration|hours|days|sla/i.test(k.name + " " + k.definition)
      );
      if (!hasTimingKpi) {
        suggestions.push({
          label: "Add timing metrics",
          feedback: "Add at least one time-based KPI (e.g., average processing time, SLA compliance rate, time-to-first-response).",
        });
      }
      const hasQualityKpi = plan.dashboard.kpis.some(
        (k) => /error|quality|accuracy|rework|fix/i.test(k.name + " " + k.definition)
      );
      if (!hasQualityKpi) {
        suggestions.push({
          label: "Add quality metrics",
          feedback: "Add a quality KPI like first-time fix rate, error rate, or rework percentage to track output quality.",
        });
      }
      if (plan.dashboard.views.length < 2) {
        suggestions.push({
          label: "Add exception views",
          feedback: "Add a view for items needing attention: stuck items, overdue tasks, missing data, or approaching SLA deadlines.",
        });
      }
      if (plan.dashboard.kpis.some((k) => k.definition.length < 50)) {
        suggestions.push({
          label: "Define KPI formulas",
          feedback: "Each KPI needs a precise definition: formula, unit, time window, target value, and data source field.",
        });
      }
      break;
    }

    case "ops_pulse": {
      const highActions = plan.ops_pulse.actions.filter((a) => a.priority === "high");
      if (highActions.length === 0) {
        suggestions.push({
          label: "Prioritize actions",
          feedback: "Mark the most critical first steps as high priority. What must happen this week for the project to succeed?",
        });
      }
      if (highActions.length > 3) {
        suggestions.push({
          label: "Focus priorities",
          feedback: `${highActions.length} items are marked high priority. Narrow it to the top 2-3 most critical. Not everything can be urgent.`,
        });
      }
      if (plan.ops_pulse.questions.length < 2) {
        suggestions.push({
          label: "Surface unknowns",
          feedback: "What decisions still need human input? Think: budget approvals, tool selection, team assignments, and vendor contracts.",
        });
      }
      if (!plan.ops_pulse.executive_summary) {
        suggestions.push({
          label: "Add executive summary",
          feedback: "Add a 4-sentence executive summary: problem statement, proposed solution, expected impact (with numbers), and immediate next step.",
        });
      }
      break;
    }

    case "implementation_sequencer": {
      if (plan.roadmap) {
        if (plan.roadmap.phases.length < 3) {
          suggestions.push({
            label: "Add more phases",
            feedback: "The roadmap seems compressed. Break it into more phases with clearer milestones between them.",
          });
        }
        const hasQuickWins = plan.roadmap.phases.some((p) => p.quick_wins.length > 0);
        if (!hasQuickWins) {
          suggestions.push({
            label: "Add quick wins",
            feedback: "Add early quick wins to each phase — these build momentum and stakeholder confidence.",
          });
        }
        const largeTasks = plan.roadmap.phases.flatMap((p) => p.tasks).filter((t) => t.effort === "large");
        if (largeTasks.length > plan.roadmap.phases.length) {
          suggestions.push({
            label: "Break down large tasks",
            feedback: `There are ${largeTasks.length} large tasks. Can any be split into smaller deliverables? Each task should be completable by one person in one week.`,
          });
        }
      }
      suggestions.push({
        label: "Adjust timeline",
        feedback: "Adjust the timeline based on our team's availability. We have a small team — can we extend phases to be more realistic?",
      });
      break;
    }
  }

  if (suggestions.length < 2) {
    suggestions.push({
      label: "Add industry specifics",
      feedback: "Make this more specific to our industry. What terminology, tools, and workflows are standard in our field?",
    });
  }
  if (suggestions.length < 3) {
    suggestions.push({
      label: "Consider edge cases",
      feedback: "What happens when things go wrong? Add handling for: late arrivals, incomplete data, system outages, and staff unavailability.",
    });
  }

  if (plan.warnings) {
    const sectionWarnings = plan.warnings.filter((w: PlanWarning) => w.section === section);
    for (const warning of sectionWarnings.slice(0, 2)) {
      suggestions.push({
        label: "Fix consistency issue",
        feedback: warning.message,
      });
    }
  }

  return suggestions.slice(0, 4);
}
