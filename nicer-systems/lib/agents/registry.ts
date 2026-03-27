/**
 * Agent Pipeline DAG — data-driven configuration for the agentic workflow.
 *
 * The pipeline is defined as a Directed Acyclic Graph (DAG). Each stage
 * declares its dependencies, output schema, criticality, and context
 * mapping. The DAG executor in runner.ts walks this registry to
 * orchestrate execution — adding a new stage requires only a registry
 * entry + template.
 *
 * Terminology:
 * - AgentStageKey: unique identifier for a pipeline stage
 * - PipelineStageConfig: full configuration for a stage
 * - PIPELINE_DAG: the registry of all stages
 * - computeExecutionTiers(): derives parallel groups from the DAG
 */
import type { z } from "zod";
import {
  intakeOutputSchema,
  workflowMapperOutputSchema,
  automationDesignerOutputSchema,
  dashboardDesignerOutputSchema,
  opsPulseOutputSchema,
  implementationSequencerOutputSchema,
} from "./schemas";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Unique key for each pipeline stage. */
export type AgentStageKey =
  | "intake"
  | "workflow"
  | "automation"
  | "dashboard"
  | "ops_pulse"
  | "implementation_sequencer";

/** Configuration for a single pipeline stage. */
export interface PipelineStageConfig {
  /** Internal key used in plan objects and SSE events. */
  key: AgentStageKey;
  /** Firestore template document key. */
  templateKey: string;
  /** User-facing label shown while stage is running. */
  label: string;
  /** User-facing label shown when stage completes. */
  completeLabel: string;
  /** Zod schema to validate the AI output (guardrail). */
  outputSchema: z.ZodTypeAny;
  /** Keys of stages that must complete before this one starts. */
  dependencies: AgentStageKey[];
  /**
   * If true, failure of this stage aborts the pipeline.
   * If false, failure produces a fallback output + warning (graceful degradation).
   */
  critical: boolean;
  /** Per-stage timeout in ms. */
  timeoutMs: number;
  /** Max self-correction attempts for this stage. */
  maxCorrections: number;
  /** Routing signals — conditions that modify downstream behavior. */
  routingSignals?: RoutingSignal[];
}

/**
 * Routing signal — emitted by a stage to influence downstream execution.
 * Enables dynamic branching based on stage output content.
 */
export interface RoutingSignal {
  /** Unique signal name. */
  name: string;
  /** Description of what this signal means. */
  description: string;
  /** Predicate: given the stage output, should this signal fire? */
  condition: (output: unknown) => boolean;
}

// ---------------------------------------------------------------------------
// Routing signal definitions
// ---------------------------------------------------------------------------

const COMPLEX_WORKFLOW_SIGNAL: RoutingSignal = {
  name: "complex_workflow",
  description: "Workflow has 8+ stages — downstream stages should use detailed mode",
  condition: (output) => {
    const workflow = output as { stages?: unknown[] };
    return (workflow?.stages?.length ?? 0) >= 8;
  },
};

const HIGH_FAILURE_RISK_SIGNAL: RoutingSignal = {
  name: "high_failure_risk",
  description: "Workflow has 5+ failure modes — ops pulse should emphasize risk mitigation",
  condition: (output) => {
    const workflow = output as { failure_modes?: unknown[] };
    return (workflow?.failure_modes?.length ?? 0) >= 5;
  },
};

// ---------------------------------------------------------------------------
// Pipeline DAG Registry
// ---------------------------------------------------------------------------

