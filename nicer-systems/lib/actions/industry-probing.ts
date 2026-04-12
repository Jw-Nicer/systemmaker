"use server";

import { getAdminDb, FieldValue } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/auth";
import { industryProbingSchema } from "@/lib/validation";
import type { IndustryProbing } from "@/types/industry-probing";
import { serializeDoc } from "@/lib/firestore/serialize";
import { invalidateIndustryProbingCache } from "@/lib/firestore/industry-probing";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "./types";

async function requireAuth() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function getAllIndustryProbings(): Promise<IndustryProbing[]> {
  await requireAuth();
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("industry_probing")
      .orderBy("sort_order", "asc")
      .get();
    return snap.docs.map((doc) => serializeDoc<IndustryProbing>(doc));
  } catch (err) {
    console.error("[actions] getAllIndustryProbings failed:", err);
    return [];
  }
}

export async function createIndustryProbing(
  data: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAuth();
    const parsed = industryProbingSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Validation failed",
      };
    }

    const db = getAdminDb();
    const ref = await db.collection("industry_probing").add({
      ...parsed.data,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    invalidateIndustryProbingCache();
    revalidatePath("/admin/industry-probing");
    return { success: true, id: ref.id };
  } catch (err) {
    console.error("[actions] createIndustryProbing failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create entry",
    };
  }
}

export async function updateIndustryProbing(
  id: string,
  data: unknown
): Promise<ActionResult> {
  try {
    await requireAuth();
    const parsed = industryProbingSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Validation failed",
      };
    }

    const db = getAdminDb();
    await db.collection("industry_probing").doc(id).update({
      ...parsed.data,
      updated_at: FieldValue.serverTimestamp(),
    });

    invalidateIndustryProbingCache();
    revalidatePath("/admin/industry-probing");
    return { success: true };
  } catch (err) {
    console.error("[actions] updateIndustryProbing failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update entry",
    };
  }
}

export async function deleteIndustryProbing(
  id: string
): Promise<ActionResult> {
  try {
    await requireAuth();
    const db = getAdminDb();
    await db.collection("industry_probing").doc(id).delete();
    invalidateIndustryProbingCache();
    revalidatePath("/admin/industry-probing");
    return { success: true };
  } catch (err) {
    console.error("[actions] deleteIndustryProbing failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete entry",
    };
  }
}

export async function reorderIndustryProbings(
  orderedIds: string[]
): Promise<ActionResult> {
  try {
    await requireAuth();
    const db = getAdminDb();
    const batch = db.batch();
    orderedIds.forEach((id, index) => {
      batch.update(db.collection("industry_probing").doc(id), {
        sort_order: index,
        updated_at: FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
    invalidateIndustryProbingCache();
    revalidatePath("/admin/industry-probing");
    return { success: true };
  } catch (err) {
    console.error("[actions] reorderIndustryProbings failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to reorder",
    };
  }
}

export async function toggleIndustryProbingPublished(
  id: string,
  is_published: boolean
): Promise<ActionResult> {
  try {
    await requireAuth();
    const db = getAdminDb();
    await db.collection("industry_probing").doc(id).update({
      is_published,
      updated_at: FieldValue.serverTimestamp(),
    });
    invalidateIndustryProbingCache();
    revalidatePath("/admin/industry-probing");
    return { success: true };
  } catch (err) {
    console.error("[actions] toggleIndustryProbingPublished failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to toggle entry",
    };
  }
}
