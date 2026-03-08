/**
 * Centralized Zod schemas for agent pipeline outputs.
 * Single source of truth — used by runner.ts validation and sendEmailSchema in validation.ts.
 */
import { z } from "zod";

const MAX_ARRAY_ITEMS = 50;

// --- Intake Agent ---

export const intakeOutputSchema = z.object({
  clarified_problem: z.string().min(1).max(5000),
  assumptions: z.array(z.string().max(1000)).max(MAX_ARRAY_ITEMS),
  constraints: z.array(z.string().max(1000)).max(MAX_ARRAY_ITEMS),
  suggested_scope: z.string().min(1).max(5000),
});

// --- Workflow Mapper ---

export const workflowStageSchema = z.object({
  name: z.string().min(1).max(500),
  owner_role: z.string().min(1).max(500),
  entry_criteria: z.string().min(1).max(1000),
  exit_criteria: z.string().min(1).max(1000),
});

export const workflowMapperOutputSchema = z.object({
  stages: z.array(workflowStageSchema).max(MAX_ARRAY_ITEMS),
  required_fields: z.array(z.string().max(500)).max(MAX_ARRAY_ITEMS),
  timestamps: z.array(z.string().max(500)).max(MAX_ARRAY_ITEMS),
  failure_modes: z.array(z.string().max(1000)).max(MAX_ARRAY_ITEMS),
});

// --- Automation Designer ---

export const automationDesignerOutputSchema = z.object({
  automations: z.array(
    z.object({
      trigger: z.string().min(1).max(1000),
      steps: z.array(z.string().max(500)).max(20),
      data_required: z.array(z.string().max(500)).max(20),
      error_handling: z.string().min(1).max(1000),
    })
  ).max(MAX_ARRAY_ITEMS),
  alerts: z.array(
    z.object({
      when: z.string().min(1).max(1000),
      who: z.string().min(1).max(500),
      message: z.string().min(1).max(1000),
      escalation: z.string().min(1).max(1000),
    })
  ).max(MAX_ARRAY_ITEMS),
  logging_plan: z.array(
    z.object({
      what_to_log: z.string().min(1).max(500),
      where: z.string().min(1).max(500),
      how_to_review: z.string().min(1).max(500),
    })
  ).max(MAX_ARRAY_ITEMS),
});

// --- Dashboard Designer ---

export const dashboardDesignerOutputSchema = z.object({
  dashboards: z.array(
    z.object({
      name: z.string().min(1).max(500),
      purpose: z.string().min(1).max(1000),
      widgets: z.array(z.string().max(500)).max(20),
    })
  ).max(MAX_ARRAY_ITEMS),
  kpis: z.array(
    z.object({
      name: z.string().min(1).max(500),
      definition: z.string().min(1).max(1000),
      why_it_matters: z.string().min(1).max(1000),
    })
  ).max(MAX_ARRAY_ITEMS),
  views: z.array(
    z.object({
      name: z.string().min(1).max(500),
      filter: z.string().min(1).max(500),
      columns: z.array(z.string().max(500)).max(20),
    })
  ).max(MAX_ARRAY_ITEMS),
});

// --- Ops Pulse Writer ---

export const opsPulseOutputSchema = z.object({
  sections: z.array(
    z.object({
      title: z.string().min(1).max(500),
      bullets: z.array(z.string().max(500)).max(20),
    })
  ).max(MAX_ARRAY_ITEMS),
  scorecard: z.array(z.string().max(500)).max(MAX_ARRAY_ITEMS),
  actions: z.array(
    z.object({
      priority: z.string().min(1).max(200),
      owner_role: z.string().min(1).max(200),
      action: z.string().min(1).max(1000),
    })
  ).max(MAX_ARRAY_ITEMS),
  questions: z.array(z.string().max(1000)).max(MAX_ARRAY_ITEMS),
});

// --- Registry: template key → output schema ---

export const templateOutputSchemas: Partial<Record<string, z.ZodTypeAny>> = {
  intake_agent: intakeOutputSchema,
  workflow_mapper: workflowMapperOutputSchema,
  automation_designer: automationDesignerOutputSchema,
  dashboard_designer: dashboardDesignerOutputSchema,
  ops_pulse_writer: opsPulseOutputSchema,
};
