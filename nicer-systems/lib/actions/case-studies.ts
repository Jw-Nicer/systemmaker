"use server";

import { getAdminDb, FieldValue } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/auth";
import { caseStudySchema } from "@/lib/validation";
import type { CaseStudy } from "@/types/case-study";
import { serializeDoc } from "@/lib/firestore/serialize";
import { revalidatePath, revalidateTag } from "next/cache";
import { assertUniqueSlug } from "@/lib/firestore/slug-utils";
import type { ActionResult } from "./types";

async function requireAuth() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function getAllCaseStudies(): Promise<CaseStudy[]> {
  await requireAuth();
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("case_studies")
      .orderBy("sort_order", "asc")
      .get();
    return snap.docs.map((doc) => serializeDoc<CaseStudy>(doc));
  } catch (err) {
    console.error("[actions] getAllCaseStudies failed:", err);
    return [];
  }
}

export async function createCaseStudy(
  data: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAuth();
    const parsed = caseStudySchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
    }

    await assertUniqueSlug("case_studies", parsed.data.slug);

    const db = getAdminDb();
    const ref = await db.collection("case_studies").add({
      ...parsed.data,
      thumbnail_url: parsed.data.thumbnail_url ?? "",
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    revalidatePath("/admin/case-studies");
    revalidatePath("/");
    revalidateTag("case-studies", "max");
    return { success: true, id: ref.id };
  } catch (err) {
    console.error("[actions] createCaseStudy failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to create case study" };
  }
}

export async function updateCaseStudy(
  id: string,
  data: unknown
): Promise<ActionResult> {
  try {
    await requireAuth();
    const parsed = caseStudySchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
    }

    await assertUniqueSlug("case_studies", parsed.data.slug, id);

    const db = getAdminDb();
    await db
      .collection("case_studies")
      .doc(id)
      .update({
        ...parsed.data,
        thumbnail_url: parsed.data.thumbnail_url ?? "",
        updated_at: FieldValue.serverTimestamp(),
      });

    revalidatePath("/admin/case-studies");
    revalidatePath("/");
    revalidateTag("case-studies", "max");
    return { success: true };
  } catch (err) {
    console.error("[actions] updateCaseStudy failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to update case study" };
  }
}

export async function deleteCaseStudy(
  id: string
): Promise<ActionResult> {
  try {
    await requireAuth();
    const db = getAdminDb();
    await db.collection("case_studies").doc(id).delete();
    revalidatePath("/admin/case-studies");
    revalidatePath("/");
    revalidateTag("case-studies", "max");
    return { success: true };
  } catch (err) {
    console.error("[actions] deleteCaseStudy failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete case study" };
  }
}

export async function toggleCaseStudyPublished(
  id: string,
  is_published: boolean
): Promise<ActionResult> {
  try {
    await requireAuth();
    const db = getAdminDb();
    await db.collection("case_studies").doc(id).update({
      is_published,
      updated_at: FieldValue.serverTimestamp(),
    });
    revalidatePath("/admin/case-studies");
    revalidatePath("/");
    revalidateTag("case-studies", "max");
    return { success: true };
  } catch (err) {
    console.error("[actions] toggleCaseStudyPublished failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to toggle case study" };
  }
}

export async function reorderCaseStudies(
  orderedIds: string[]
): Promise<ActionResult> {
  try {
    await requireAuth();
    const db = getAdminDb();
    const batch = db.batch();

    orderedIds.forEach((id, index) => {
      batch.update(db.collection("case_studies").doc(id), {
        sort_order: index,
        updated_at: FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    revalidatePath("/admin/case-studies");
    revalidatePath("/");
    revalidateTag("case-studies", "max");
    return { success: true };
  } catch (err) {
    console.error("[actions] reorderCaseStudies failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to reorder case studies" };
  }
}
