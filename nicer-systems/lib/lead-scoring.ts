/**
 * Lead scoring algorithm.
 * Returns a score 0–100 based on engagement signals and lead data.
 */

interface LeadScoringInput {
  urgency?: string;
  has_bottleneck: boolean;
  has_tools: boolean;
  source: string;
  has_preview_plan: boolean;
}

const URGENCY_SCORES: Record<string, number> = {
  urgent: 30,
  high: 20,
  medium: 10,
  low: 5,
};

export function computeLeadScore(input: LeadScoringInput): number {
  let score = 0;

  // Base: every lead starts with 10
  score += 10;

  // Urgency signal (0–30)
  if (input.urgency) {
    score += URGENCY_SCORES[input.urgency] ?? 0;
  }

  // Provided a bottleneck description (+15)
  if (input.has_bottleneck) score += 15;

  // Provided current tools (+10)
  if (input.has_tools) score += 10;

  // Completed agent demo / received preview plan (+25)
  if (input.has_preview_plan) score += 25;

  // Source bonus: agent demo leads are warmer than contact form
  if (input.source === "agent_demo") score += 10;

  return Math.min(score, 100);
}

export function scoreLabel(score: number): string {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}
