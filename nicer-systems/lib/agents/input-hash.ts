/**
 * Stable hashing of agent pipeline inputs for plan deduplication.
 *
 * Two requests with the same normalized intake should hash to the same
 * 64-character hex digest so that `findRecentPlanByHash` can return a
 * cached plan instead of burning another 6-stage Gemini run.
 *
 * Normalization rules (intentionally aggressive — small wording diffs
 * should still hit the cache):
 *
 * - Lowercase
 * - Trim whitespace
 * - Collapse runs of whitespace into a single space
 * - Strip surrounding punctuation
 * - For tools: split on commas/whitespace, dedupe, sort
 * - Empty / "Unknown" / "Not specified" sentinels collapse to ""
 *
 * The hash includes only the fields the pipeline actually consumes
 * (industry, bottleneck, current_tools, urgency, volume). Lead identity,
 * UTM, experiment assignments, and timestamps are NOT part of the key —
 * if Acme A and Acme B both ask "we lose 30% of leads to email tag" in
 * the property-management space, they should share a plan.
 */
import { createHash } from "node:crypto";
import type { AgentRunInput } from "./runner";

const SENTINELS = new Set(["", "unknown", "not specified", "none", "n/a", "na"]);

function normalizeText(value: string | undefined | null): string {
  if (!value) return "";
  const lowered = value
    .toString()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^[\s.,;:!?\-]+|[\s.,;:!?\-]+$/g, "")
    .trim();
  return SENTINELS.has(lowered) ? "" : lowered;
}

function normalizeTools(value: string | undefined | null): string {
  if (!value) return "";
  // Check if the entire value is a sentinel before splitting.
  const whole = value.toString().toLowerCase().replace(/\s+/g, " ").trim();
  if (SENTINELS.has(whole)) return "";

  const parts = whole
    .split(/[,\n;]+|\s{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !SENTINELS.has(p));
  // Deduplicate then sort so insertion order doesn't change the hash.
  const unique = Array.from(new Set(parts));
  unique.sort();
  return unique.join(",");
}

export interface NormalizedAgentInput {
  industry: string;
  bottleneck: string;
  current_tools: string;
  urgency: string;
  volume: string;
}

export function normalizeAgentInput(
  input: AgentRunInput
): NormalizedAgentInput {
  return {
    industry: normalizeText(input.industry),
    bottleneck: normalizeText(input.bottleneck),
    current_tools: normalizeTools(input.current_tools),
    urgency: normalizeText(input.urgency),
    volume: normalizeText(input.volume),
  };
}

/**
 * Produce a stable SHA-256 hex digest from an AgentRunInput.
 *
 * Returns "" when the input is too thin to be worth caching against
 * (e.g. missing both industry and bottleneck) — callers should treat an
 * empty hash as "do not cache, do not look up".
 */
export function hashAgentInput(input: AgentRunInput): string {
  const normalized = normalizeAgentInput(input);
  if (!normalized.industry && !normalized.bottleneck) return "";

  // Stable JSON: keys are written in a fixed order (the field order of
  // NormalizedAgentInput) so the digest doesn't depend on object key
  // iteration order.
  const payload = [
    normalized.industry,
    normalized.bottleneck,
    normalized.current_tools,
    normalized.urgency,
    normalized.volume,
  ].join("\u0001"); // U+0001 is a delimiter that cannot appear in user text

  return createHash("sha256").update(payload).digest("hex");
}
