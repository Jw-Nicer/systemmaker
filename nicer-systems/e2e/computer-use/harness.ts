/**
 * Scenario harness for computer-use release-gating runs.
 *
 * Wraps a Playwright Page so every action is counted and classified against
 * the runbook's `optimal_action_estimate`. Scorecards are written to
 * `test-results/computer-use/` as JSON.
 *
 * Usage inside a spec:
 *   const session = new TrackedSession(page, RUNBOOK_1);
 *   await session.goto(RUNBOOK_1.start_url);
 *   await session.click(page.getByRole("button", { name: "Send message" }), { what: "send-btn" });
 *   session.markGoalReached();
 *   await session.finalize();
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { Locator, Page } from "@playwright/test";
import type {
  RunbookDef,
  RunMetrics,
  Scorecard,
  ScoringDimensions,
  ScoreValue,
} from "./types";

interface ActionOpts {
  /** Short label for debugging (e.g. "send-btn", "industry-select"). */
  what: string;
  /** True when this action is part of a bounded recovery path. */
  recovery?: boolean;
}

const SCORECARD_DIR = path.join("test-results", "computer-use");

export class TrackedSession {
  private readonly startedAtMs = Date.now();
  private readonly startedAtIso = new Date().toISOString();
  private actionsTaken = 0;
  private recoveryAttempts = 0;
  private wrongTargets = 0;
  private validationErrors = 0;
  private stalls = 0;
  private humanIntervention = false;
  private goalReached = false;
  private finalState: RunMetrics["final_state_correctness"] = "unknown";
  private readonly notes: string[] = [];

  constructor(private readonly page: Page, private readonly runbook: RunbookDef) {}

  // ─── Tracked actions ────────────────────────────────────────────────

  async goto(url: string, opts?: { recovery?: boolean }) {
    this.actionsTaken++;
    if (opts?.recovery) this.recoveryAttempts++;
    await this.page.goto(url);
  }

  async click(locator: Locator, opts: ActionOpts) {
    this.actionsTaken++;
    if (opts.recovery) this.recoveryAttempts++;
    try {
      await locator.click({ timeout: 10_000 });
    } catch (err) {
      this.wrongTargets++;
      this.notes.push(`Click on "${opts.what}" failed — target not actionable.`);
      throw err;
    }
  }

  async fill(locator: Locator, value: string, opts: ActionOpts) {
    this.actionsTaken++;
    if (opts.recovery) this.recoveryAttempts++;
    try {
      await locator.fill(value, { timeout: 10_000 });
    } catch (err) {
      this.wrongTargets++;
      this.notes.push(`Fill on "${opts.what}" failed — target not actionable.`);
      throw err;
    }
  }

  async selectOption(locator: Locator, value: string, opts: ActionOpts) {
    this.actionsTaken++;
    if (opts.recovery) this.recoveryAttempts++;
    try {
      await locator.selectOption(value, { timeout: 10_000 });
    } catch (err) {
      this.wrongTargets++;
      this.notes.push(`Select on "${opts.what}" failed — target not actionable.`);
      throw err;
    }
  }

  // ─── Signals the spec feeds in ──────────────────────────────────────

  recordValidationError(detail: string) {
    this.validationErrors++;
    this.notes.push(`Validation error: ${detail}`);
  }

  recordStall(detail: string) {
    this.stalls++;
    this.notes.push(`Stall detected: ${detail}`);
  }

  recordHumanIntervention(reason: string) {
    this.humanIntervention = true;
    this.notes.push(`Human intervention: ${reason}`);
  }

  note(line: string) {
    this.notes.push(line);
  }

  markGoalReached() {
    this.goalReached = true;
  }

  markFinalState(state: RunMetrics["final_state_correctness"]) {
    this.finalState = state;
  }

  // ─── Finalization ───────────────────────────────────────────────────

