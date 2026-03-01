import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAdminDb } from "@/lib/firebase/admin";
import { buildPrompt } from "./prompts";
import type { AgentTemplate } from "@/types/agent-template";
import type {
  PreviewPlan,
  IntakeOutput,
  WorkflowMapperOutput,
  AutomationDesignerOutput,
  DashboardDesignerOutput,
  OpsPulseOutput,
} from "@/types/preview-plan";

const MODEL = "gemini-2.0-flash";

function getClient() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not set");
  return new GoogleGenerativeAI(apiKey);
}

async function getTemplate(key: string): Promise<string> {
  const db = getAdminDb();
  const snap = await db
    .collection("agent_templates")
    .where("key", "==", key)
    .limit(1)
    .get();

  if (snap.empty) {
    throw new Error(`Agent template not found: ${key}`);
  }

  return (snap.docs[0].data() as AgentTemplate).markdown;
}

async function runAgent<T>(
  templateKey: string,
  context: Record<string, unknown>
): Promise<T> {
  const client = getClient();
  const model = client.getGenerativeModel({ model: MODEL });
  const template = await getTemplate(templateKey);
  const prompt = buildPrompt(template, context);

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Strip markdown code fences if present
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(
      `Failed to parse ${templateKey} output as JSON: ${cleaned.slice(0, 200)}`
    );
  }
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
  // Step 1: Intake
  onStep?.("intake");
  const intake = await runAgent<IntakeOutput>("intake_agent", {
    industry: input.industry,
    bottleneck: input.bottleneck,
    current_tools: input.current_tools,
    urgency: input.urgency ?? "not specified",
    volume: input.volume ?? "not specified",
  });

  // Step 2: Workflow Mapper
  onStep?.("workflow");
  const workflow = await runAgent<WorkflowMapperOutput>("workflow_mapper", {
    clarified_problem: intake.clarified_problem,
    industry: input.industry,
    current_tools: input.current_tools,
    assumptions: intake.assumptions,
    suggested_scope: intake.suggested_scope,
  });

  // Step 3: Automation Designer
  onStep?.("automation");
  const automation = await runAgent<AutomationDesignerOutput>(
    "automation_designer",
    {
      stages: workflow.stages,
      required_fields: workflow.required_fields,
      current_tools: input.current_tools,
      failure_modes: workflow.failure_modes,
    }
  );

  // Step 4: Dashboard Designer
  onStep?.("dashboard");
  const dashboard = await runAgent<DashboardDesignerOutput>(
    "dashboard_designer",
    {
      stages: workflow.stages,
      timestamps: workflow.timestamps,
      industry: input.industry,
      required_fields: workflow.required_fields,
    }
  );

  // Step 5: Ops Pulse Writer
  onStep?.("ops_pulse");
  const ops_pulse = await runAgent<OpsPulseOutput>("ops_pulse_writer", {
    kpis: dashboard.kpis,
    dashboards: dashboard.dashboards,
    failure_modes: workflow.failure_modes,
  });

  return { intake, workflow, automation, dashboard, ops_pulse };
}

/**
 * Run a single agent template with sample input (for admin test-run).
 */
export async function runSingleAgent(
  templateKey: string,
  sampleInput: Record<string, unknown>
): Promise<unknown> {
  return runAgent<unknown>(templateKey, sampleInput);
}
