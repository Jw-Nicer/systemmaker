import { getAdminDb } from "@/lib/firebase/admin";
import { buildPrompt } from "./prompts";
import { assertSafeAgentObject } from "./safety";
import { templateOutputSchemas } from "./schemas";
import { validatePlanConsistency } from "./validation";
import type { AgentStep } from "./registry";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AgentTemplate } from "@/types/agent-template";
import type {
  PreviewPlan,
  IntakeOutput,
  WorkflowMapperOutput,
  AutomationDesignerOutput,
  DashboardDesignerOutput,
  OpsPulseOutput,
  ImplementationSequencerOutput,
} from "@/types/preview-plan";

const DEFAULT_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"] as const;
const MAX_RETRIES_PER_MODEL = 2;
const BASE_RETRY_DELAY_MS = 300;
const MAX_OUTPUT_BYTES = 512 * 1024; // 512KB max per Gemini response

/** Per-stage timeout overrides — critical stages get less time, complex ones get more. */
const STAGE_TIMEOUTS: Record<string, number> = {
  intake_agent: 15_000,
  workflow_mapper: 25_000,
  automation_designer: 30_000,
  dashboard_designer: 30_000,
  ops_pulse_writer: 25_000,
  implementation_sequencer: 30_000,
};
const DEFAULT_TIMEOUT_MS = 60_000;

// Singleton Gemini client — avoids re-instantiation per call
let _geminiClient: GoogleGenerativeAI | null = null;
function getGeminiClient(): GoogleGenerativeAI {
  if (!_geminiClient) {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not set");
    _geminiClient = new GoogleGenerativeAI(apiKey);
  }
  return _geminiClient;
}

// TTL cache for agent templates (5 minutes)
let _templateCache: { data: Map<string, string>; expires: number } | null = null;
const TEMPLATE_CACHE_TTL = 5 * 60_000;

export function invalidateTemplateCache() {
  _templateCache = null;
}

function getModelCandidates(): string[] {
  const configuredModel = process.env.GOOGLE_GEMINI_MODEL?.trim();
  if (configuredModel) return [configuredModel];
  return [...DEFAULT_MODELS];
}

function isModelAvailabilityError(errorMessage: string): boolean {
  const msg = errorMessage.toLowerCase();
  return (
    msg.includes("not found for api version") ||
    msg.includes("is not found") ||
    msg.includes("is not supported") ||
    msg.includes("permission denied")
  );
}

function isTransientGeminiError(errorMessage: string): boolean {
  const msg = errorMessage.toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("quota") ||
    msg.includes("deadline exceeded") ||
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    msg.includes("temporarily unavailable") ||
    msg.includes("internal error") ||
    msg.includes("unavailable") ||
    msg.includes("econnreset") ||
    msg.includes("network")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(attempt: number): number {
  const backoff = BASE_RETRY_DELAY_MS * 2 ** attempt;
  const jitter = Math.floor(Math.random() * 100);
  return backoff + jitter;
}

async function callGemini(prompt: string, timeoutMs?: number): Promise<string> {
  const client = getGeminiClient();
  const models = getModelCandidates();
  const timeout = timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let lastError: Error | null = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
      try {
        const geminiModel = client.getGenerativeModel({
          model,
          generationConfig: { responseMimeType: "application/json" },
        });

        const result = await Promise.race([
          geminiModel.generateContent(prompt),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Gemini request timed out")), timeout)
          ),
        ]);
        const text = result.response.text()?.trim();
        if (!text) {
          throw new Error("Empty response from AI model");
        }
        if (new TextEncoder().encode(text).byteLength > MAX_OUTPUT_BYTES) {
          throw new Error("AI response exceeded size limit");
        }
        return text;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error";
        lastError = new Error(
          `AI generation failed (attempt ${attempt + 1})`
        );

        if (isModelAvailabilityError(message)) {
          break;
        }

        const isTransient = isTransientGeminiError(message);
        const hasRetryLeft = attempt < MAX_RETRIES_PER_MODEL;

        if (isTransient && hasRetryLeft) {
          await sleep(getRetryDelayMs(attempt));
          continue;
        }

        // For non-transient, non-availability errors, try next model
        break;
      }
    }

    const isLastModel = i === models.length - 1;
    if (isLastModel) break;
  }

  throw lastError ?? new Error("AI generation failed");
}

async function getAllTemplates(): Promise<Map<string, string>> {
  // Return cached templates if still valid
  if (_templateCache && Date.now() < _templateCache.expires) {
    return _templateCache.data;
  }

  const db = getAdminDb();
  const snap = await db.collection("agent_templates").get();
  const map = new Map<string, string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  snap.docs.forEach((doc: any) => {
    const data = doc.data() as AgentTemplate;
    map.set(data.key, data.markdown);
  });

  _templateCache = { data: map, expires: Date.now() + TEMPLATE_CACHE_TTL };
  return map;
}

