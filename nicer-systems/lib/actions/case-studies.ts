"use server";

import { getAdminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/auth";
import { caseStudySchema } from "@/lib/validation";
import type { CaseStudy } from "@/types/case-study";
import { revalidatePath } from "next/cache";

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
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as CaseStudy);
  } catch {
    return [];
  }
}

export async function createCaseStudy(
  data: unknown
): Promise<{ success: boolean; error?: string; id?: string }> {
  await requireAuth();
  const parsed = caseStudySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const db = getAdminDb();
  const now = new Date().toISOString();
  const ref = await db.collection("case_studies").add({
    ...parsed.data,
    thumbnail_url: parsed.data.thumbnail_url ?? "",
    created_at: now,
    updated_at: now,
  });

  revalidatePath("/admin/case-studies");
  revalidatePath("/");
  return { success: true, id: ref.id };
}

export async function updateCaseStudy(
  id: string,
  data: unknown
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const parsed = caseStudySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const db = getAdminDb();
  await db
    .collection("case_studies")
    .doc(id)
    .update({
      ...parsed.data,
      thumbnail_url: parsed.data.thumbnail_url ?? "",
      updated_at: new Date().toISOString(),
    });

  revalidatePath("/admin/case-studies");
  revalidatePath("/");
  return { success: true };
}

export async function deleteCaseStudy(
  id: string
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const db = getAdminDb();
  await db.collection("case_studies").doc(id).delete();
  revalidatePath("/admin/case-studies");
  revalidatePath("/");
  return { success: true };
}

export async function toggleCaseStudyPublished(
  id: string,
  is_published: boolean
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const db = getAdminDb();
  await db.collection("case_studies").doc(id).update({
    is_published,
    updated_at: new Date().toISOString(),
  });
  revalidatePath("/admin/case-studies");
  revalidatePath("/");
  return { success: true };
}

export async function reorderCaseStudies(
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const db = getAdminDb();
  const batch = db.batch();

  orderedIds.forEach((id, index) => {
    batch.update(db.collection("case_studies").doc(id), {
      sort_order: index,
      updated_at: new Date().toISOString(),
    });
  });

  await batch.commit();
  revalidatePath("/admin/case-studies");
  revalidatePath("/");
  return { success: true };
}
