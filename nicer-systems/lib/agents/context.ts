/**
 * Agent Context Protocol — typed data flow between pipeline stages.
 *
 * Each stage declares exactly which fields from which prior stages it needs.
 * This replaces the ad-hoc Record<string, unknown> context passing with a
 * self-documenting, type-safe protocol.
 *
 * Adding a new stage requires:
 * 1. Add its config to STAGE_REGISTRY in registry.ts
 * 2. Add its context mapping here in CONTEXT_MAPPINGS
 * 3. Add its template in agents/*.md
 */

import type {
  IntakeOutput,
  WorkflowMapperOutput,
  AutomationDesignerOutput,
  DashboardDesignerOutput,
  OpsPulseOutput,
  ImplementationSequencerOutput,
} from "@/types/preview-plan";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The raw input provided by the visitor (from chat or form). */
export interface AgentPipelineInput {
  industry: string;
  bottleneck: string;
  current_tools: string;
  urgency?: string;
  volume?: string;
}

/**
 * Context mapping function for a stage.
 * Given the pipeline input and all prior stage results,
 * returns the context object to inject into the stage's prompt.
 */
export type ContextMappingFn = (
  input: AgentPipelineInput,
  results: Map<string, unknown>
) => Record<string, unknown>;

/**
 * Full execution context available to a stage at runtime.
 * Includes trace metadata, attempt tracking, and assembled context.
 */
export interface StageExecutionContext {
  traceId: string;
  stageKey: string;
  input: AgentPipelineInput;
  assembledContext: Record<string, unknown>;
  attemptNumber: number;
  priorCorrectionErrors?: string[];
}

// ---------------------------------------------------------------------------
// Context Mappings — declares data dependencies per stage
// ---------------------------------------------------------------------------

/**
 * Each entry maps a stage key to a function that assembles its context
 * from the pipeline input and prior stage results.
 *
 * This is the formal "context protocol" — it makes the data flow between
 * agents explicit and self-documenting.
 */
export const CONTEXT_MAPPINGS: Record<string, ContextMappingFn> = {
  intake_agent: (input) => ({
    industry: input.industry,
    bottleneck: input.bottleneck,
    current_tools: input.current_tools,
    urgency: input.urgency ?? "not specified",
    volume: input.volume ?? "not specified",
  }),

  workflow_mapper: (input, results) => {
    const intake = results.get("intake") as IntakeOutput | undefined;
    return {
      clarified_problem: intake?.clarified_problem ?? input.bottleneck,
      industry: input.industry,
      current_tools: input.current_tools,
      assumptions: intake?.assumptions ?? [],
      suggested_scope: intake?.suggested_scope ?? "",
    };
  },

  automation_designer: (input, results) => {
    const workflow = results.get("workflow") as WorkflowMapperOutput | undefined;
    return {
      stages: workflow?.stages ?? [],
      required_fields: workflow?.required_fields ?? [],
      current_tools: input.current_tools,
      failure_modes: workflow?.failure_modes ?? [],
    };
  },

  dashboard_designer: (input, results) => {
    const workflow = results.get("workflow") as WorkflowMapperOutput | undefined;
    return {
      stages: workflow?.stages ?? [],
      timestamps: workflow?.timestamps ?? [],
      industry: input.industry,
      required_fields: workflow?.required_fields ?? [],
    };
  },

  ops_pulse_writer: (_input, results) => {
    const dashboard = results.get("dashboard") as DashboardDesignerOutput | undefined;
    const workflow = results.get("workflow") as WorkflowMapperOutput | undefined;
    return {
      kpis: dashboard?.kpis ?? [],
      dashboards: dashboard?.dashboards ?? [],
      failure_modes: workflow?.failure_modes ?? [],
    };
  },

  implementation_sequencer: (input, results) => {
    const intake = results.get("intake") as IntakeOutput | undefined;
    const workflow = results.get("workflow") as WorkflowMapperOutput | undefined;
    const automation = results.get("automation") as AutomationDesignerOutput | undefined;
    const dashboard = results.get("dashboard") as DashboardDesignerOutput | undefined;
    return {
      clarified_problem: intake?.clarified_problem ?? input.bottleneck,
      assumptions: intake?.assumptions ?? [],
      constraints: intake?.constraints ?? [],
      suggested_scope: intake?.suggested_scope ?? "",
      stages: workflow?.stages ?? [],
      automations: automation?.automations ?? [],
      alerts: automation?.alerts ?? [],
      dashboards: dashboard?.dashboards ?? [],
      kpis: dashboard?.kpis ?? [],
    };
  },

  proposal_writer: (input, results) => {
    const intake = results.get("intake") as IntakeOutput | undefined;
    const workflow = results.get("workflow") as WorkflowMapperOutput | undefined;
    const automation = results.get("automation") as AutomationDesignerOutput | undefined;
    const dashboard = results.get("dashboard") as DashboardDesignerOutput | undefined;
    const ops = results.get("ops_pulse") as OpsPulseOutput | undefined;
    const roadmap = results.get("implementation_sequencer") as ImplementationSequencerOutput | undefined;
    return {
      industry: input.industry,
      clarified_problem: intake?.clarified_problem ?? input.bottleneck,
      suggested_scope: intake?.suggested_scope ?? "",
      workflow_stage_count: workflow?.stages?.length ?? 0,
      automation_count: automation?.automations?.length ?? 0,
      alert_count: automation?.alerts?.length ?? 0,
      kpi_count: dashboard?.kpis?.length ?? 0,
      executive_summary: ops?.executive_summary ?? { problem: "", solution: "", impact: "", next_step: "" },
      actions: ops?.actions ?? [],
      total_estimated_weeks: roadmap?.total_estimated_weeks ?? 0,
      phases: roadmap?.phases ?? [],
    };
  },
};

