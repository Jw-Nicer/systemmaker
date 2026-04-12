/**
 * IndustryProbing — per-industry context that grounds the chat agent's
 * gathering and confirming prompts. Stored in Firestore under
 * `industry_probing` so we can grow the list without redeploying.
 *
 * The hardcoded INDUSTRY_PROBING_FALLBACK in lib/agents/conversation.ts
 * remains as a safety net for when Firestore is unreachable or empty.
 */
export interface IndustryProbing {
  /** Firestore document id (assigned automatically). */
  id: string;
  /** Lowercase normalized key, e.g. "construction" or "property management". */
  slug: string;
  /** Human-readable name shown in admin UI. */
  display_name: string;
  /** Common bottlenecks the agent can reference. */
  common_bottlenecks: string[];
  /** Common tools used in this industry. */
  common_tools: string[];
  /** Probing angles the agent can ask one-by-one. */
  probing_angles: string[];
  /** Alternative names that should map to this industry (e.g., "plumbing" → "home services"). */
  aliases: string[];
  /** When false, the agent ignores this entry. */
  is_published: boolean;
  /** Admin sort order (lower = earlier). */
  sort_order: number;
  /** ISO timestamp. */
  created_at?: string;
  /** ISO timestamp. */
  updated_at?: string;
}
