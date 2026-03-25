/**
 * Agent Tool Use — function calling framework for grounded generation.
 *
 * Agents can call tools to access real data during plan generation.
 * This enables Retrieval-Augmented Generation (RAG) and grounded
 * recommendations based on actual case studies, industry benchmarks,
 * and existing plans.
 *
 * Tool results are injected into the agent's prompt context, giving
 * the LLM access to real-world data without hallucination.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentTool {
  /** Unique tool name (used in prompt references). */
  name: string;
  /** Human-readable description of what the tool does. */
  description: string;
  /** Zod schema for tool input parameters. */
  inputSchema: z.ZodTypeAny;
  /** Execute the tool with validated parameters. */
  execute: (params: Record<string, unknown>) => Promise<unknown>;
  /** Which pipeline stages can use this tool. Empty = all stages. */
  allowedStages?: string[];
}

export interface ToolCallResult {
  tool: string;
  input: Record<string, unknown>;
  output: unknown;
  latencyMs: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Built-in tools
// ---------------------------------------------------------------------------

/**
 * Search case studies by industry for grounded recommendations.
 * Returns real case studies that the agent can reference in its output.
 */
const searchCaseStudiesTool: AgentTool = {
  name: "searchCaseStudies",
  description:
    "Search published case studies by industry. Returns matching case studies with their challenges, solutions, and measured results. Use this to ground recommendations in real examples.",
  inputSchema: z.object({
    industry: z.string().describe("Industry to search for case studies"),
  }),
  allowedStages: ["intake_agent", "ops_pulse_writer"],
  execute: async (params) => {
    try {
      // Dynamic import to avoid circular dependencies
      const { getPublishedCaseStudies } = await import(
        "@/lib/firestore/case-studies"
      );
      const allCaseStudies = await getPublishedCaseStudies();
      const industry = (params.industry as string).toLowerCase();

      const matches = allCaseStudies.filter(
        (cs) =>
          cs.industry?.toLowerCase().includes(industry) ||
          cs.title?.toLowerCase().includes(industry)
      );

      return matches.slice(0, 3).map((cs) => ({
        title: cs.title,
        industry: cs.industry,
        challenge: cs.challenge,
        solution: cs.solution,
        metrics: cs.metrics,
      }));
    } catch {
      return [];
    }
  },
};

/**
 * Get industry-specific KPI benchmarks for dashboard design.
 * Returns typical KPIs, target values, and measurement approaches
 * for the given industry.
 */
const getIndustryBenchmarksTool: AgentTool = {
  name: "getIndustryBenchmarks",
  description:
    "Get industry-standard KPI benchmarks and targets. Returns typical KPIs with target values for the given industry. Use this to set realistic dashboard targets.",
  inputSchema: z.object({
    industry: z.string().describe("Industry to get benchmarks for"),
  }),
  allowedStages: ["dashboard_designer", "ops_pulse_writer"],
  execute: async (params) => {
    const industry = (params.industry as string).toLowerCase();
    return getIndustryBenchmarks(industry);
  },
};

/**
 * Search existing plans by industry for pattern reuse.
 * Returns anonymized plan structures that the agent can learn from.
 */
const searchExistingPlansTool: AgentTool = {
  name: "searchExistingPlans",
  description:
    "Search existing generated plans by industry. Returns anonymized plan structures for pattern reuse. Use this to avoid generating generic plans when real examples exist.",
  inputSchema: z.object({
    industry: z.string().describe("Industry to search plans for"),
  }),
  allowedStages: ["workflow_mapper", "automation_designer"],
  execute: async (params) => {
    try {
      const { getAdminDb } = await import("@/lib/firebase/admin");
      const db = getAdminDb();
      const industry = (params.industry as string).toLowerCase();

      const snap = await db
        .collection("plans")
        .where("is_public", "==", true)
        .limit(5)
        .get();

      // Return anonymized structure (no PII)
      return snap.docs
        .filter((doc) => {
          const data = doc.data();
          const inputSummary = (data.input_summary ?? "").toLowerCase();
          return inputSummary.includes(industry);
        })
        .slice(0, 2)
        .map((doc) => {
          const plan = doc.data().preview_plan;
          return {
            workflow_stage_count: plan?.workflow?.stages?.length ?? 0,
            workflow_stage_names:
              plan?.workflow?.stages?.map(
                (s: { name: string }) => s.name
              ) ?? [],
            automation_count: plan?.automation?.automations?.length ?? 0,
            kpi_count: plan?.dashboard?.kpis?.length ?? 0,
            phase_count: plan?.roadmap?.phases?.length ?? 0,
          };
        });
    } catch {
      return [];
    }
  },
};

// ---------------------------------------------------------------------------
// Industry benchmarks data (deterministic, no LLM call)
// ---------------------------------------------------------------------------

function getIndustryBenchmarks(
  industry: string
): Record<string, unknown> {
  const benchmarks: Record<string, Record<string, unknown>> = {
    construction: {
      kpis: [
        { name: "Job Completion Rate", target: "≥92%", unit: "percent" },
        { name: "Change Order Processing Time", target: "≤48 hours", unit: "hours" },
        { name: "Daily Log Compliance", target: "≥95%", unit: "percent" },
        { name: "Punch List Resolution Time", target: "≤5 days", unit: "days" },
      ],
    },
    healthcare: {
      kpis: [
        { name: "Patient Wait Time", target: "≤15 minutes", unit: "minutes" },
        { name: "No-Show Rate", target: "≤10%", unit: "percent" },
        { name: "Prior Auth Approval Time", target: "≤24 hours", unit: "hours" },
        { name: "Referral Follow-Up Rate", target: "≥90%", unit: "percent" },
      ],
    },
    "property management": {
      kpis: [
        { name: "Work Order Resolution Time", target: "≤48 hours", unit: "hours" },
        { name: "Tenant Response Time", target: "≤4 hours", unit: "hours" },
        { name: "Lease Renewal Rate", target: "≥80%", unit: "percent" },
        { name: "Rent Collection Rate", target: "≥97%", unit: "percent" },
      ],
    },
    staffing: {
      kpis: [
        { name: "Time to Fill", target: "≤10 days", unit: "days" },
        { name: "Timesheet Submission Rate", target: "≥95%", unit: "percent" },
        { name: "Placement Fall-Off Rate", target: "≤5%", unit: "percent" },
        { name: "Client Satisfaction Score", target: "≥4.5/5", unit: "score" },
      ],
    },
    legal: {
      kpis: [
        { name: "Client Intake Time", target: "≤24 hours", unit: "hours" },
        { name: "Billing Realization Rate", target: "≥90%", unit: "percent" },
        { name: "Deadline Compliance", target: "100%", unit: "percent" },
        { name: "Document Turnaround Time", target: "≤3 days", unit: "days" },
      ],
    },
    "home services": {
      kpis: [
        { name: "First-Time Fix Rate", target: "≥85%", unit: "percent" },
        { name: "Average Response Time", target: "≤2 hours", unit: "hours" },
        { name: "Invoice-to-Payment Time", target: "≤7 days", unit: "days" },
        { name: "Customer Satisfaction", target: "≥4.7/5", unit: "score" },
      ],
    },
    logistics: {
      kpis: [
        { name: "On-Time Delivery Rate", target: "≥95%", unit: "percent" },
        { name: "Load Utilization", target: "≥85%", unit: "percent" },
        { name: "POD Capture Rate", target: "≥98%", unit: "percent" },
        { name: "Invoice Accuracy", target: "≥99%", unit: "percent" },
      ],
    },
    dental: {
      kpis: [
        { name: "Chair Utilization", target: "≥85%", unit: "percent" },
        { name: "Treatment Acceptance Rate", target: "≥70%", unit: "percent" },
        { name: "Recall Compliance", target: "≥80%", unit: "percent" },
        { name: "Insurance Verification Time", target: "≤1 hour", unit: "hours" },
      ],
    },
  };

  // Look up by exact match, partial match, or return generic
  const direct = benchmarks[industry];
  if (direct) return direct;

  // Partial match
  for (const [key, value] of Object.entries(benchmarks)) {
    if (industry.includes(key) || key.includes(industry)) {
      return value;
    }
  }

  // Generic fallback
  return {
    kpis: [
      { name: "Process Cycle Time", target: "Reduce by 30%", unit: "percent" },
      { name: "Error Rate", target: "≤5%", unit: "percent" },
      { name: "Task Completion Rate", target: "≥90%", unit: "percent" },
      { name: "Response Time", target: "≤4 hours", unit: "hours" },
    ],
  };
}

// ---------------------------------------------------------------------------
// Tool Registry
// ---------------------------------------------------------------------------

/** All available agent tools. */
export const AGENT_TOOLS: AgentTool[] = [
  searchCaseStudiesTool,
  getIndustryBenchmarksTool,
  searchExistingPlansTool,
];

/**
 * Get tools available to a specific pipeline stage.
 */
export function getToolsForStage(stageKey: string): AgentTool[] {
  return AGENT_TOOLS.filter(
    (tool) =>
      !tool.allowedStages ||
      tool.allowedStages.length === 0 ||
      tool.allowedStages.includes(stageKey)
  );
}

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------

/**
 * Execute a tool by name with the given parameters.
 * Validates input against the tool's schema before execution.
 */
export async function executeTool(
  toolName: string,
  params: Record<string, unknown>
): Promise<ToolCallResult> {
  const tool = AGENT_TOOLS.find((t) => t.name === toolName);
  if (!tool) {
    return {
      tool: toolName,
      input: params,
      output: null,
      latencyMs: 0,
      error: `Tool not found: ${toolName}`,
    };
  }

  const validated = tool.inputSchema.safeParse(params);
  if (!validated.success) {
    return {
      tool: toolName,
      input: params,
      output: null,
      latencyMs: 0,
      error: `Invalid tool input: ${validated.error.issues.map((i) => i.message).join(", ")}`,
    };
  }

  const start = Date.now();
  try {
    const output = await tool.execute(validated.data as Record<string, unknown>);
    return {
      tool: toolName,
      input: params,
      output,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      tool: toolName,
      input: params,
      output: null,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Tool execution failed",
    };
  }
}

// ---------------------------------------------------------------------------
// Tool context injection
// ---------------------------------------------------------------------------

/**
 * Execute all available tools for a stage and format the results
 * as context that can be injected into the stage's prompt.
 *
 * This is the RAG (Retrieval-Augmented Generation) pattern —
 * grounding agent output in real data.
 */
export async function getToolContextForStage(
  stageKey: string,
  input: { industry: string; [key: string]: unknown }
): Promise<string> {
  const tools = getToolsForStage(stageKey);
  if (tools.length === 0) return "";

  const results = await Promise.all(
    tools.map((tool) =>
      executeTool(tool.name, { industry: input.industry }).catch(() => null)
    )
  );

  const validResults = results.filter(
    (r): r is ToolCallResult => r !== null && !r.error && r.output !== null
  );

  if (validResults.length === 0) return "";

  const parts = validResults.map(
    (r) =>
      `### Tool: ${r.tool}\n${JSON.stringify(r.output, null, 2)}`
  );

  return `\n---\n## Grounded context (from tool calls)\n${parts.join("\n\n")}\n---\n`;
}
