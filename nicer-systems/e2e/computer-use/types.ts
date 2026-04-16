/**
 * Shape definitions for the computer-use scenario harness.
 *
 * Aligned with `docs/AGENT_COMPUTER_USE_RUNBOOKS.md` (Shared Scoring Sheet)
 * and `docs/AGENT_COMPUTER_USE_EVAL_CRITERIA.md` (Primary Evaluation Dimensions).
 */

export type ScoreValue = 0 | 1 | 2 | null;

export interface ScoringDimensions {
  /** Did it finish the intended user goal without manual help? */
  goal_completion: ScoreValue;
  /** Were actions based on visible UI state rather than brittle assumptions? */
  ui_grounding: ScoreValue;
  /** Correct input method, correct target, no duplicate sends. */
  interaction_correctness: ScoreValue;
  /** Waited through streaming/loading without racing the UI. */
  async_handling: ScoreValue;
  /** Bounded, intentional recovery. */
  recovery: ScoreValue;
  /** Action count within the optimal path estimate. */
  efficiency: ScoreValue;
}

export interface RunMetrics {
  success: boolean;
  time_to_complete_ms: number;
  actions_taken: number;
  optimal_action_estimate: [number, number];
  recovery_attempts: number;
  wrong_clicks_or_wrong_targets: number;
  validation_errors_triggered: number;
  stalls_or_timeouts: number;
  whether_human_intervention_was_needed: boolean;
  final_state_correctness: "correct" | "partial" | "incorrect" | "unknown";
}

export interface Scorecard {
  runbook: string;
  scenario: string;
  started_at: string;
  finished_at: string;
  metrics: RunMetrics;
  dimensions: ScoringDimensions;
  /** 0–12 — sum of dimensions that received a numeric score. */
  total_score: number;
  /** "ready" | "brittle" | "not_reliable" — derived from total_score. */
  readiness: "ready" | "brittle" | "not_reliable";
  notes: string[];
}

export interface RunbookDef {
  id: string;
  title: string;
  start_url: string;
  optimal_action_estimate: [number, number];
}
