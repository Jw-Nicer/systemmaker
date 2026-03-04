import { getAdminDb } from "@/lib/firebase/admin";
import { buildPrompt } from "./prompts";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import type { AgentTemplate } from "@/types/agent-template";
import type {
  PreviewPlan,
  IntakeOutput,
  WorkflowMapperOutput,
  AutomationDesignerOutput,
  DashboardDesignerOutput,
  OpsPulseOutput,
} from "@/types/preview-plan";

const DEFAULT_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"] as const;
const MAX_RETRIES_PER_MODEL = 2;
const BASE_RETRY_DELAY_MS = 300;

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

const intakeOutputSchema = z.object({
  clarified_problem: z.string().min(1),
  assumptions: z.array(z.string()),
  constraints: z.array(z.string()),
  suggested_scope: z.string().min(1),
});

const workflowStageSchema = z.object({
  name: z.string().min(1),
  owner_role: z.string().min(1),
  entry_criteria: z.string().min(1),
  exit_criteria: z.string().min(1),
});

const workflowMapperOutputSchema = z.object({
  stages: z.array(workflowStageSchema),
  required_fields: z.array(z.string()),
  timestamps: z.array(z.string()),
  failure_modes: z.array(z.string()),
});

const automationDesignerOutputSchema = z.object({
  automations: z.array(
    z.object({
      trigger: z.string().min(1),
      steps: z.array(z.string()),
      data_required: z.array(z.string()),
      error_handling: z.string().min(1),
    })
  ),
  alerts: z.array(
    z.object({
      when: z.string().min(1),
      who: z.string().min(1),
      message: z.string().min(1),
      escalation: z.string().min(1),
    })
  ),
  logging_plan: z.array(
    z.object({
      what_to_log: z.string().min(1),
      where: z.string().min(1),
      how_to_review: z.string().min(1),
    })
  ),
});

const dashboardDesignerOutputSchema = z.object({
  dashboards: z.array(
    z.object({
      name: z.string().min(1),
      purpose: z.string().min(1),
      widgets: z.array(z.string()),
    })
  ),
  kpis: z.array(
    z.object({
      name: z.string().min(1),
      definition: z.string().min(1),
      why_it_matters: z.string().min(1),
    })
  ),
  views: z.array(
    z.object({
      name: z.string().min(1),
      filter: z.string().min(1),
      columns: z.array(z.string()),
    })
  ),
});

const opsPulseOutputSchema = z.object({
  sections: z.array(
    z.object({
      title: z.string().min(1),
      bullets: z.array(z.string()),
    })
  ),
  scorecard: z.array(z.string()),
  actions: z.array(
    z.object({
      priority: z.string().min(1),
      owner_role: z.string().min(1),
      action: z.string().min(1),
    })
  ),
  questions: z.array(z.string()),
});

const templateOutputSchemas: Partial<Record<string, z.ZodTypeAny>> = {
  intake_agent: intakeOutputSchema,
  workflow_mapper: workflowMapperOutputSchema,
  automation_designer: automationDesignerOutputSchema,
  dashboard_designer: dashboardDesignerOutputSchema,
  ops_pulse_writer: opsPulseOutputSchema,
};

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not set");

  const client = new GoogleGenerativeAI(apiKey);
  const models = getModelCandidates();
  let lastError: Error | null = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
      try {
        const geminiModel = client.getGenerativeModel({
          model,
          generationConfig: { responseMimeType: "application/json" },
        });

        const result = await geminiModel.generateContent(prompt);
        const text = result.response.text()?.trim();
        if (!text) {
          const finishReason = result.response.candidates?.[0]?.finishReason;
          throw new Error(
            `Gemini returned an empty response${finishReason ? ` (finish reason: ${finishReason})` : ""}`
          );
        }
        return text;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown Gemini API error";
        lastError = new Error(
          `Gemini API error (${model}, attempt ${attempt + 1}/${MAX_RETRIES_PER_MODEL + 1}): ${message}`
        );

        const isTransient = isTransientGeminiError(message);
        const hasRetryLeft = attempt < MAX_RETRIES_PER_MODEL;

        if (isTransient && hasRetryLeft) {
          await sleep(getRetryDelayMs(attempt));
          continue;
        }

        if (!isModelAvailabilityError(message)) {
          break;
        }
      }
    }

    const isLastModel = i === models.length - 1;
    if (isLastModel) break;
  }

  throw lastError ?? new Error("Gemini API error");
}

async function getAllTemplates(): Promise<Map<string, string>> {
  const db = getAdminDb();
  const snap = await db.collection("agent_templates").get();
  const map = new Map<string, string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  snap.docs.forEach((doc: any) => {
    const data = doc.data() as AgentTemplate;
    map.set(data.key, data.markdown);
  });
  return map;
}

async function runAgentWithTemplate<T>(
  templateKey: string,
  template: string,
  context: Record<string, unknown>
): Promise<T> {
  const prompt = buildPrompt(template, context);
  const text = await callGemini(prompt);

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
    throw new Error(
      `Failed to parse ${templateKey} output as JSON: ${cleaned.slice(0, 200)}`
    );
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

  return validated.data as T;
}

export type AgentStep =
  | "intake"
  | "workflow"
  | "automation"
  | "dashboard"
  | "ops_pulse";

export const AGENT_STEPS: { key: AgentStep; label: string }[] = [
  { key: "intake", label: "Analyzing bottleneck..." },
  { key: "workflow", label: "Mapping workflow stages..." },
  { key: "automation", label: "Designing automations..." },
  { key: "dashboard", label: "Building dashboard KPIs..." },
  { key: "ops_pulse", label: "Writing ops pulse..." },
];

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

  // Step 5: Ops Pulse Writer
  onStep?.("ops_pulse");
  const ops_pulse = await runAgentWithTemplate<OpsPulseOutput>(
    "ops_pulse_writer",
    getTemplate("ops_pulse_writer"),
    {
      kpis: dashboard.kpis,
      dashboards: dashboard.dashboards,
      failure_modes: workflow.failure_modes,
    }
  );

  return { intake, workflow, automation, dashboard, ops_pulse };
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
