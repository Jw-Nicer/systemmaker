/** Experiment targets that apply to the homepage. Single source of truth. */
export const EXPERIMENT_TARGETS = [
  "hero_headline",
  "hero_cta",
  "final_cta",
] as const;

export type ExperimentTarget = (typeof EXPERIMENT_TARGETS)[number];

export const VALID_EXPERIMENT_TARGETS = new Set<string>(EXPERIMENT_TARGETS);

/**
 * Prefix for experiment targets that override agent prompt templates.
 * e.g. `agent_prompt:intake_agent` targets the intake_agent template.
 */
export const AGENT_PROMPT_EXPERIMENT_PREFIX = "agent_prompt:" as const;
