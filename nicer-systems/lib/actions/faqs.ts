"use server";

import { getAdminDb, FieldValue } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/auth";
import { faqSchema } from "@/lib/validation";
import type { FAQ } from "@/types/faq";
import { serializeDoc } from "@/lib/firestore/serialize";
import { revalidatePath, revalidateTag } from "next/cache";
import type { ActionResult } from "./types";

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
    return snap.docs.map((doc) => serializeDoc<FAQ>(doc));
  } catch (err) {
    console.error("[actions] getAllFAQs failed:", err);
    return [];
  }
}

export async function createFAQ(
  data: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAuth();
    const parsed = faqSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
    }

    const db = getAdminDb();
    const ref = await db.collection("faqs").add({
      ...parsed.data,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    revalidatePath("/admin/faqs");
    revalidatePath("/");
    revalidateTag("faqs", "max");
    return { success: true, id: ref.id };
  } catch (err) {
    console.error("[actions] createFAQ failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to create FAQ" };
  }
}

export async function updateFAQ(
  id: string,
  data: unknown
): Promise<ActionResult> {
  try {
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
        updated_at: FieldValue.serverTimestamp(),
      });

    revalidatePath("/admin/faqs");
    revalidatePath("/");
    revalidateTag("faqs", "max");
    return { success: true };
  } catch (err) {
    console.error("[actions] updateFAQ failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to update FAQ" };
  }
}

export async function deleteFAQ(
  id: string
): Promise<ActionResult> {
  try {
    await requireAuth();
    const db = getAdminDb();
    await db.collection("faqs").doc(id).delete();
    revalidatePath("/admin/faqs");
    revalidatePath("/");
    revalidateTag("faqs", "max");
    return { success: true };
  } catch (err) {
    console.error("[actions] deleteFAQ failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete FAQ" };
  }
}

export async function toggleFAQPublished(
  id: string,
  is_published: boolean
): Promise<ActionResult> {
  try {
    await requireAuth();
    const db = getAdminDb();
    await db.collection("faqs").doc(id).update({
      is_published,
      updated_at: FieldValue.serverTimestamp(),
    });
    revalidatePath("/admin/faqs");
    revalidatePath("/");
    revalidateTag("faqs", "max");
    return { success: true };
  } catch (err) {
    console.error("[actions] toggleFAQPublished failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to toggle FAQ" };
  }
}

export async function reorderFAQs(
  orderedIds: string[]
): Promise<ActionResult> {
  try {
    await requireAuth();
    const db = getAdminDb();
    const batch = db.batch();

    orderedIds.forEach((id, index) => {
      batch.update(db.collection("faqs").doc(id), {
        sort_order: index,
        updated_at: FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    revalidatePath("/admin/faqs");
    revalidatePath("/");
    revalidateTag("faqs", "max");
    return { success: true };
  } catch (err) {
    console.error("[actions] reorderFAQs failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to reorder FAQs" };
  }
}