async function runAgentWithTemplate<T>(
  templateKey: string,
  template: string,
  context: Record<string, unknown>
): Promise<T> {
  const prompt = buildPrompt(template, context);
  const text = await callGemini(prompt, STAGE_TIMEOUTS[templateKey]);

  // Strip markdown code fences if present
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  function tryParse(value: string): T | null {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  let parsed = tryParse(cleaned);

  // Fallback: extract the outer-most JSON object if the model wrapped it with extra text.
  if (!parsed) {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      const extracted = cleaned.slice(firstBrace, lastBrace + 1);
      parsed = tryParse(extracted);
    }
  }

  if (!parsed) {
    throw new Error(`Failed to parse ${templateKey} output as JSON`);
  }

  const schema = templateOutputSchemas[templateKey];
  if (!schema) return parsed;

  const validated = schema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(
      `Invalid ${templateKey} output schema: ${validated.error.issues
        .slice(0, 3)
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("; ")}`
    );
  }

  assertSafeAgentObject(validated.data, templateKey);
  return validated.data as T;
}

// Re-export from registry for backward compatibility
export { type AgentStep, AGENT_STEPS } from "./registry";

export interface AgentRunInput {
  industry: string;
  bottleneck: string;
  current_tools: string;
  urgency?: string;
  volume?: string;
}

export async function runAgentChain(
  input: AgentRunInput,
  onStep?: (step: AgentStep) => void
): Promise<PreviewPlan> {
  // Pre-fetch all templates in one Firestore read
  const templates = await getAllTemplates();

  function getTemplate(key: string): string {
    const t = templates.get(key);
    if (!t) throw new Error(`Agent template not found: ${key}`);
    return t;
  }

  // Step 1: Intake
  onStep?.("intake");
  const intake = await runAgentWithTemplate<IntakeOutput>(
    "intake_agent",
    getTemplate("intake_agent"),
    {
      industry: input.industry,
      bottleneck: input.bottleneck,
      current_tools: input.current_tools,
      urgency: input.urgency ?? "not specified",
      volume: input.volume ?? "not specified",
    }
  );

  // Step 2: Workflow Mapper
  onStep?.("workflow");
  const workflow = await runAgentWithTemplate<WorkflowMapperOutput>(
    "workflow_mapper",
    getTemplate("workflow_mapper"),
    {
      clarified_problem: intake.clarified_problem,
      industry: input.industry,
      current_tools: input.current_tools,
      assumptions: intake.assumptions,
      suggested_scope: intake.suggested_scope,
    }
  );

  // Steps 3 & 4 in parallel — both depend on workflow but not on each other
  onStep?.("automation");
  const automationPromise = runAgentWithTemplate<AutomationDesignerOutput>(
    "automation_designer",
    getTemplate("automation_designer"),
    {
      stages: workflow.stages,
      required_fields: workflow.required_fields,
      current_tools: input.current_tools,
      failure_modes: workflow.failure_modes,
    }
  );

  onStep?.("dashboard");
  const dashboardPromise = runAgentWithTemplate<DashboardDesignerOutput>(
    "dashboard_designer",
    getTemplate("dashboard_designer"),
    {
      stages: workflow.stages,
      timestamps: workflow.timestamps,
      industry: input.industry,
      required_fields: workflow.required_fields,
    }
  );

  const [automation, dashboard] = await Promise.all([
    automationPromise,
    dashboardPromise,
  ]);

  // Steps 5 & 6 in parallel — both depend on automation + dashboard
  onStep?.("ops_pulse");
  onStep?.("implementation_sequencer");

  const [ops_pulse, roadmap] = await Promise.all([
    runAgentWithTemplate<OpsPulseOutput>(
      "ops_pulse_writer",
      getTemplate("ops_pulse_writer"),
      {
        kpis: dashboard.kpis,
        dashboards: dashboard.dashboards,
        failure_modes: workflow.failure_modes,
      }
    ),
    runAgentWithTemplate<ImplementationSequencerOutput>(
      "implementation_sequencer",
      getTemplate("implementation_sequencer"),
      {
        clarified_problem: intake.clarified_problem,
        assumptions: intake.assumptions,
        constraints: intake.constraints,
        suggested_scope: intake.suggested_scope,
        stages: workflow.stages,
        automations: automation.automations,
        alerts: automation.alerts,
        dashboards: dashboard.dashboards,
        kpis: dashboard.kpis,
      }
    ).catch(() => undefined),
  ]);

  const plan: PreviewPlan = { intake, workflow, automation, dashboard, ops_pulse, roadmap };
  plan.warnings = validatePlanConsistency(plan);
  return plan;
}

/**
 * Streaming variant of runAgentChain — calls onSection with the step key,
 * label, and parsed section data as each stage completes.
 * Used by the SSE chat endpoint to stream plan sections to the client.
 *
 * Supports graceful degradation: if automation, dashboard, or ops_pulse fail,
 * the plan is returned with available sections. Intake and workflow are
 * critical — their failure still throws.
 */
