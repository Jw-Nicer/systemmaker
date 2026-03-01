"use server";

import { getAdminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/auth";
import { offerSchema } from "@/lib/validation";
import type { Offer } from "@/types/offer";
import { revalidatePath } from "next/cache";

async function requireAuth() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function getAllOffers(): Promise<Offer[]> {
  await requireAuth();
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("offers")
      .orderBy("sort_order", "asc")
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Offer);
  } catch {
    return [];
  }
}

export async function createOffer(
  data: unknown
): Promise<{ success: boolean; error?: string; id?: string }> {
  await requireAuth();
  const parsed = offerSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const db = getAdminDb();
  const now = new Date().toISOString();
  const ref = await db.collection("offers").add({
    ...parsed.data,
    is_published: parsed.data.is_published,
    created_at: now,
    updated_at: now,
  });

  revalidatePath("/admin/offers");
  revalidatePath("/");
  return { success: true, id: ref.id };
}

export async function updateOffer(
  id: string,
  data: unknown
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const parsed = offerSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const db = getAdminDb();
  await db
    .collection("offers")
    .doc(id)
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    });

  revalidatePath("/admin/offers");
  revalidatePath("/");
  return { success: true };
}

export async function deleteOffer(
  id: string
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const db = getAdminDb();
  await db.collection("offers").doc(id).delete();
  revalidatePath("/admin/offers");
  revalidatePath("/");
  return { success: true };
}

export async function toggleOfferPublished(
  id: string,
  is_published: boolean
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const db = getAdminDb();
  await db.collection("offers").doc(id).update({
    is_published,
    updated_at: new Date().toISOString(),
  });
  revalidatePath("/admin/offers");
  revalidatePath("/");
  return { success: true };
}

export async function reorderOffers(
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const db = getAdminDb();
  const batch = db.batch();

  orderedIds.forEach((id, index) => {
    batch.update(db.collection("offers").doc(id), {
      sort_order: index,
      updated_at: new Date().toISOString(),
    });
  });

  await batch.commit();
  revalidatePath("/admin/offers");
  revalidatePath("/");
  return { success: true };
}
