/**
 * Agent Stage Registry — data-driven configuration for the agent pipeline.
 *
 * Add new stages by appending to STAGE_REGISTRY. The runner, conversation,
 * and UI layers read from this registry instead of hardcoding stage lists.
 */
import type { z } from "zod";
import {
  intakeOutputSchema,
  workflowMapperOutputSchema,
  automationDesignerOutputSchema,
  dashboardDesignerOutputSchema,
  opsPulseOutputSchema,
} from "./schemas";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Unique key for each pipeline stage. */
export type AgentStep =
  | "intake"
  | "workflow"
  | "automation"
  | "dashboard"
  | "ops_pulse";

/** Configuration for a single pipeline stage. */
export interface AgentStageConfig {
  /** Internal key used in plan objects and SSE events. */
  key: AgentStep;
  /** Firestore template document key. */
  templateKey: string;
  /** User-facing label shown while stage is running. */
  label: string;
  /** User-facing label shown when stage completes. */
  completeLabel: string;
  /** Zod schema to validate the AI output. */
  outputSchema: z.ZodTypeAny;
  /** Keys of stages that must complete before this one starts. */
  dependencies: AgentStep[];
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const STAGE_REGISTRY: AgentStageConfig[] = [
  {
    key: "intake",
    templateKey: "intake_agent",
    label: "Analyzing bottleneck...",
    completeLabel: "Bottleneck analysis complete",
    outputSchema: intakeOutputSchema,
    dependencies: [],
  },
  {
    key: "workflow",
    templateKey: "workflow_mapper",
    label: "Mapping workflow stages...",
    completeLabel: "Workflow mapping complete",
    outputSchema: workflowMapperOutputSchema,
    dependencies: ["intake"],
  },
  {
    key: "automation",
    templateKey: "automation_designer",
    label: "Designing automations...",
    completeLabel: "Automation design complete",
    outputSchema: automationDesignerOutputSchema,
    dependencies: ["workflow"],
  },
  {
    key: "dashboard",
    templateKey: "dashboard_designer",
    label: "Building dashboard KPIs...",
    completeLabel: "Dashboard KPIs complete",
    outputSchema: dashboardDesignerOutputSchema,
    dependencies: ["workflow"],
  },
  {
    key: "ops_pulse",
    templateKey: "ops_pulse_writer",
    label: "Writing ops pulse...",
    completeLabel: "Ops pulse complete",
    outputSchema: opsPulseOutputSchema,
    dependencies: ["automation", "dashboard"],
  },
];

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

/** Ordered step list for progress display (backward-compatible with AGENT_STEPS). */
export const AGENT_STEPS: { key: AgentStep; label: string }[] =
  STAGE_REGISTRY.map(({ key, label }) => ({ key, label }));

/** Lookup a stage config by key. */
export function getStageConfig(key: AgentStep): AgentStageConfig | undefined {
  return STAGE_REGISTRY.find((s) => s.key === key);
}

/** All stage keys in pipeline order. */
export const STAGE_KEYS: AgentStep[] = STAGE_REGISTRY.map((s) => s.key);

/** Map of template key → Zod schema (used by runner validation). */
export const templateOutputSchemasByTemplateKey: Partial<Record<string, z.ZodTypeAny>> =
  Object.fromEntries(STAGE_REGISTRY.map((s) => [s.templateKey, s.outputSchema]));

/** Stages that can run in parallel (share the same set of dependencies). */
export function getParallelGroups(): AgentStageConfig[][] {
  const groups: AgentStageConfig[][] = [];
  const assigned = new Set<AgentStep>();

  while (assigned.size < STAGE_REGISTRY.length) {
    const ready = STAGE_REGISTRY.filter(
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
