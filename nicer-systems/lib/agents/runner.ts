/**
 * Agent Pipeline Orchestrator — DAG-driven execution engine.
 *
 * Walks the PIPELINE_DAG to execute stages in dependency order.
 * Stages in the same tier run in parallel. The orchestrator handles:
 *
 * - Template loading (Firestore + local fallback)
 * - Context assembly (typed protocol from context.ts)
 * - Self-correction loops (ReAct pattern from self-correction.ts)
 * - Tool use / RAG (grounded generation from tools.ts)
 * - Tracing (observability from tracing.ts)
 * - Graceful degradation (non-critical stages produce fallbacks)
 * - Routing signals (dynamic behavior from stage output)
 *
 * Adding a new stage requires:
 * 1. Add config to PIPELINE_DAG in registry.ts
 * 2. Add context mapping in context.ts
 * 3. Add template in agents/*.md
 * 4. Add schema in schemas.ts
 * — No changes to this file needed.
 */
import { getAdminDb } from "@/lib/firebase/admin";
import { assembleAgentContext } from "./prompts";
import { enforceOutputSafety } from "./safety";
import { stageOutputGuardrails } from "./schemas";
import { runCrossSectionGuardrails } from "./validation";
import {
  type AgentStageKey,
  type PipelineStageConfig,
  PIPELINE_DAG,
  computeExecutionTiers,
  checkRoutingSignals,
  PIPELINE_STAGES,
} from "./registry";
import { assembleStageContext, getFallbackOutput } from "./context";
import type { AgentPipelineInput } from "./context";
import { executeStageWithCorrection } from "./self-correction";
import { getToolContextForStage } from "./tools";
import {
  createTrace,
  startSpan,
  endSpan,
  finalizeTrace,
  emitTraceLog,
  bufferTrace,
  type AgentTrace,
} from "./tracing";
import { storeTrace } from "@/lib/firestore/traces";
import type { AgentTemplate } from "@/types/agent-template";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import type {
  PreviewPlan,
  IntakeOutput,
  WorkflowMapperOutput,
  AutomationDesignerOutput,
  DashboardDesignerOutput,
  OpsPulseOutput,
  ImplementationSequencerOutput,
  ProposalOutput,
} from "@/types/preview-plan";

// ---------------------------------------------------------------------------
// Template loading
// ---------------------------------------------------------------------------

const REQUIRED_TEMPLATE_KEYS = [
  "intake_agent",
  "workflow_mapper",
  "automation_designer",
  "dashboard_designer",
  "ops_pulse_writer",
  "implementation_sequencer",
  "proposal_writer",
] as const;

// TTL cache for agent templates (5 minutes)
let _templateCache: { data: Map<string, string>; expires: number } | null =
  null;
const TEMPLATE_CACHE_TTL = 5 * 60_000;

export function invalidateTemplateCache() {
  _templateCache = null;
}

async function getAllTemplates(): Promise<Map<string, string>> {
  if (_templateCache && Date.now() < _templateCache.expires) {
    return _templateCache.data;
  }

  const localTemplates = await getLocalTemplates();
  const remoteTemplates = await getRemoteTemplates();
  const map = new Map<string, string>(localTemplates);
  for (const [key, value] of remoteTemplates.entries()) {
    map.set(key, value);
  }

  _templateCache = { data: map, expires: Date.now() + TEMPLATE_CACHE_TTL };
  return map;
}

async function getRemoteTemplates(): Promise<Map<string, string>> {
  try {
    const db = getAdminDb();
    const snap = await db.collection("agent_templates").get();
    const map = new Map<string, string>();
    snap.docs.forEach((doc) => {
      const data = doc.data() as AgentTemplate;
      map.set(data.key, data.markdown);
    });
    if (map.size === 0) {
      console.warn(
        "[orchestrator] Firestore agent_templates is empty; falling back to local templates."
      );
    }
    return map;
  } catch (error) {
    console.warn(
      "[orchestrator] Failed to load Firestore templates; falling back to local templates.",
      error
    );
    return new Map();
  }
}

