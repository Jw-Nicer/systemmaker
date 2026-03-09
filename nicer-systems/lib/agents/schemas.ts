/**
 * Centralized Zod schemas for agent pipeline outputs.
 * Single source of truth — used by runner.ts validation and sendEmailSchema in validation.ts.
 */
import { z } from "zod";

/** Priority levels used across actions and alerts. */
const priorityEnum = z.enum(["high", "medium", "low"]);

// --- Intake Agent ---

export const intakeOutputSchema = z.object({
  clarified_problem: z.string().min(20).max(5000),
  assumptions: z.array(z.string().min(10).max(1000)).min(1).max(10),
  constraints: z.array(z.string().min(10).max(1000)).min(1).max(10),
  suggested_scope: z.string().min(10).max(5000),
});

// --- Workflow Mapper ---

export const workflowStageSchema = z.object({
  name: z.string().min(3).max(500),
  owner_role: z.string().min(3).max(500),
  entry_criteria: z.string().min(10).max(2000),
  exit_criteria: z.string().min(10).max(2000),
});

export const workflowMapperOutputSchema = z.object({
  stages: z.array(workflowStageSchema).min(3).max(12),
  required_fields: z.array(z.string().min(2).max(500)).min(3).max(30),
  timestamps: z.array(z.string().min(2).max(500)).min(2).max(20),
  failure_modes: z.array(z.string().min(10).max(1000)).min(2).max(15),
});

// --- Automation Designer ---

export const automationDesignerOutputSchema = z.object({
  automations: z.array(
    z.object({
      trigger: z.string().min(10).max(1000),
      steps: z.array(z.string().min(5).max(500)).min(1).max(20),
      data_required: z.array(z.string().min(2).max(500)).min(1).max(20),
      error_handling: z.string().min(10).max(1000),
    })
  ).min(1).max(30),
  alerts: z.array(
    z.object({
      when: z.string().min(10).max(1000),
      who: z.string().min(3).max(500),
      message: z.string().min(10).max(1000),
      escalation: z.string().min(10).max(1000),
    })
  ).min(1).max(20),
  logging_plan: z.array(
    z.object({
      what_to_log: z.string().min(3).max(500),
      where: z.string().min(3).max(500),
      how_to_review: z.string().min(5).max(500),
    })
  ).min(1).max(20),
});

// --- Dashboard Designer ---

export const dashboardDesignerOutputSchema = z.object({
  dashboards: z.array(
    z.object({
      name: z.string().min(3).max(500),
      purpose: z.string().min(10).max(1000),
      widgets: z.array(z.string().min(5).max(500)).min(1).max(20),
    })
  ).min(1).max(10),
  kpis: z.array(
    z.object({
      name: z.string().min(3).max(500),
      definition: z.string().min(20).max(1500),
      why_it_matters: z.string().min(10).max(1000),
    })
  ).min(3).max(20),
  views: z.array(
    z.object({
      name: z.string().min(3).max(500),
      filter: z.string().min(3).max(500),
      columns: z.array(z.string().min(2).max(500)).min(2).max(20),
    })
  ).min(1).max(15),
});

// --- Ops Pulse Writer ---

export const executiveSummarySchema = z.object({
  problem: z.string().min(20).max(2000),
  solution: z.string().min(20).max(2000),
  impact: z.string().min(10).max(2000),
  next_step: z.string().min(10).max(2000),
});

export const opsPulseOutputSchema = z.object({
  executive_summary: executiveSummarySchema,
  sections: z.array(
    z.object({
      title: z.string().min(3).max(500),
      bullets: z.array(z.string().min(5).max(500)).min(1).max(20),
    })
  ).min(2).max(10),
  scorecard: z.array(z.string().min(5).max(500)).min(2).max(20),
  actions: z.array(
    z.object({
      priority: priorityEnum,
      owner_role: z.string().min(3).max(200),
      action: z.string().min(10).max(1000),
    })
  ).min(1).max(20),
  questions: z.array(z.string().min(10).max(1000)).min(1).max(10),
});

// --- Registry: template key → output schema ---

export const templateOutputSchemas: Partial<Record<string, z.ZodTypeAny>> = {
  intake_agent: intakeOutputSchema,
  workflow_mapper: workflowMapperOutputSchema,
  automation_designer: automationDesignerOutputSchema,
  dashboard_designer: dashboardDesignerOutputSchema,
  ops_pulse_writer: opsPulseOutputSchema,
};
