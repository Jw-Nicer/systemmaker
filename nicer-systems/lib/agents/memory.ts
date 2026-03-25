/**
 * Agent Episodic Memory — cross-session context for returning visitors.
 *
 * When a visitor returns (identified by email), the agent can recall:
 * - Their industry and previous bottleneck
 * - Prior plans generated and their quality
 * - Interaction history (what they refined, what they asked about)
 * - Preferences (communication style, urgency patterns)
 *
 * Memory is stored in Firestore under the `agent_memory` collection.
 * Entries are keyed by normalized email hash for privacy.
 *
 * This enables:
 * - Personalized greetings: "Welcome back — last time we looked at your
 *   scheduling bottleneck. Want to continue from there?"
 * - Smarter recommendations: Avoid suggesting what was already tried
 * - Faster intake: Pre-fill known fields
 * - Relationship continuity across sessions
 */

import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentMemoryEntry {
  /** Hash of the visitor's email (privacy-preserving key). */
  visitorId: string;
  /** The visitor's email (stored for lookup, not exposed to agent). */
  email: string;
  /** Visitor's name if known. */
  name?: string;
  /** Their industry. */
  industry?: string;
  /** Their last known bottleneck. */
  lastBottleneck?: string;
  /** IDs of plans generated for this visitor. */
  planIds: string[];
  /** Interaction history (last 20 interactions). */
  interactions: MemoryInteraction[];
  /** Learned preferences. */
  preferences: VisitorPreferences;
  /** Timestamp of first interaction. */
  firstSeenAt: number;
  /** Timestamp of most recent interaction. */
  lastSeenAt: number;
  /** Total number of sessions. */
  sessionCount: number;
}

export interface MemoryInteraction {
  timestamp: number;
  type:
    | "plan_generated"
    | "plan_refined"
    | "section_viewed"
    | "question_asked"
    | "email_captured"
    | "booking_requested";
  summary: string;
  metadata?: Record<string, unknown>;
}

export interface VisitorPreferences {
  /** Preferred urgency level (inferred from past interactions). */
  typicalUrgency?: string;
  /** Tools they've mentioned using. */
  knownTools?: string[];
  /** Topics they've asked about in follow-up. */
  topicsOfInterest?: string[];
  /** Whether they prefer detailed or concise plans. */
  detailPreference?: "detailed" | "concise";
}

export interface MemoryContext {
  /** Whether we have memory for this visitor. */
  isReturningVisitor: boolean;
  /** Summary string to inject into agent prompts. */
  contextSummary: string;
  /** Pre-filled fields from memory. */
  preFilled: {
    industry?: string;
    bottleneck?: string;
    current_tools?: string;
  };
  /** Raw memory entry (for advanced use). */
  entry?: AgentMemoryEntry;
}

// ---------------------------------------------------------------------------
// Visitor ID
// ---------------------------------------------------------------------------

/**
 * Create a privacy-preserving visitor ID from an email.
 * Uses SHA-256 hash — the actual email is stored separately.
 */
