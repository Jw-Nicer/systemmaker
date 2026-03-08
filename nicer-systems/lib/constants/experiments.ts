/** Experiment targets that apply to the homepage. Single source of truth. */
export const EXPERIMENT_TARGETS = [
  "hero_headline",
  "hero_cta",
  "final_cta",
] as const;

export type ExperimentTarget = (typeof EXPERIMENT_TARGETS)[number];

export const VALID_EXPERIMENT_TARGETS = new Set<string>(EXPERIMENT_TARGETS);