export const PIPELINE_DAG: PipelineStageConfig[] = [
  {
    key: "intake",
    templateKey: "intake_agent",
    label: "Analyzing bottleneck...",
    completeLabel: "Bottleneck analysis complete",
    outputSchema: intakeOutputSchema,
    dependencies: [],
    critical: true,
    timeoutMs: 15_000,
    maxCorrections: 2,
  },
  {
    key: "workflow",
    templateKey: "workflow_mapper",
    label: "Mapping workflow stages...",
    completeLabel: "Workflow mapping complete",
    outputSchema: workflowMapperOutputSchema,
    dependencies: ["intake"],
    critical: true,
    timeoutMs: 25_000,
    maxCorrections: 2,
    routingSignals: [COMPLEX_WORKFLOW_SIGNAL, HIGH_FAILURE_RISK_SIGNAL],
  },
  {
    key: "automation",
    templateKey: "automation_designer",
    label: "Designing automations...",
    completeLabel: "Automation design complete",
    outputSchema: automationDesignerOutputSchema,
    dependencies: ["workflow"],
    critical: false,
    timeoutMs: 30_000,
    maxCorrections: 1,
  },
  {
    key: "dashboard",
    templateKey: "dashboard_designer",
    label: "Building dashboard KPIs...",
    completeLabel: "Dashboard KPIs complete",
    outputSchema: dashboardDesignerOutputSchema,
    dependencies: ["workflow"],
    critical: false,
    timeoutMs: 30_000,
    maxCorrections: 1,
  },
  {
    key: "ops_pulse",
    templateKey: "ops_pulse_writer",
    label: "Writing ops pulse...",
    completeLabel: "Ops pulse complete",
    outputSchema: opsPulseOutputSchema,
    dependencies: ["automation", "dashboard"],
    critical: false,
    timeoutMs: 30_000,
    maxCorrections: 2,
  },
  {
    key: "implementation_sequencer",
    templateKey: "implementation_sequencer",
    label: "Building implementation roadmap...",
    completeLabel: "Implementation roadmap complete",
    outputSchema: implementationSequencerOutputSchema,
    dependencies: ["automation", "dashboard"],
    critical: false,
    timeoutMs: 30_000,
    maxCorrections: 1,
  },
];

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

/** Ordered step list for progress display. */
export const PIPELINE_STAGES: { key: AgentStageKey; label: string }[] =
  PIPELINE_DAG.map(({ key, label }) => ({ key, label }));

/** Lookup a stage config by key. */
export function getStageConfig(key: AgentStageKey): PipelineStageConfig | undefined {
  return PIPELINE_DAG.find((s) => s.key === key);
}

/** All stage keys in pipeline order. */
export const STAGE_KEYS: AgentStageKey[] = PIPELINE_DAG.map((s) => s.key);

/** Map of template key → Zod schema (used by runner validation). */
export const stageOutputGuardrails: Partial<Record<string, z.ZodTypeAny>> =
  Object.fromEntries(PIPELINE_DAG.map((s) => [s.templateKey, s.outputSchema]));

/**
 * Compute execution tiers from the DAG.
 * Stages in the same tier can run in parallel.
 * Returns tiers in dependency order.
 */
export function computeExecutionTiers(): PipelineStageConfig[][] {
  const groups: PipelineStageConfig[][] = [];
  const assigned = new Set<AgentStageKey>();

  while (assigned.size < PIPELINE_DAG.length) {
    const ready = PIPELINE_DAG.filter(
      (s) =>
        !assigned.has(s.key) &&
        s.dependencies.every((dep) => assigned.has(dep))
    );
    if (ready.length === 0) break; // prevent infinite loop on bad config
    groups.push(ready);
    for (const s of ready) assigned.add(s.key);
  }

  return groups;
}

/**
 * Check routing signals for a completed stage.
 * Returns the names of fired signals.
 */
export function checkRoutingSignals(
  stageKey: AgentStageKey,
  output: unknown
): string[] {
  const config = getStageConfig(stageKey);
  if (!config?.routingSignals) return [];

  return config.routingSignals
    .filter((signal) => {
      try {
        return signal.condition(output);
      } catch {
        return false;
      }
    })
    .map((signal) => signal.name);
}

// ---------------------------------------------------------------------------
// Backward-compatible re-exports
// ---------------------------------------------------------------------------

/** @deprecated Use AgentStageKey */
export type AgentStep = AgentStageKey;

/** @deprecated Use PIPELINE_STAGES */
export const AGENT_STEPS = PIPELINE_STAGES;

/** @deprecated Use PIPELINE_DAG */
export const STAGE_REGISTRY = PIPELINE_DAG;

/** @deprecated Use computeExecutionTiers */
export const getParallelGroups = computeExecutionTiers;

/** @deprecated Use stageOutputGuardrails */
export const templateOutputSchemasByTemplateKey = stageOutputGuardrails;