export async function runAgentChainStreaming(
  input: AgentRunInput,
  onSection: (step: AgentStep, label: string, data: unknown) => void,
  onSectionFailed?: (step: AgentStep, error: string) => void,
): Promise<PreviewPlan> {
  const templates = await getAllTemplates();
  const failedStages: AgentStep[] = [];

  function getTemplate(key: string): string {
    const t = templates.get(key);
    if (!t) throw new Error(`Agent template not found: ${key}`);
    return t;
  }

  // Step 1: Intake (critical — cannot proceed without it)
  onSection("intake", "Analyzing your bottleneck...", null);
  const intake = await runAgentWithTemplate<IntakeOutput>(
    "intake_agent",
    getTemplate("intake_agent"),
    {
      industry: input.industry,
      bottleneck: input.bottleneck,
      current_tools: input.current_tools,
      urgency: input.urgency ?? "not specified",
      volume: input.volume ?? "not specified",
    }
  );
  onSection("intake", "Bottleneck analysis complete", intake);

  // Step 2: Workflow Mapper (critical — automation/dashboard depend on it)
  onSection("workflow", "Mapping workflow stages...", null);
  const workflow = await runAgentWithTemplate<WorkflowMapperOutput>(
    "workflow_mapper",
    getTemplate("workflow_mapper"),
    {
      clarified_problem: intake.clarified_problem,
      industry: input.industry,
      current_tools: input.current_tools,
      assumptions: intake.assumptions,
      suggested_scope: intake.suggested_scope,
    }
  );
  onSection("workflow", "Workflow mapping complete", workflow);

  // Steps 3 & 4 in parallel — graceful degradation: catch individual failures
  onSection("automation", "Designing automations...", null);
  onSection("dashboard", "Building dashboard KPIs...", null);

  const [automationResult, dashboardResult] = await Promise.all([
    runAgentWithTemplate<AutomationDesignerOutput>(
      "automation_designer",
      getTemplate("automation_designer"),
      {
        stages: workflow.stages,
        required_fields: workflow.required_fields,
        current_tools: input.current_tools,
        failure_modes: workflow.failure_modes,
      }
    ).then((result) => {
      onSection("automation", "Automation design complete", result);
      return result;
    }).catch((err) => {
      const msg = err instanceof Error ? err.message : "Automation design failed";
      console.error("Automation stage failed:", msg);
      failedStages.push("automation");
      onSectionFailed?.("automation", msg);
      return null;
    }),
    runAgentWithTemplate<DashboardDesignerOutput>(
      "dashboard_designer",
      getTemplate("dashboard_designer"),
      {
        stages: workflow.stages,
        timestamps: workflow.timestamps,
        industry: input.industry,
        required_fields: workflow.required_fields,
      }
    ).then((result) => {
      onSection("dashboard", "Dashboard KPIs complete", result);
      return result;
    }).catch((err) => {
      const msg = err instanceof Error ? err.message : "Dashboard design failed";
      console.error("Dashboard stage failed:", msg);
      failedStages.push("dashboard");
      onSectionFailed?.("dashboard", msg);
      return null;
    }),
  ]);

  // Provide fallback empty sections for failed stages
  const automation: AutomationDesignerOutput = automationResult ?? {
    automations: [], alerts: [], logging_plan: [],
  };
  const dashboard: DashboardDesignerOutput = dashboardResult ?? {
    dashboards: [], kpis: [], views: [],
  };

  // Step 5: Ops Pulse Writer — skip if both automation AND dashboard failed
  let ops_pulse: OpsPulseOutput;
  if (!automationResult && !dashboardResult) {
    failedStages.push("ops_pulse");
    onSectionFailed?.("ops_pulse", "Skipped: depends on automation and dashboard which both failed");
    ops_pulse = {
      executive_summary: { problem: "", solution: "", impact: "", next_step: "" },
      sections: [], scorecard: [], actions: [], questions: [],
    };
  } else {
    onSection("ops_pulse", "Writing ops pulse...", null);
    try {
      ops_pulse = await runAgentWithTemplate<OpsPulseOutput>(
        "ops_pulse_writer",
        getTemplate("ops_pulse_writer"),
        {
          kpis: dashboard.kpis,
          dashboards: dashboard.dashboards,
          failure_modes: workflow.failure_modes,
        }
      );
      onSection("ops_pulse", "Ops pulse complete", ops_pulse);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ops pulse failed";
      console.error("Ops pulse stage failed:", msg);
      failedStages.push("ops_pulse");
      onSectionFailed?.("ops_pulse", msg);
      ops_pulse = {
        executive_summary: { problem: "", solution: "", impact: "", next_step: "" },
        sections: [], scorecard: [], actions: [], questions: [],
      };
    }
  }

  const plan: PreviewPlan = { intake, workflow, automation, dashboard, ops_pulse };
  if (failedStages.length > 0) {
    plan.warnings = [
      ...failedStages.map((step) => ({
        section: step,
        message: `This section failed to generate and contains placeholder data. You can try refining it with feedback.`,
      })),
      ...validatePlanConsistency(plan),
    ];
  } else {
    plan.warnings = validatePlanConsistency(plan);
  }
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
  if (!template) throw new Error(`Agent template not found: ${templateKey}`);
  return runAgentWithTemplate<unknown>(templateKey, template, sampleInput);
}