  async finalize(scenarioLabel: string): Promise<Scorecard> {
    const metrics: RunMetrics = {
      success: this.goalReached && !this.humanIntervention,
      time_to_complete_ms: Date.now() - this.startedAtMs,
      actions_taken: this.actionsTaken,
      optimal_action_estimate: this.runbook.optimal_action_estimate,
      recovery_attempts: this.recoveryAttempts,
      wrong_clicks_or_wrong_targets: this.wrongTargets,
      validation_errors_triggered: this.validationErrors,
      stalls_or_timeouts: this.stalls,
      whether_human_intervention_was_needed: this.humanIntervention,
      final_state_correctness: this.goalReached ? this.finalState : "incorrect",
    };

    const dimensions = scoreDimensions(metrics);
    const total_score = sumScore(dimensions);
    const readiness = interpretScore(total_score, dimensions);

    const scorecard: Scorecard = {
      runbook: this.runbook.id,
      scenario: scenarioLabel,
      started_at: this.startedAtIso,
      finished_at: new Date().toISOString(),
      metrics,
      dimensions,
      total_score,
      readiness,
      notes: this.notes,
    };

    await writeScorecard(scorecard);
    return scorecard;
  }
}

// ─── Scoring ──────────────────────────────────────────────────────────

export function scoreDimensions(metrics: RunMetrics): ScoringDimensions {
  const [minOpt, maxOpt] = metrics.optimal_action_estimate;

  const goal_completion: ScoreValue = !metrics.success
    ? 0
    : metrics.whether_human_intervention_was_needed
      ? 1
      : 2;

  const ui_grounding: ScoreValue =
    metrics.wrong_clicks_or_wrong_targets === 0
      ? 2
      : metrics.wrong_clicks_or_wrong_targets <= 1
        ? 1
        : 0;

  const interaction_correctness: ScoreValue =
    metrics.wrong_clicks_or_wrong_targets === 0 && metrics.validation_errors_triggered === 0
      ? 2
      : metrics.wrong_clicks_or_wrong_targets + metrics.validation_errors_triggered <= 2
        ? 1
        : 0;

  const async_handling: ScoreValue =
    metrics.stalls_or_timeouts === 0 ? 2 : metrics.stalls_or_timeouts <= 1 ? 1 : 0;

  const recovery: ScoreValue =
    metrics.recovery_attempts === 0
      ? 2
      : metrics.recovery_attempts <= 1
        ? 1
        : 0;

  // Efficiency: within optimal band = 2, up to 1.5x upper = 1, worse = 0.
  const efficiency: ScoreValue =
    metrics.actions_taken <= maxOpt
      ? 2
      : metrics.actions_taken <= Math.ceil(maxOpt * 1.5)
        ? 1
        : 0;

  return {
    goal_completion,
    ui_grounding,
    interaction_correctness,
    async_handling,
    recovery,
    efficiency,
  };
}

export function sumScore(d: ScoringDimensions): number {
  return (
    toNumber(d.goal_completion) +
    toNumber(d.ui_grounding) +
    toNumber(d.interaction_correctness) +
    toNumber(d.async_handling) +
    toNumber(d.recovery) +
    toNumber(d.efficiency)
  );
}

export function interpretScore(
  total: number,
  dimensions?: ScoringDimensions
): Scorecard["readiness"] {
  // Goal failure is a veto on readiness — the runbook doc's pass bar for
  // Task Completion is "full completion", so a 0 here cannot roll up to ready.
  if (dimensions?.goal_completion === 0) return "not_reliable";
  if (total >= 10) return "ready";
  if (total >= 7) return "brittle";
  return "not_reliable";
}

function toNumber(v: ScoreValue): number {
  return v == null ? 0 : v;
}

// ─── Scorecard output ─────────────────────────────────────────────────

async function writeScorecard(scorecard: Scorecard) {
  await fs.mkdir(SCORECARD_DIR, { recursive: true });
  const stamp = scorecard.finished_at.replace(/[:.]/g, "-");
  const file = path.join(SCORECARD_DIR, `${scorecard.runbook}-${stamp}.json`);
  await fs.writeFile(file, JSON.stringify(scorecard, null, 2), "utf8");
}
