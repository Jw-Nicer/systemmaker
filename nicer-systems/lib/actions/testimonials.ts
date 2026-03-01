"use server";

import { getAdminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/auth";
import { testimonialSchema } from "@/lib/validation";
import type { Testimonial } from "@/types/testimonial";
import { revalidatePath } from "next/cache";

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
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Testimonial);
  } catch {
    return [];
  }
}

export async function createTestimonial(
  data: unknown
): Promise<{ success: boolean; error?: string; id?: string }> {
  await requireAuth();
  const parsed = testimonialSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const db = getAdminDb();
  const now = new Date().toISOString();
  const ref = await db.collection("testimonials").add({
    ...parsed.data,
    avatar_url: parsed.data.avatar_url ?? "",
    created_at: now,
    updated_at: now,
  });

  revalidatePath("/admin/testimonials");
  revalidatePath("/");
  return { success: true, id: ref.id };
}

export async function updateTestimonial(
  id: string,
  data: unknown
): Promise<{ success: boolean; error?: string }> {
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
      updated_at: new Date().toISOString(),
    });

  revalidatePath("/admin/testimonials");
  revalidatePath("/");
  return { success: true };
}

export async function deleteTestimonial(
  id: string
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const db = getAdminDb();
  await db.collection("testimonials").doc(id).delete();
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
  return { success: true };
}

export async function toggleTestimonialPublished(
  id: string,
  is_published: boolean
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const db = getAdminDb();
  await db.collection("testimonials").doc(id).update({
    is_published,
    updated_at: new Date().toISOString(),
  });
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
  return { success: true };
}

export async function reorderTestimonials(
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const db = getAdminDb();
  const batch = db.batch();

  orderedIds.forEach((id, index) => {
    batch.update(db.collection("testimonials").doc(id), {
      sort_order: index,
      updated_at: new Date().toISOString(),
    });
  });

  await batch.commit();
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
  return { success: true };
}
