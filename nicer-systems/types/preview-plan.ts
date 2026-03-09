export interface IntakeOutput {
  clarified_problem: string;
  assumptions: string[];
  constraints: string[];
  suggested_scope: string;
}

export interface WorkflowStage {
  name: string;
  owner_role: string;
  entry_criteria: string;
  exit_criteria: string;
}

export interface WorkflowMapperOutput {
  stages: WorkflowStage[];
  required_fields: string[];
  timestamps: string[];
  failure_modes: string[];
}

export type AutomationPlatform = "zapier" | "make" | "n8n" | "google_apps_script" | "custom";

export interface Automation {
  trigger: string;
  steps: string[];
  data_required: string[];
  error_handling: string;
  platform?: AutomationPlatform;
  setup_instructions?: string;
  estimated_setup_minutes?: number;
}

export interface Alert {
  when: string;
  who: string;
  message: string;
  escalation: string;
}

export interface AutomationDesignerOutput {
  automations: Automation[];
  alerts: Alert[];
  logging_plan: { what_to_log: string; where: string; how_to_review: string }[];
}

export interface KPI {
  name: string;
  definition: string;
  why_it_matters: string;
}

export interface DashboardDesignerOutput {
  dashboards: { name: string; purpose: string; widgets: string[] }[];
  kpis: KPI[];
  views: { name: string; filter: string; columns: string[] }[];
}

export interface ExecutiveSummary {
  problem: string;
  solution: string;
  impact: string;
  next_step: string;
}

export interface OpsPulseOutput {
  executive_summary: ExecutiveSummary;
  sections: { title: string; bullets: string[] }[];
  scorecard: string[];
  actions: { priority: "high" | "medium" | "low"; owner_role: string; action: string }[];
  questions: string[];
}

export interface ImplementationTask {
  task: string;
  effort: "small" | "medium" | "large";
  owner_role: string;
}

export interface ImplementationPhase {
  week: number;
  title: string;
  tasks: ImplementationTask[];
  dependencies: string[];
  risks: string[];
  quick_wins: string[];
}

export interface ImplementationSequencerOutput {
  phases: ImplementationPhase[];
  critical_path: string;
  total_estimated_weeks: number;
}

/** Validation warnings from cross-section consistency checks. */
export interface PlanWarning {
  section: string;
  message: string;
}

export interface PreviewPlan {
  intake: IntakeOutput;
  workflow: WorkflowMapperOutput;
  automation: AutomationDesignerOutput;
  dashboard: DashboardDesignerOutput;
  ops_pulse: OpsPulseOutput;
  /** Implementation roadmap (optional — 6th stage, runs in parallel with ops_pulse). */
  roadmap?: ImplementationSequencerOutput;
  /** Cross-section consistency warnings (populated after validation pass). */
  warnings?: PlanWarning[];
}