export function createVisitorId(email: string): string {
  const normalized = email.toLowerCase().trim();
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

// ---------------------------------------------------------------------------
// Memory operations
// ---------------------------------------------------------------------------

/**
 * Recall memory for a visitor by email.
 * Returns null if no memory exists.
 */
export async function recallVisitorContext(
  email: string
): Promise<MemoryContext> {
  if (!email?.trim()) {
    return { isReturningVisitor: false, contextSummary: "", preFilled: {} };
  }

  try {
    const { getAdminDb } = await import("@/lib/firebase/admin");
    const db = getAdminDb();
    const visitorId = createVisitorId(email);

    const doc = await db.collection("agent_memory").doc(visitorId).get();

    if (!doc.exists) {
      return { isReturningVisitor: false, contextSummary: "", preFilled: {} };
    }

    const entry = doc.data() as AgentMemoryEntry;

    // Build context summary for prompt injection
    const contextParts: string[] = [];

    if (entry.name) {
      contextParts.push(`Visitor name: ${entry.name}`);
    }
    if (entry.industry) {
      contextParts.push(`Known industry: ${entry.industry}`);
    }
    if (entry.lastBottleneck) {
      contextParts.push(
        `Previous bottleneck discussed: ${entry.lastBottleneck}`
      );
    }
    if (entry.planIds.length > 0) {
      contextParts.push(
        `Has ${entry.planIds.length} previous plan(s) on file`
      );
    }
    if (entry.sessionCount > 1) {
      contextParts.push(
        `This is session #${entry.sessionCount + 1} (returning visitor)`
      );
    }

    // Recent interactions
    const recent = entry.interactions.slice(-3);
    if (recent.length > 0) {
      const interactionSummary = recent
        .map((i) => `- ${i.type}: ${i.summary}`)
        .join("\n");
      contextParts.push(`Recent activity:\n${interactionSummary}`);
    }

    // Preferences
    if (entry.preferences.knownTools?.length) {
      contextParts.push(
        `Known tools: ${entry.preferences.knownTools.join(", ")}`
      );
    }

    return {
      isReturningVisitor: true,
      contextSummary: contextParts.join("\n"),
      preFilled: {
        industry: entry.industry,
        bottleneck: entry.lastBottleneck,
        current_tools: entry.preferences.knownTools?.join(", "),
      },
      entry,
    };
  } catch (err) {
    console.warn("[agent-memory] Failed to recall visitor context:", err);
    return { isReturningVisitor: false, contextSummary: "", preFilled: {} };
  }
}

/**
 * Store or update memory for a visitor.
 * Merges new data with existing memory (doesn't overwrite).
 */
export async function storeMemory(
  email: string,
  update: {
    name?: string;
    industry?: string;
    bottleneck?: string;
    planId?: string;
    interaction?: Omit<MemoryInteraction, "timestamp">;
    tools?: string[];
  }
): Promise<void> {
  if (!email?.trim()) return;

  try {
    const { getAdminDb } = await import("@/lib/firebase/admin");
    const db = getAdminDb();
    const visitorId = createVisitorId(email);
    const docRef = db.collection("agent_memory").doc(visitorId);

    await db.runTransaction(async (tx) => {
      const doc = await tx.get(docRef);
      const now = Date.now();

      if (!doc.exists) {
        // Create new entry
        const entry: AgentMemoryEntry = {
          visitorId,
          email: email.toLowerCase().trim(),
          name: update.name,
          industry: update.industry,
          lastBottleneck: update.bottleneck,
          planIds: update.planId ? [update.planId] : [],
          interactions: update.interaction
            ? [{ ...update.interaction, timestamp: now }]
            : [],
          preferences: {
            knownTools: update.tools,
          },
          firstSeenAt: now,
          lastSeenAt: now,
          sessionCount: 1,
        };
        tx.set(docRef, entry);
        return;
      }

      // Update existing entry
      const existing = doc.data() as AgentMemoryEntry;
      const updates: Record<string, unknown> = {
        lastSeenAt: now,
        sessionCount: existing.sessionCount + 1,
      };

      if (update.name) updates.name = update.name;
      if (update.industry) updates.industry = update.industry;
      if (update.bottleneck) updates.lastBottleneck = update.bottleneck;

      if (update.planId && !existing.planIds.includes(update.planId)) {
        updates.planIds = [...existing.planIds, update.planId].slice(-10);
      }

      if (update.interaction) {
        const interactions = [
          ...existing.interactions,
          { ...update.interaction, timestamp: now },
        ].slice(-20); // Keep last 20
        updates.interactions = interactions;
      }

      if (update.tools) {
        const knownTools = [
          ...new Set([
            ...(existing.preferences.knownTools ?? []),
            ...update.tools,
          ]),
        ].slice(0, 20);
        updates["preferences.knownTools"] = knownTools;
      }

      tx.update(docRef, updates);
    });
  } catch (err) {
    console.warn("[agent-memory] Failed to store memory:", err);
  }
}

/**
 * Record a specific interaction in memory.
 * Convenience wrapper around storeMemory().
 */
export async function recordInteraction(
  email: string,
  type: MemoryInteraction["type"],
  summary: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  return storeMemory(email, {
    interaction: { type, summary, metadata },
  });
}

/**
 * Build a prompt section for memory context injection.
 * Returns empty string if no memory exists.
 */
export function buildMemoryPromptSection(context: MemoryContext): string {
  if (!context.isReturningVisitor || !context.contextSummary) return "";

  return `
---
## Returning visitor context (from agent memory)
${context.contextSummary}

Use this context to personalize your response:
- Greet them by name if known
- Reference their industry without re-asking
- Acknowledge their previous plan if they generated one
- Pre-fill fields you already know (but confirm they're still accurate)
- Do NOT repeat questions about information you already have
---`;
}
