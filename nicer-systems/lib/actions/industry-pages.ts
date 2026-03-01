"use server";

import { getAdminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/auth";
import { industryPageSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import type { IndustryPage } from "@/types/industry-page";

async function requireAuth() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function getAllIndustryPages(): Promise<IndustryPage[]> {
  await requireAuth();
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("industry_pages")
      .orderBy("sort_order", "asc")
      .get();

    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate?.()
          ? data.created_at.toDate().toISOString()
          : data.created_at ?? new Date().toISOString(),
        updated_at: data.updated_at?.toDate?.()
          ? data.updated_at.toDate().toISOString()
          : data.updated_at ?? new Date().toISOString(),
      } as IndustryPage;
    });
  } catch {
    return [];
  }
}

export async function createIndustryPage(
  input: unknown
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const parsed = industryPageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const db = getAdminDb();
  await db.collection("industry_pages").add({
    ...parsed.data,
    created_at: new Date(),
    updated_at: new Date(),
  });

  revalidatePath("/admin/industry-pages");
  revalidatePath("/industries");
  return { success: true };
}

export async function updateIndustryPage(
  id: string,
  input: unknown
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const parsed = industryPageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const db = getAdminDb();
  await db.collection("industry_pages").doc(id).update({
    ...parsed.data,
    updated_at: new Date(),
  });

  revalidatePath("/admin/industry-pages");
  revalidatePath("/industries");
  return { success: true };
}

export async function deleteIndustryPage(
  id: string
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const db = getAdminDb();
  await db.collection("industry_pages").doc(id).delete();
  revalidatePath("/admin/industry-pages");
  revalidatePath("/industries");
  return { success: true };
}

export async function toggleIndustryPagePublished(
  id: string,
  is_published: boolean
): Promise<{ success: boolean }> {
  await requireAuth();
  const db = getAdminDb();
  await db.collection("industry_pages").doc(id).update({
    is_published,
    updated_at: new Date(),
  });
  revalidatePath("/admin/industry-pages");
  revalidatePath("/industries");
  return { success: true };
}
