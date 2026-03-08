"use server";

import { getAdminDb, FieldValue } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/auth";
import { offerSchema } from "@/lib/validation";
import type { Offer } from "@/types/offer";
import { serializeDoc } from "@/lib/firestore/serialize";
import { revalidatePath, revalidateTag } from "next/cache";
import type { ActionResult } from "./types";

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
    return snap.docs.map((doc) => serializeDoc<Offer>(doc));
  } catch (err) {
    console.error("[actions] getAllOffers failed:", err);
    return [];
  }
}

export async function createOffer(
  data: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAuth();
    const parsed = offerSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
    }

    const db = getAdminDb();
    const ref = await db.collection("offers").add({
      ...parsed.data,
      is_published: parsed.data.is_published,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    revalidatePath("/admin/offers");
    revalidatePath("/");
    revalidateTag("offers", "max");
    return { success: true, id: ref.id };
  } catch (err) {
    console.error("[actions] createOffer failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to create offer" };
  }
}

export async function updateOffer(
  id: string,
  data: unknown
): Promise<ActionResult> {
  try {
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
        updated_at: FieldValue.serverTimestamp(),
      });

    revalidatePath("/admin/offers");
    revalidatePath("/");
    revalidateTag("offers", "max");
    return { success: true };
  } catch (err) {
    console.error("[actions] updateOffer failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to update offer" };
  }
}

export async function deleteOffer(
  id: string
): Promise<ActionResult> {
  try {
    await requireAuth();
    const db = getAdminDb();
    await db.collection("offers").doc(id).delete();
    revalidatePath("/admin/offers");
    revalidatePath("/");
    revalidateTag("offers", "max");
    return { success: true };
  } catch (err) {
    console.error("[actions] deleteOffer failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete offer" };
  }
}

export async function toggleOfferPublished(
  id: string,
  is_published: boolean
): Promise<ActionResult> {
  try {
    await requireAuth();
    const db = getAdminDb();
    await db.collection("offers").doc(id).update({
      is_published,
      updated_at: FieldValue.serverTimestamp(),
    });
    revalidatePath("/admin/offers");
    revalidatePath("/");
    revalidateTag("offers", "max");
    return { success: true };
  } catch (err) {
    console.error("[actions] toggleOfferPublished failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to toggle offer" };
  }
}

export async function reorderOffers(
  orderedIds: string[]
): Promise<ActionResult> {
  try {
    await requireAuth();
    const db = getAdminDb();
    const batch = db.batch();

    orderedIds.forEach((id, index) => {
      batch.update(db.collection("offers").doc(id), {
        sort_order: index,
        updated_at: FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    revalidatePath("/admin/offers");
    revalidatePath("/");
    revalidateTag("offers", "max");
    return { success: true };
  } catch (err) {
    console.error("[actions] reorderOffers failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to reorder offers" };
  }
}
