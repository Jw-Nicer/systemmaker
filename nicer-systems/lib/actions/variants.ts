"use server";

import { getAdminDb, FieldValue } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/auth";
import type { LandingVariant } from "@/types/variant";
import { serializeDoc } from "@/lib/firestore/serialize";
import { revalidatePath, revalidateTag } from "next/cache";
import { assertUniqueSlug } from "@/lib/firestore/slug-utils";
import { variantSchema } from "@/lib/validation";
import type { ActionResult } from "./types";

async function requireAuth() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

function revalidateVariantSurfaces(slug?: string) {
  revalidatePath("/admin/variants");
  revalidateTag("variants", "max");

  if (slug) {
    revalidatePath(`/${slug}`);
  }
}

export async function getAllVariants(): Promise<LandingVariant[]> {
  await requireAuth();
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("variants")
      .orderBy("sort_order", "asc")
      .get();

    return snap.docs.map((doc) => serializeDoc<LandingVariant>(doc));
  } catch (err) {
    console.error("[actions] getAllVariants failed:", err);
    return [];
  }
}

export async function createVariant(data: unknown): Promise<ActionResult> {
  try {
    await requireAuth();
    const parsed = variantSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid variant data" };
    }
    const db = getAdminDb();
    await assertUniqueSlug("variants", parsed.data.slug);

    // Get next sort_order
    const snap = await db.collection("variants").orderBy("sort_order", "desc").limit(1).get();
    const nextOrder = snap.empty ? 0 : (snap.docs[0].data().sort_order || 0) + 1;

    await db.collection("variants").add({
      ...parsed.data,
      is_published: false,
      sort_order: nextOrder,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    revalidateVariantSurfaces(parsed.data.slug);
    return { success: true };
  } catch (err) {
    console.error("[actions] createVariant failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to create variant" };
  }
}

export async function updateVariant(
  id: string,
  data: unknown
): Promise<ActionResult> {
  try {
    await requireAuth();
    const parsed = variantSchema.partial().safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid variant data" };
    }
    const db = getAdminDb();
    const existing = await db.collection("variants").doc(id).get();
    const previousSlug = existing.data()?.slug as string | undefined;
    if (parsed.data.slug) {
      await assertUniqueSlug("variants", parsed.data.slug, id);
    }

    await db.collection("variants").doc(id).update({
      ...parsed.data,
      updated_at: FieldValue.serverTimestamp(),
    });

    revalidateVariantSurfaces(previousSlug);
    if (parsed.data.slug && parsed.data.slug !== previousSlug) {
      revalidateVariantSurfaces(parsed.data.slug);
    }
    return { success: true };
  } catch (err) {
    console.error("[actions] updateVariant failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to update variant" };
  }
}

export async function deleteVariant(
  id: string
): Promise<ActionResult> {
  try {
    await requireAuth();
    const db = getAdminDb();
    const existing = await db.collection("variants").doc(id).get();
    const previousSlug = existing.data()?.slug as string | undefined;
    await db.collection("variants").doc(id).delete();
    revalidateVariantSurfaces(previousSlug);
    return { success: true };
  } catch (err) {
    console.error("[actions] deleteVariant failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete variant" };
  }
}

export async function toggleVariantPublished(
  id: string,
  is_published: boolean
): Promise<ActionResult> {
  try {
    await requireAuth();
    const db = getAdminDb();
    const existing = await db.collection("variants").doc(id).get();
    const slug = existing.data()?.slug as string | undefined;
    await db.collection("variants").doc(id).update({
      is_published,
      updated_at: FieldValue.serverTimestamp(),
    });
    revalidateVariantSurfaces(slug);
    return { success: true };
  } catch (err) {
    console.error("[actions] toggleVariantPublished failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to toggle variant" };
  }
}

export async function reorderVariants(
  orderedIds: string[]
): Promise<ActionResult> {
  try {
    await requireAuth();
    const db = getAdminDb();
    const batch = db.batch();

    orderedIds.forEach((id, index) => {
      batch.update(db.collection("variants").doc(id), { sort_order: index });
    });

    await batch.commit();
    revalidateVariantSurfaces();
    return { success: true };
  } catch (err) {
    console.error("[actions] reorderVariants failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to reorder variants" };
  }
}
