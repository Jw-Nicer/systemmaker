/**
 * Heuristic plan quality scorer (6C).
 *
 * Produces a 0–100 score from a PreviewPlan using three equally weighted
 * dimensions:
 *
 * - **Completeness** (0–33): are sections present and populated?
 * - **Specificity** (0–33): are values detailed (not one-word stubs)?
 * - **Actionability** (0–34): are there concrete actions, a roadmap, alerts?
 *
 * Pure function, runs in <1ms, no LLM call. Suitable for calling on every
 * plan at storage time. The gold-standard LLM-as-judge eval in evals.ts
 * is for offline quality regression testing; this scorer is for real-time
 * admin visibility.
 */
import type {
  PreviewPlan,
  IntakeOutput,
  WorkflowMapperOutput,
  AutomationDesignerOutput,
  DashboardDesignerOutput,
  OpsPulseOutput,
  ImplementationSequencerOutput,
} from "@/types/preview-plan";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Average string length across an array of strings, 0 if empty. */
function avgLen(items: string[]): number {
  if (items.length === 0) return 0;
  return items.reduce((sum, s) => sum + s.length, 0) / items.length;
}

/** Fraction of items in `arr` that satisfy `pred`, 0 for empty arrays. */
function fraction<T>(arr: T[], pred: (item: T) => boolean): number {
  if (arr.length === 0) return 0;
  return arr.filter(pred).length / arr.length;
}

// ---------------------------------------------------------------------------
// Dimension scorers
// ---------------------------------------------------------------------------

function scoreCompleteness(plan: PreviewPlan): number {
  let score = 0;
  const max = 33;

  // 6 required sections (5 pts each = 30 pts), roadmap optional (+3 bonus)
  const sectionChecks: [boolean, number][] = [
    [Boolean(plan.intake?.clarified_problem), 5],
    [(plan.workflow?.stages?.length ?? 0) > 0, 5],
    [(plan.automation?.automations?.length ?? 0) > 0, 5],
    [(plan.dashboard?.kpis?.length ?? 0) > 0, 5],
    [Boolean(plan.ops_pulse?.executive_summary?.solution), 5],
    [(plan.ops_pulse?.actions?.length ?? 0) > 0, 5],
  ];

  for (const [present, pts] of sectionChecks) {
    if (present) score += pts;
  }

  // Bonus for roadmap
  if ((plan.roadmap?.phases?.length ?? 0) > 0) score += 3;

  return Math.min(score, max);
}

function scoreSpecificity(plan: PreviewPlan): number {
  let score = 0;
  const max = 33;

  // Workflow stages: more stages = more specific (cap at 6)
  const stageCount = Math.min(plan.workflow?.stages?.length ?? 0, 6);
  score += (stageCount / 6) * 8;

  // Workflow stages have non-empty entry/exit criteria
  if (plan.workflow?.stages?.length) {
    const detailedStages = fraction(
      plan.workflow.stages,
      (s) => s.entry_criteria.length > 5 && s.exit_criteria.length > 5
    );
    score += detailedStages * 5;
  }

  // Automations with multi-step flows
  if (plan.automation?.automations?.length) {
    const multiStep = fraction(
      plan.automation.automations,
      (a) => (a.steps?.length ?? 0) >= 2
    );
    score += multiStep * 5;
  }

  // KPIs with definitions (not just names)
  if (plan.dashboard?.kpis?.length) {
    const definedKPIs = fraction(
      plan.dashboard.kpis,
      (k) => k.definition.length > 10
    );
    score += definedKPIs * 5;
  }

  // Failure modes listed
  score += Math.min((plan.workflow?.failure_modes?.length ?? 0) / 3, 1) * 5;

  // Executive summary fields are substantive (>20 chars each)
  const es = plan.ops_pulse?.executive_summary;
  if (es) {
    const filled = [es.problem, es.solution, es.impact, es.next_step].filter(
      (f) => f && f.length > 20
    ).length;
    score += (filled / 4) * 5;
  }

  return Math.min(score, max);
}

function scoreActionability(plan: PreviewPlan): number {
  let score = 0;
  const max = 34;

  // High-priority actions present
  const highActions =
    plan.ops_pulse?.actions?.filter((a) => a.priority === "high")?.length ?? 0;
  score += Math.min(highActions / 2, 1) * 8;

  // Total actions with owner_role assigned
  if (plan.ops_pulse?.actions?.length) {
    const owned = fraction(
      plan.ops_pulse.actions,
      (a) => a.owner_role.length > 0
    );
    score += owned * 5;
  }

  // Alerts with escalation paths
  if (plan.automation?.alerts?.length) {
    const withEscalation = fraction(
      plan.automation.alerts,
      (a) => a.escalation.length > 5
    );
    score += withEscalation * 5;
  }

  // Roadmap phases with tasks
  if (plan.roadmap?.phases?.length) {
    const phasesWithTasks = fraction(
      plan.roadmap.phases,
      (p) => (p.tasks?.length ?? 0) > 0
    );
    score += phasesWithTasks * 8;

    // Quick wins in at least one phase
    const hasQuickWins = plan.roadmap.phases.some(
      (p) => (p.quick_wins?.length ?? 0) > 0
    );
    if (hasQuickWins) score += 3;
  }

  // Suggested scope is actionable (>30 chars)
  if ((plan.intake?.suggested_scope?.length ?? 0) > 30) score += 5;

  return Math.min(score, max);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PlanQualityBreakdown {
  completeness: number;
  specificity: number;
  actionability: number;
}

/**
 * Score a PreviewPlan's quality from 0–100.
 *
 * Returns the overall score plus the per-dimension breakdown. Cross-section
 * warnings (from validation.ts) are NOT penalized here — they're already
 * surfaced separately as `plan.warnings`.
 */
export function scorePlanQuality(plan: PreviewPlan): {
  score: number;
  breakdown: PlanQualityBreakdown;
} {
  const completeness = scoreCompleteness(plan);
  const specificity = scoreSpecificity(plan);
  const actionability = scoreActionability(plan);

  return {
    score: Math.round(completeness + specificity + actionability),
    breakdown: { completeness, specificity, actionability },
  };
}
