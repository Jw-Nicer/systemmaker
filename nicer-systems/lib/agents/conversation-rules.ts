/**
 * Cross-phase rule registry for the conversational agent.
 *
 * Before this module, every phase prompt builder in `conversation.ts`
 * inlined its own copy of rules like "no filler phrases", "no JSON, no
 * markdown", and the per-phase sentence cap. The duplication made
 * prompt-tweak drift easy and made it impossible to correlate eval
 * failures with a specific rule.
 *
 * Now each shared rule is a first-class object with:
 *  - a stable `id` the eval suite can target
 *  - a `description` that gets injected into the prompt
 *  - an `appliesTo` list of phases that use it
 *  - optional `metadata` documenting why the rule exists
 *
 * Phase-specific rules (like "react with industry observation" in
 * gathering, or "reference SPECIFIC plan details" in follow_up) stay
 * inline in their respective builders — pulling them into the registry
 * would add indirection without obvious benefit.
 */
import type { ConversationPhase } from "@/types/chat";

export interface ConversationRule {
  /** Stable id used by eval-suite criteria and admin tooling. */
  id: string;
  /** The rule text injected into the prompt instructions list. */
  description: string;
  /** Phases that should include this rule. */
  appliesTo: ConversationPhase[];
  metadata?: {
    /** Free-text explanation of why the rule exists. */
    why?: string;
    /** ISO date the rule was added or last revised. */
    addedAt?: string;
  };
}

/**
 * Cross-phase rules — applied via `getSharedRulesForPhase()` from each
 * phase prompt builder. Order here is the order they appear in the
 * generated prompt's instruction list (after the phase-specific rules).
 */
export const CONVERSATION_RULES: ConversationRule[] = [
  {
    id: "max-sentences-gathering",
    description:
      "Keep every response to 2-3 sentences max. Sound like a sharp consultant, not a chatbot.",
    appliesTo: ["gathering"],
    metadata: {
      why: "Brand voice: brief, direct, on-topic",
      addedAt: "2026-04-10",
    },
  },
  {
    id: "max-sentences-confirming",
    description:
      "Keep total response to 3-4 sentences. Sound like a consultant who has seen this problem before.",
    appliesTo: ["confirming"],
    metadata: {
      why: "Brand voice: enough room to add insight, no padding",
      addedAt: "2026-04-10",
    },
  },
  {
    id: "max-sentences-follow_up",
    description: "Keep responses to 3-5 sentences. Be specific, not generic.",
    appliesTo: ["follow_up"],
    metadata: {
      why: "Plan Q&A needs specificity but should not ramble",
      addedAt: "2026-04-10",
    },
  },
  {
    id: "no-filler",
    description:
      'Never say "Great question" or "That\'s a great point" or "I\'m glad you asked" or any filler phrase. Just answer directly.',
    appliesTo: ["gathering", "confirming", "follow_up"],
    metadata: {
      why: "Brand voice: clear, confident, no hype",
      addedAt: "2026-04-10",
    },
  },
  {
    id: "no-markdown-leak",
    description:
      "Respond ONLY with your conversational message. No JSON, no markdown headers, no bullet lists.",
    appliesTo: ["gathering", "confirming", "follow_up"],
    metadata: {
      why: "Output format consistency — chat UI renders plain text only",
      addedAt: "2026-04-10",
    },
  },
];

/**
 * Get the descriptions of all shared rules that apply to a given phase,
 * in the order they should appear in the prompt's instruction list. The
 * caller concatenates these with its phase-specific instructions and
 * numbers them together.
 */
export function getSharedRulesForPhase(phase: ConversationPhase): string[] {
  return CONVERSATION_RULES.filter((r) => r.appliesTo.includes(phase)).map(
    (r) => r.description
  );
}

/**
 * Lookup a rule by id. Used by the eval suite to correlate failures with
 * specific rules and by future admin tooling.
 */
export function getRuleById(id: string): ConversationRule | undefined {
  return CONVERSATION_RULES.find((r) => r.id === id);
}

/**
 * Get every rule id that applies to a phase. Used by the eval suite to
 * dynamically discover which rules a response should respect.
 */
export function getRuleIdsForPhase(phase: ConversationPhase): string[] {
  return CONVERSATION_RULES.filter((r) => r.appliesTo.includes(phase)).map(
    (r) => r.id
  );
}
