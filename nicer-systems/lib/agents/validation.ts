/**
 * Cross-Section Guardrails — coherence validation for agent pipeline outputs.
 *
 * After all pipeline stages complete, this module checks consistency
 * across sections (the "coherence guardrail" layer):
 * - Automation triggers should reference workflow stages
 * - Dashboard KPIs should reference data fields from workflow
 * - Ops pulse actions should relate to identified failure modes
 *
 * Returns an array of warnings (not errors — plan is still valid, just flagged).
 */

import type { PreviewPlan, PlanWarning } from "@/types/preview-plan";

/**
 * Normalize a string for fuzzy matching: lowercase, strip punctuation, collapse whitespace.
 */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Check if `text` references any of the `terms` (fuzzy substring match).
 */
function referencesAny(text: string, terms: string[]): boolean {
  const norm = normalize(text);
  return terms.some((term) => norm.includes(normalize(term)));
}

/**
 * Validate that automation triggers reference workflow stages.
 */
function validateAutomationRefsWorkflow(plan: PreviewPlan): PlanWarning[] {
  const warnings: PlanWarning[] = [];
  const stageNames = plan.workflow.stages.map((s) => s.name);

  for (const auto of plan.automation.automations) {
    const triggerRefsStage = referencesAny(auto.trigger, stageNames);
    const stepsRefStage = auto.steps.some((step) => referencesAny(step, stageNames));
    if (!triggerRefsStage && !stepsRefStage) {
      warnings.push({
        section: "automation",
        message: `Automation trigger "${auto.trigger.slice(0, 80)}" doesn't reference any defined workflow stage. Consider linking it to a specific stage for clarity.`,
      });
    }
  }

  // Check that automations use required_fields from workflow
  const requiredFields = plan.workflow.required_fields;
  for (const auto of plan.automation.automations) {
    const unreferencedData = auto.data_required.filter(
      (field) => !referencesAny(field, requiredFields)
    );
    if (unreferencedData.length > 0 && unreferencedData.length === auto.data_required.length) {
      warnings.push({
        section: "automation",
        message: `Automation "${auto.trigger.slice(0, 60)}" uses data fields not defined in the workflow. Ensure these fields are captured: ${unreferencedData.slice(0, 3).join(", ")}.`,
      });
    }
  }

  return warnings;
}

/**
 * Validate that dashboard KPIs reference workflow data sources.
 */
function validateDashboardRefsWorkflow(plan: PreviewPlan): PlanWarning[] {
  const warnings: PlanWarning[] = [];
  const allWorkflowTerms = [
    ...plan.workflow.stages.map((s) => s.name),
    ...plan.workflow.required_fields,
    ...plan.workflow.timestamps,
  ];

  for (const kpi of plan.dashboard.kpis) {
    if (!referencesAny(kpi.definition, allWorkflowTerms)) {
      warnings.push({
        section: "dashboard",
        message: `KPI "${kpi.name}" definition doesn't reference any workflow fields or timestamps. Consider specifying the data source.`,
      });
    }
  }

  // Check views use columns that exist as required_fields
  const requiredFields = plan.workflow.required_fields;
  for (const view of plan.dashboard.views) {
    const unmatchedCols = view.columns.filter(
      (col) => !referencesAny(col, requiredFields)
    );
    if (unmatchedCols.length > view.columns.length / 2) {
      warnings.push({
        section: "dashboard",
        message: `View "${view.name}" uses columns not tracked in the workflow: ${unmatchedCols.slice(0, 3).join(", ")}. These may need to be added as required fields.`,
      });
    }
  }

  return warnings;
}

/**
 * Validate that ops pulse actions address identified failure modes.
 */
function validateOpsPulseCoherence(plan: PreviewPlan): PlanWarning[] {
  const warnings: PlanWarning[] = [];
  const failureModes = plan.workflow.failure_modes;

  // Check that at least some actions address failure modes
  if (failureModes.length > 0) {
    const actionsText = plan.ops_pulse.actions.map((a) => a.action).join(" ");
    const addressedFailures = failureModes.filter((fm) =>
      referencesAny(actionsText, [fm])
    );
    if (addressedFailures.length === 0 && failureModes.length >= 3) {
      warnings.push({
        section: "ops_pulse",
        message: `None of the action items directly address the ${failureModes.length} identified failure modes. Consider adding mitigation actions for the top risks.`,
      });
    }
  }

  // Check scorecard references KPI names
  const kpiNames = plan.dashboard.kpis.map((k) => k.name);
  const scorecardText = plan.ops_pulse.scorecard.join(" ");
  const referencedKpis = kpiNames.filter((name) =>
    referencesAny(scorecardText, [name])
  );
  if (kpiNames.length > 0 && referencedKpis.length < Math.min(2, kpiNames.length)) {
    warnings.push({
      section: "ops_pulse",
      message: `Scorecard only references ${referencedKpis.length} of ${kpiNames.length} defined KPIs. Consider including the key metrics for a complete weekly snapshot.`,
    });
  }

  return warnings;
}

/**
 * Check that the plan has reasonable coverage (no suspiciously thin sections).
 */
function validateCoverage(plan: PreviewPlan): PlanWarning[] {
  const warnings: PlanWarning[] = [];

  if (plan.workflow.stages.length < 4) {
    warnings.push({
      section: "workflow",
      message: `Only ${plan.workflow.stages.length} workflow stages defined. Most operational workflows have 5-8 stages. Consider whether steps are missing.`,
    });
  }

  if (plan.automation.alerts.length === 0) {
    warnings.push({
      section: "automation",
      message: "No alerts defined. Consider adding escalation alerts for stuck items or SLA breaches.",
    });
  }

  if (plan.dashboard.kpis.length < 3) {
    warnings.push({
      section: "dashboard",
      message: `Only ${plan.dashboard.kpis.length} KPIs defined. A useful dashboard typically has 4-6 KPIs covering throughput, quality, and timeliness.`,
    });
  }

  const highPriorityActions = plan.ops_pulse.actions.filter((a) => a.priority === "high");
  if (highPriorityActions.length === 0) {
    warnings.push({
      section: "ops_pulse",
      message: "No high-priority actions defined. Consider marking the most critical first steps as high priority.",
    });
  }

  return warnings;
}

/**
 * Run all cross-section guardrails and return warnings.
 * These are informational — the plan is still usable even with warnings.
 *
 * This is the "coherence guardrail" layer — it checks that sections
 * reference each other consistently after the pipeline completes.
 */
export function runCrossSectionGuardrails(plan: PreviewPlan): PlanWarning[] {
  return [
    ...validateAutomationRefsWorkflow(plan),
    ...validateDashboardRefsWorkflow(plan),
    ...validateOpsPulseCoherence(plan),
    ...validateCoverage(plan),
  ];
}

/** @deprecated Use runCrossSectionGuardrails */
export const validatePlanConsistency = runCrossSectionGuardrails;
