import { getAdminDb, FieldValue } from "@/lib/firebase/admin";
import type { StoredPlan } from "@/types/chat";
import type { PreviewPlan } from "@/types/preview-plan";

export async function savePlan(params: {
  preview_plan: PreviewPlan;
  input_summary: { industry: string; bottleneck_summary: string };
  lead_id?: string | null;
}): Promise<string> {
  try {
    const db = getAdminDb();
    const docRef = await db.collection("plans").add({
      preview_plan: params.preview_plan,
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

export async function savePlanRefinement(
  planId: string,
  version: {
    version: number;
    section: string;
    content: string;
    feedback: string;
  }
): Promise<void> {
  try {
    const db = getAdminDb();
    await db
      .collection("plans")
      .doc(planId)
      .update({
        version: version.version,
        versions: FieldValue.arrayUnion({
          ...version,
          created_at: new Date().toISOString(),
        }),
      });
  } catch (error) {
    console.error("Failed to save plan refinement:", error);
    throw new Error("Failed to save plan refinement");
  }
}
