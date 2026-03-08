"use server";

import { getAdminDb, FieldValue } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/auth";
import { testimonialSchema } from "@/lib/validation";
import type { Testimonial } from "@/types/testimonial";
import { serializeDoc } from "@/lib/firestore/serialize";
import { revalidatePath, revalidateTag } from "next/cache";
import type { ActionResult } from "./types";

async function requireAuth() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function getAllTestimonials(): Promise<Testimonial[]> {
  await requireAuth();
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("testimonials")
      .orderBy("sort_order", "asc")
      .get();
    return snap.docs.map((doc) => serializeDoc<Testimonial>(doc));
  } catch (err) {
    console.error("[actions] getAllTestimonials failed:", err);
    return [];
  }
}

export async function createTestimonial(
  data: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAuth();
    const parsed = testimonialSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
    }

    const db = getAdminDb();
    const ref = await db.collection("testimonials").add({
      ...parsed.data,
      avatar_url: parsed.data.avatar_url ?? "",
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    revalidatePath("/admin/testimonials");
    revalidatePath("/");
    revalidateTag("testimonials", "max");
    return { success: true, id: ref.id };
  } catch (err) {
    console.error("[actions] createTestimonial failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to create testimonial" };
  }
}

export async function updateTestimonial(
  id: string,
  data: unknown
): Promise<ActionResult> {
  try {
    await requireAuth();
    const parsed = testimonialSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
    }

    const db = getAdminDb();
    await db
      .collection("testimonials")
      .doc(id)
      .update({
        ...parsed.data,
        avatar_url: parsed.data.avatar_url ?? "",
        updated_at: FieldValue.serverTimestamp(),
      });

    revalidatePath("/admin/testimonials");
    revalidatePath("/");
    revalidateTag("testimonials", "max");
    return { success: true };
  } catch (err) {
    console.error("[actions] updateTestimonial failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to update testimonial" };
  }
}

export async function deleteTestimonial(
  id: string
): Promise<ActionResult> {
  try {
    await requireAuth();
    const db = getAdminDb();
    await db.collection("testimonials").doc(id).delete();
    revalidatePath("/admin/testimonials");
    revalidatePath("/");
    revalidateTag("testimonials", "max");
    return { success: true };
  } catch (err) {
    console.error("[actions] deleteTestimonial failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete testimonial" };
  }
}

export async function toggleTestimonialPublished(
  id: string,
  is_published: boolean
): Promise<ActionResult> {
  try {
    await requireAuth();
    const db = getAdminDb();
    await db.collection("testimonials").doc(id).update({
      is_published,
      updated_at: FieldValue.serverTimestamp(),
    });
    revalidatePath("/admin/testimonials");
    revalidatePath("/");
    revalidateTag("testimonials", "max");
    return { success: true };
  } catch (err) {
    console.error("[actions] toggleTestimonialPublished failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to toggle testimonial" };
  }
}

export async function reorderTestimonials(
  orderedIds: string[]
): Promise<ActionResult> {
  try {
    await requireAuth();
    const db = getAdminDb();
    const batch = db.batch();

    orderedIds.forEach((id, index) => {
      batch.update(db.collection("testimonials").doc(id), {
        sort_order: index,
        updated_at: FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    revalidatePath("/admin/testimonials");
    revalidatePath("/");
    revalidateTag("testimonials", "max");
    return { success: true };
  } catch (err) {
    console.error("[actions] reorderTestimonials failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to reorder testimonials" };
  }
}
