"use server";

import { getAdminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/auth";
import type { LandingVariant } from "@/types/variant";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";

async function requireAuth() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function getAllVariants(): Promise<LandingVariant[]> {
  await requireAuth();
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("variants")
      .orderBy("sort_order", "asc")
      .get();

    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as LandingVariant);
  } catch {
    return [];
  }
}

export async function createVariant(data: {
  slug: string;
  industry: string;
  headline: string;
  subheadline: string;
  cta_text: string;
  meta_title: string;
  meta_description: string;
  featured_industries: string[];
}) {
  await requireAuth();
  const db = getAdminDb();

  // Get next sort_order
  const snap = await db.collection("variants").orderBy("sort_order", "desc").limit(1).get();
  const nextOrder = snap.empty ? 0 : (snap.docs[0].data().sort_order || 0) + 1;

  await db.collection("variants").add({
    ...data,
    is_published: false,
    sort_order: nextOrder,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  });

  revalidatePath("/admin/variants");
}

export async function updateVariant(
  id: string,
  data: Partial<{
    slug: string;
    industry: string;
    headline: string;
    subheadline: string;
    cta_text: string;
    meta_title: string;
    meta_description: string;
    featured_industries: string[];
  }>
) {
  await requireAuth();
  const db = getAdminDb();

  await db.collection("variants").doc(id).update({
    ...data,
    updated_at: FieldValue.serverTimestamp(),
  });

  revalidatePath("/admin/variants");
}

export async function deleteVariant(id: string) {
  await requireAuth();
  const db = getAdminDb();
  await db.collection("variants").doc(id).delete();
  revalidatePath("/admin/variants");
}

export async function toggleVariantPublished(id: string, is_published: boolean) {
  await requireAuth();
  const db = getAdminDb();
  await db.collection("variants").doc(id).update({
    is_published,
    updated_at: FieldValue.serverTimestamp(),
  });
  revalidatePath("/admin/variants");
}

export async function reorderVariants(orderedIds: string[]) {
  await requireAuth();
  const db = getAdminDb();
  const batch = db.batch();

  orderedIds.forEach((id, index) => {
    batch.update(db.collection("variants").doc(id), { sort_order: index });
  });

  await batch.commit();
  revalidatePath("/admin/variants");
}