async function getLocalTemplates(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const agentsDir = path.join(process.cwd(), "agents");

  await Promise.all(
    REQUIRED_TEMPLATE_KEYS.map(async (key) => {
      try {
        const markdown = await fs.readFile(
          path.join(agentsDir, `${key}.md`),
          "utf8"
        );
        map.set(key, markdown);
      } catch {
        // Ignore missing local templates — checked later
      }
    })
  );

  return map;
}

// ---------------------------------------------------------------------------
// Prompt A/B experiment overrides (5E)
// ---------------------------------------------------------------------------

import { AGENT_PROMPT_EXPERIMENT_PREFIX } from "@/lib/constants/experiments";

/**
 * Apply prompt A/B experiment overrides to the template map.
 *
 * For each assignment whose `experiment_target` starts with `agent_prompt:`,
 * extract the template key (e.g. `intake_agent` from `agent_prompt:intake_agent`)
 * and override the corresponding entry in `templates` with `variant_value`.
 *
 * Returns the list of template keys that were overridden (for tracing).
 */
export function applyPromptExperiments(
  templates: Map<string, string>,
  assignments: AgentExperimentAssignment[] | undefined
): string[] {
  if (!assignments || assignments.length === 0) return [];

  const overriddenKeys: string[] = [];

  for (const assignment of assignments) {
    if (!assignment.experiment_target.startsWith(AGENT_PROMPT_EXPERIMENT_PREFIX)) {
      continue; // Not a prompt experiment — skip
    }
    const templateKey = assignment.experiment_target.slice(
      AGENT_PROMPT_EXPERIMENT_PREFIX.length
    );
    if (!templateKey || !templates.has(templateKey)) {
      continue; // No matching template — skip
    }
    if (!assignment.variant_value) {
      continue; // No variant content provided — skip
    }
    templates.set(templateKey, assignment.variant_value);
    overriddenKeys.push(templateKey);
  }

  return overriddenKeys;
}

// ---------------------------------------------------------------------------
// Stage execution
// ---------------------------------------------------------------------------

/**
 * Execute a single pipeline stage with full agentic capabilities:
 * - Context assembly from prior results
 * - Tool use (RAG) for grounded generation
 * - Self-correction loops on validation failure
 * - Safety guardrails on output
 * - Tracing and observability
 */
