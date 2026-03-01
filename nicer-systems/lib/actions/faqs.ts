"use server";

import { getAdminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/auth";
import { faqSchema } from "@/lib/validation";
import type { FAQ } from "@/types/faq";
import { revalidatePath } from "next/cache";

async function requireAuth() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function getAllFAQs(): Promise<FAQ[]> {
  await requireAuth();
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("faqs")
      .orderBy("sort_order", "asc")
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as FAQ);
  } catch {
    return [];
  }
}

export async function createFAQ(
  data: unknown
): Promise<{ success: boolean; error?: string; id?: string }> {
  await requireAuth();
  const parsed = faqSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const db = getAdminDb();
  const now = new Date().toISOString();
  const ref = await db.collection("faqs").add({
    ...parsed.data,
    created_at: now,
    updated_at: now,
  });

  revalidatePath("/admin/faqs");
  revalidatePath("/");
  return { success: true, id: ref.id };
}

export async function updateFAQ(
  id: string,
  data: unknown
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const parsed = faqSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const db = getAdminDb();
  await db
    .collection("faqs")
    .doc(id)
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    });

  revalidatePath("/admin/faqs");
  revalidatePath("/");
  return { success: true };
}

export async function deleteFAQ(
  id: string
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const db = getAdminDb();
  await db.collection("faqs").doc(id).delete();
  revalidatePath("/admin/faqs");
  revalidatePath("/");
  return { success: true };
}

export async function toggleFAQPublished(
  id: string,
  is_published: boolean
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const db = getAdminDb();
  await db.collection("faqs").doc(id).update({
    is_published,
    updated_at: new Date().toISOString(),
  });
  revalidatePath("/admin/faqs");
  revalidatePath("/");
  return { success: true };
}

export async function reorderFAQs(
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const db = getAdminDb();
  const batch = db.batch();

  orderedIds.forEach((id, index) => {
    batch.update(db.collection("faqs").doc(id), {
      sort_order: index,
      updated_at: new Date().toISOString(),
    });
  });

  await batch.commit();
  revalidatePath("/admin/faqs");
  revalidatePath("/");
  return { success: true };
}
