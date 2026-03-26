import { getAdminDb, FieldValue } from "@/lib/firebase/admin";
import type { StoredPlan } from "@/types/chat";
import type { PlanSectionType } from "@/types/chat";
import type { PreviewPlan } from "@/types/preview-plan";
import { applyRefinedSection } from "@/lib/plans/refinement";

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
}): Promise<string> {
  try {
    const db = getAdminDb();
    // JSON round-trip strips undefined values (Firestore rejects them)
    const cleanPlan = JSON.parse(JSON.stringify(params.preview_plan));
    const docRef = await db.collection("plans").add({
      preview_plan: cleanPlan,
      input_summary: params.input_summary,
      lead_id: params.lead_id ?? null,
      created_at: FieldValue.serverTimestamp(),
      view_count: 0,
      is_public: true,
      version: 1,
      versions: [],
    });
    return docRef.id;
  } catch (error) {
    console.error("Failed to save plan:", error);
    throw new Error("Failed to save plan");
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
