import { getAdminDb, FieldValue } from "@/lib/firebase/admin";
import type { StoredPlan } from "@/types/chat";
import type { PlanSectionType } from "@/types/chat";
import type { PreviewPlan } from "@/types/preview-plan";
import { applyRefinedSection } from "@/lib/plans/refinement";
import { scorePlanQuality } from "@/lib/agents/plan-quality";
import {
  generateEditToken,
  hashEditToken,
  mintEditTokenForPlan,
} from "@/lib/plans/edit-token";

/**
 * Plans are considered cache-eligible for this many milliseconds after
 * `created_at`. 24h matches the doc spec in PREVIEW_PLAN_DEVELOPMENT_PLAN.md
 * — long enough that an agency demo running the same input twice in a
 * day hits the cache, short enough that any prompt/template changes
 * applied via the admin editor naturally roll out within a day.
 */
export const PLAN_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function buildPlanRefinementUpdate(
  currentPlan: PreviewPlan,
  version: {
    version: number;
    section: PlanSectionType;
    content: unknown;
    feedback: string;
  }
) {
  const nextPlan = applyRefinedSection(currentPlan, version.section, version.content);

  return {
    preview_plan: nextPlan,
    version: version.version,
    versionEntry: {
      ...version,
      content: JSON.stringify(version.content),
      created_at: new Date().toISOString(),
    },
  };
}

export async function savePlan(params: {
  preview_plan: PreviewPlan;
  input_summary: { industry: string; bottleneck_summary: string };
  lead_id?: string | null;
  /** SHA-256 of the normalized AgentRunInput. Empty string skips dedup. */
  input_hash?: string;
}): Promise<{ id: string; edit_token: string }> {
  try {
    const db = getAdminDb();
    // JSON round-trip strips undefined values (Firestore rejects them)
    const cleanPlan = JSON.parse(JSON.stringify(params.preview_plan));
    const { score: heuristicScore } = scorePlanQuality(params.preview_plan);
    const editToken = generateEditToken();
    const docRef = await db.collection("plans").add({
      preview_plan: cleanPlan,
      input_summary: params.input_summary,
      lead_id: params.lead_id ?? null,
      input_hash: params.input_hash || null,
      heuristic_score: heuristicScore,
      created_at: FieldValue.serverTimestamp(),
      view_count: 0,
      is_public: true,
      version: 1,
      versions: [],
      edit_token_hashes: [hashEditToken(editToken)],
    });
    return { id: docRef.id, edit_token: editToken };
  } catch (error) {
    console.error("Failed to save plan:", error);
    throw new Error("Failed to save plan");
  }
}

/**
 * Issue a fresh edit token for an existing plan (e.g. a cache hit in
 * `findRecentPlanByHash`) so the new requester can refine without
 * invalidating tokens already issued to prior requesters.
 */
export async function issueEditTokenForPlan(planId: string): Promise<string> {
  return mintEditTokenForPlan(planId);
}

/**
 * Find a recent plan with the given input hash, if any.
 *
 * Looks for plans with `input_hash === hash` created within the last
 * PLAN_CACHE_TTL_MS milliseconds. Returns the most recent match (or
 * null if none / the lookup fails). Refined plans (`version > 1`) are
 * skipped — the cache should only return canonical, never-touched
 * generations.
 */
export async function findRecentPlanByHash(
  hash: string
): Promise<{ id: string; plan: PreviewPlan } | null> {
  if (!hash) return null;
  try {
    const db = getAdminDb();
    const cutoff = new Date(Date.now() - PLAN_CACHE_TTL_MS);
    const snap = await db
      .collection("plans")
      .where("input_hash", "==", hash)
      .where("created_at", ">=", cutoff)
      .orderBy("created_at", "desc")
      .limit(5)
      .get();

    for (const doc of snap.docs) {
      const data = doc.data();
      // Skip plans that have been refined — return only fresh generations.
      if (typeof data.version === "number" && data.version > 1) continue;
      const plan = data.preview_plan as PreviewPlan | undefined;
      if (!plan) continue;
      return { id: doc.id, plan };
    }
    return null;
  } catch (error) {
    // Missing index or other Firestore issue — fall back to no-cache.
    // This is non-fatal: callers will run the pipeline normally.
    console.warn("[plans] findRecentPlanByHash failed; skipping cache:", error);
    return null;
  }
}

export async function getPlanById(id: string): Promise<StoredPlan | null> {
  try {
    const db = getAdminDb();
    const doc = await db.collection("plans").doc(id).get();

    if (!doc.exists) return null;

    const data = doc.data()!;
    return {
      id: doc.id,
      ...data,
      created_at: data.created_at?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
    } as StoredPlan;
  } catch {
    return null;
  }
}

export async function incrementPlanViews(id: string): Promise<void> {
  try {
    const db = getAdminDb();
    await db.collection("plans").doc(id).update({
      view_count: FieldValue.increment(1),
    });
  } catch {
    // Non-critical — silently fail
  }
}

const MAX_PLAN_VERSIONS = 20;

export async function savePlanRefinement(
  planId: string,
  version: {
    section: PlanSectionType;
    content: unknown;
    feedback?: string;
  }
): Promise<void> {
  try {
    const db = getAdminDb();
    const docRef = db.collection("plans").doc(planId);

    await db.runTransaction(async (tx) => {
      const doc = await tx.get(docRef);
      if (!doc.exists) {
        throw new Error("Plan not found");
      }

      const data = doc.data() as {
        preview_plan?: PreviewPlan;
        version?: number;
        versions?: unknown[];
      };

      const currentPlan = data.preview_plan;
      if (!currentPlan) {
        throw new Error("Stored plan is missing preview_plan");
      }

      const nextVersion = typeof data.version === "number" ? data.version + 1 : 1;
      const update = buildPlanRefinementUpdate(currentPlan, {
        version: nextVersion,
        section: version.section,
        content: version.content,
        feedback: version.feedback ?? "",
      });

      const existingVersions = (data.versions ?? []) as unknown[];
      let versions = [...existingVersions, update.versionEntry];
      if (versions.length > MAX_PLAN_VERSIONS) {
        versions = versions.slice(-MAX_PLAN_VERSIONS);
      }

      tx.update(docRef, {
        preview_plan: update.preview_plan,
        version: update.version,
        versions,
      });
    });
  } catch (error) {
    console.error("Failed to save plan refinement:", error);
    throw new Error("Failed to save plan refinement");
  }
}