async function executeStage<T>(
  config: PipelineStageConfig,
  template: string,
  input: AgentPipelineInput,
  results: Map<string, unknown>,
  trace: AgentTrace,
  routingSignals: Set<string>
): Promise<T> {
  const span = startSpan(trace, config.key, {
    templateKey: config.templateKey,
    critical: config.critical,
  });

  try {
    // 1. Assemble typed context from prior stage results
    const context = assembleStageContext(config.templateKey, input, results);

    // 2. Get grounded context via tool calls (RAG)
    // Tool errors must not block stage execution — fallback to empty context
    let toolContext = "";
    try {
      toolContext = await getToolContextForStage(config.templateKey, {
        industry: input.industry,
        ...context,
      });
    } catch (toolErr) {
      console.warn(
        `[orchestrator] Tool context failed for "${config.key}":`,
        toolErr instanceof Error ? toolErr.message : toolErr
      );
    }

    // 3. Build the full prompt (template + context + tool results)
    let prompt = assembleAgentContext(template, context);
    if (toolContext) {
      prompt += toolContext;
    }

    // 4. Inject routing signal hints if applicable
    if (routingSignals.size > 0) {
      const hints = Array.from(routingSignals).join(", ");
      prompt += `\n\n## Routing context\nUpstream signals: ${hints}. Adjust detail level accordingly.`;
    }

    // 5. Execute with self-correction (ReAct loop)
    const schema = stageOutputGuardrails[config.templateKey];
    if (!schema) {
      throw new Error(`No output guardrail schema for ${config.templateKey}`);
    }

    const correctionResult = await executeStageWithCorrection(
      config.templateKey,
      prompt,
      schema as import("zod").ZodType<T>,
      {
        span,
        timeoutMs: config.timeoutMs,
        maxCorrections: config.maxCorrections,
      }
    );

    // 6. Enforce output safety guardrails
    enforceOutputSafety(correctionResult.output, config.templateKey);

    // 7. End span successfully
    endSpan(span, {
      status: correctionResult.wasAutoFixed ? "completed" : "completed",
      corrections: correctionResult.corrections,
      metadata: {
        model: correctionResult.model,
        wasAutoFixed: correctionResult.wasAutoFixed,
        latencyMs: correctionResult.totalLatencyMs,
      },
    });

    return correctionResult.output;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    endSpan(span, { status: "failed", error: message });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Plan assembly
// ---------------------------------------------------------------------------

/** Map stage results into the PreviewPlan structure. */
function assemblePlan(results: Map<string, unknown>): PreviewPlan {
  const plan: PreviewPlan = {
    intake: (results.get("intake") as IntakeOutput) ?? {
      clarified_problem: "",
      assumptions: [],
      constraints: [],
      suggested_scope: "",
    },
    workflow: (results.get("workflow") as WorkflowMapperOutput) ?? {
      stages: [],
      required_fields: [],
      timestamps: [],
      failure_modes: [],
    },
    automation: (results.get("automation") as AutomationDesignerOutput) ?? {
      automations: [],
      alerts: [],
      logging_plan: [],
    },
    dashboard: (results.get("dashboard") as DashboardDesignerOutput) ?? {
      dashboards: [],
      kpis: [],
      views: [],
    },
    ops_pulse: (results.get("ops_pulse") as OpsPulseOutput) ?? {
      executive_summary: {
        problem: "",
        solution: "",
        impact: "",
        next_step: "",
      },
      sections: [],
      scorecard: [],
      actions: [],
      questions: [],
    },
  };

  // Only set roadmap if implementation_sequencer produced a result.
  // Firestore rejects `undefined` values — omitting the key entirely is safe.
  const roadmap = results.get("implementation_sequencer") as
    | ImplementationSequencerOutput
    | undefined;
  if (roadmap) {
    plan.roadmap = roadmap;
  }

  // Only set proposal if proposal_writer produced a result.
  const proposal = results.get("proposal_writer") as
    | ProposalOutput
    | undefined;
  if (proposal) {
    plan.proposal = proposal;
  }

  return plan;
}

// ---------------------------------------------------------------------------
// Public API: AgentRunInput (backward-compatible alias)
// ---------------------------------------------------------------------------

/** A single experiment assignment relevant to the agent pipeline. */
export interface AgentExperimentAssignment {
  experiment_id: string;
  variant_id: string;
  experiment_target: string;
  variant_value?: string;
}

export interface AgentRunInput {
  industry: string;
  bottleneck: string;
  current_tools: string;
  urgency?: string;
  volume?: string;
  /** Optional experiment assignments for prompt A/B testing (5E). */
  experimentAssignments?: AgentExperimentAssignment[];
}

// Re-export from registry for backward compatibility
export { type AgentStageKey as AgentStep, PIPELINE_STAGES as AGENT_STEPS } from "./registry";

// ---------------------------------------------------------------------------
// Core: orchestrateAgentPipeline (non-streaming)
// ---------------------------------------------------------------------------

/**
 * Orchestrate the full agent pipeline using the DAG executor.
 *
 * Walks the PIPELINE_DAG in tier order:
 * 1. Compute execution tiers from dependencies
 * 2. For each tier, execute all stages in parallel
 * 3. Critical stage failure → abort pipeline
 * 4. Non-critical stage failure → use fallback + emit warning
 * 5. Check routing signals after each stage
 * 6. Assemble final PreviewPlan from results
 * 7. Run cross-section guardrails
 */
export async function orchestrateAgentPipeline(
  input: AgentRunInput,
  onStageStart?: (step: AgentStageKey) => void
): Promise<{ plan: PreviewPlan; trace: AgentTrace }> {
  const traceMetadata: Record<string, unknown> = {
    industry: input.industry,
    bottleneck: input.bottleneck.slice(0, 200),
  };

  const templates = await getAllTemplates();

  // Apply prompt A/B experiment overrides (5E)
  const overriddenKeys = applyPromptExperiments(
    templates,
    input.experimentAssignments
  );
  if (overriddenKeys.length > 0) {
    traceMetadata.prompt_variant_keys = overriddenKeys;
  }

  const trace = createTrace("plan_generation", traceMetadata);
  const results = new Map<string, unknown>();
  const degradedStages: AgentStageKey[] = [];
  const routingSignals = new Set<string>();
  const tiers = computeExecutionTiers();

  function getTemplate(key: string): string {
    const t = templates.get(key);
    if (!t) throw new Error(`Agent template not found: ${key}`);
    return t;
  }

  for (const tier of tiers) {
    // Check if tier should be skipped (all dependencies failed for non-critical)
    const executableStages = tier.filter((stage) => {
      if (stage.critical) return true;
      // Skip if ALL dependencies failed (no data to work from)
      const allDepsFailed = stage.dependencies.length > 0 &&
        stage.dependencies.every((dep) => degradedStages.includes(dep));
      if (allDepsFailed) {
        degradedStages.push(stage.key);
        results.set(stage.key, getFallbackOutput(stage.key));
        return false;
      }
      return true;
    });

    if (executableStages.length === 0) continue;

    // Execute all stages in this tier in parallel
    const stagePromises = executableStages.map(async (stage) => {
      onStageStart?.(stage.key);
      try {
        const result = await executeStage(
          stage,
          getTemplate(stage.templateKey),
          input,
          results,
          trace,
          routingSignals
        );
        results.set(stage.key, result);

        // Check routing signals from this stage's output
        const signals = checkRoutingSignals(stage.key, result);
        for (const signal of signals) {
          routingSignals.add(signal);
        }
      } catch (err) {
        if (stage.critical) {
          throw err; // Critical failure → abort pipeline
        }
        // Non-critical → graceful degradation
        const message =
          err instanceof Error ? err.message : "Unknown error";
        console.error(
          `[orchestrator] Non-critical stage "${stage.key}" failed: ${message}`
        );
        degradedStages.push(stage.key);
        results.set(stage.key, getFallbackOutput(stage.key));
      }
    });

    await Promise.all(stagePromises);
  }

  // Assemble the plan from collected results
  const plan = assemblePlan(results);

  // Attach warnings for degraded stages + cross-section guardrail issues
  plan.warnings = [
    ...degradedStages.map((step) => ({
      section: step,
      message:
        "This section failed to generate and contains placeholder data. You can try refining it with feedback.",
    })),
    ...runCrossSectionGuardrails(plan),
  ];

  // Finalize trace
  finalizeTrace(trace);
  emitTraceLog(trace);
  bufferTrace(trace);
  storeTrace(trace).catch(() => {});

  return { plan, trace };
}

// ---------------------------------------------------------------------------
// Core: orchestrateAgentPipelineStreaming (SSE variant)
// ---------------------------------------------------------------------------

/**
 * Streaming variant — emits section progress via callbacks.
 * Used by the SSE chat endpoint to stream plan sections to the client.
 */
export async function orchestrateAgentPipelineStreaming(
  input: AgentRunInput,
  onSection: (step: AgentStageKey, label: string, data: unknown) => void,
  onSectionFailed?: (step: AgentStageKey, error: string) => void
): Promise<{ plan: PreviewPlan; trace: AgentTrace }> {
  const streamingTraceMetadata: Record<string, unknown> = {
    industry: input.industry,
    bottleneck: input.bottleneck.slice(0, 200),
    streaming: true,
  };

  const templates = await getAllTemplates();

  // Apply prompt A/B experiment overrides (5E)
  const streamOverriddenKeys = applyPromptExperiments(
    templates,
    input.experimentAssignments
  );
  if (streamOverriddenKeys.length > 0) {
    streamingTraceMetadata.prompt_variant_keys = streamOverriddenKeys;
  }

  const trace = createTrace("plan_generation", streamingTraceMetadata);
  const results = new Map<string, unknown>();
  const degradedStages: AgentStageKey[] = [];
  const routingSignals = new Set<string>();
  const tiers = computeExecutionTiers();

  function getTemplate(key: string): string {
    const t = templates.get(key);
    if (!t) throw new Error(`Agent template not found: ${key}`);
    return t;
  }

  for (const tier of tiers) {
    const executableStages = tier.filter((stage) => {
      if (stage.critical) return true;
      const allDepsFailed =
        stage.dependencies.length > 0 &&
        stage.dependencies.every((dep) => degradedStages.includes(dep));
      if (allDepsFailed) {
        degradedStages.push(stage.key);
        results.set(stage.key, getFallbackOutput(stage.key));
        onSectionFailed?.(
          stage.key,
          `Skipped: depends on ${stage.dependencies.join(" and ")} which failed`
        );
        return false;
      }
      return true;
    });

    if (executableStages.length === 0) continue;

    // Emit "starting" events for all stages in this tier
    for (const stage of executableStages) {
      onSection(stage.key, stage.label, null);
    }

    const stagePromises = executableStages.map(async (stage) => {
      try {
        const result = await executeStage(
          stage,
          getTemplate(stage.templateKey),
          input,
          results,
          trace,
          routingSignals
        );
        results.set(stage.key, result);
        onSection(stage.key, stage.completeLabel, result);

        const signals = checkRoutingSignals(stage.key, result);
        for (const signal of signals) {
          routingSignals.add(signal);
        }
      } catch (err) {
        if (stage.critical) throw err;
        const message =
          err instanceof Error ? err.message : "Unknown error";
        console.error(
          `[orchestrator] Non-critical stage "${stage.key}" failed: ${message}`
        );
        degradedStages.push(stage.key);
        results.set(stage.key, getFallbackOutput(stage.key));
        onSectionFailed?.(stage.key, message);
      }
    });

    await Promise.all(stagePromises);
  }

  const plan = assemblePlan(results);
  plan.warnings = [
    ...degradedStages.map((step) => ({
      section: step,
      message:
        "This section failed to generate and contains placeholder data. You can try refining it with feedback.",
    })),
    ...runCrossSectionGuardrails(plan),
  ];

  finalizeTrace(trace);
  emitTraceLog(trace);
  bufferTrace(trace);
  storeTrace(trace).catch(() => {});

  return { plan, trace };
}

// ---------------------------------------------------------------------------
// Backward-compatible wrappers
// ---------------------------------------------------------------------------

/**
 * @deprecated Use orchestrateAgentPipeline() — returns { plan, trace }
 */
export async function runAgentChain(
  input: AgentRunInput,
  onStep?: (step: AgentStageKey) => void
): Promise<PreviewPlan> {
  const { plan } = await orchestrateAgentPipeline(input, onStep);
  return plan;
}

/**
 * @deprecated Use orchestrateAgentPipelineStreaming() — returns { plan, trace }
 */
export async function runAgentChainStreaming(
  input: AgentRunInput,
  onSection: (step: AgentStageKey, label: string, data: unknown) => void,
  onSectionFailed?: (step: AgentStageKey, error: string) => void
): Promise<PreviewPlan> {
  const { plan } = await orchestrateAgentPipelineStreaming(
    input,
    onSection,
    onSectionFailed
  );
  return plan;
}

/**
 * Run a single agent template with sample input (for admin test-run).
 */
export async function runSingleAgent(
  templateKey: string,
  sampleInput: Record<string, unknown>
): Promise<unknown> {
  const templates = await getAllTemplates();
  const template = templates.get(templateKey);
  if (!template)
    throw new Error(`Agent template not found: ${templateKey}`);

  const { invokeLLM, robustJsonParse } = await import("./llm-client");
  const prompt = assembleAgentContext(template, sampleInput);
  const result = await invokeLLM(prompt, {
    label: `test:${templateKey}`,
    timeoutMs: 30_000,
  });

  const parsed = robustJsonParse(result.text);
  enforceOutputSafety(parsed, templateKey);

  const schema = stageOutputGuardrails[templateKey];
  if (schema) {
    const validated = schema.safeParse(parsed);
    if (!validated.success) {
      throw new Error(
        `Invalid ${templateKey} output: ${validated.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
          .join("; ")}`
      );
    }
    return validated.data;
  }

  return parsed;
}