// ---------------------------------------------------------------------------
// Context assembly
// ---------------------------------------------------------------------------

/**
 * Assemble the context for a stage using its declared context mapping.
 * Falls back to an empty context if no mapping is found.
 */
export function assembleStageContext(
  templateKey: string,
  input: AgentPipelineInput,
  results: Map<string, unknown>
): Record<string, unknown> {
  const mapping = CONTEXT_MAPPINGS[templateKey];
  if (!mapping) {
    console.warn(`[context] No context mapping for stage "${templateKey}", using empty context`);
    return {};
  }
  return mapping(input, results);
}

/**
 * Validate that all required dependencies for a stage have results.
 * Returns the list of missing dependency keys.
 */
export function validateDependencies(
  dependencies: string[],
  results: Map<string, unknown>,
  requireAll = false
): string[] {
  return dependencies.filter((dep) => {
    const result = results.get(dep);
    if (requireAll) return result === undefined || result === null;
    return result === undefined;
  });
}

// ---------------------------------------------------------------------------
// Fallback outputs — used when non-critical stages fail
// ---------------------------------------------------------------------------

/**
 * Get a type-safe empty/fallback output for a failed non-critical stage.
 * These are the same shapes as the Zod schemas expect, ensuring downstream
 * stages can still read the (empty) data without type errors.
 */
export const FALLBACK_OUTPUTS: Record<string, unknown> = {
  automation: {
    automations: [],
    alerts: [],
    logging_plan: [],
  },
  dashboard: {
    dashboards: [],
    kpis: [],
    views: [],
  },
  ops_pulse: {
    executive_summary: { problem: "", solution: "", impact: "", next_step: "" },
    sections: [],
    scorecard: [],
    actions: [],
    questions: [],
  },
  implementation_sequencer: undefined, // Optional stage — maps to plan.roadmap
  proposal_writer: undefined, // Optional stage — maps to plan.proposal
};

/**
 * Get the fallback output for a stage, or undefined if not defined.
 */
export function getFallbackOutput(stageKey: string): unknown {
  return FALLBACK_OUTPUTS[stageKey];
}
