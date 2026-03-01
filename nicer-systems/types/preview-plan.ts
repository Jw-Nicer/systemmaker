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

export interface Automation {
  trigger: string;
  steps: string[];
  data_required: string[];
  error_handling: string;
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

export interface OpsPulseOutput {
  sections: { title: string; bullets: string[] }[];
  scorecard: string[];
  actions: { priority: string; owner_role: string; action: string }[];
  questions: string[];
}

export interface PreviewPlan {
  intake: IntakeOutput;
  workflow: WorkflowMapperOutput;
  automation: AutomationDesignerOutput;
  dashboard: DashboardDesignerOutput;
  ops_pulse: OpsPulseOutput;
}
