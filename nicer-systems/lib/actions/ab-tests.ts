"use server";

import { getAdminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/auth";
import { abTestSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import type { ABTest } from "@/types/ab-test";

async function requireAuth() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function getAllABTests(): Promise<ABTest[]> {
  await requireAuth();
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("ab_tests")
      .orderBy("created_at", "desc")
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
      } as ABTest;
    });
  } catch {
    return [];
  }
}

export async function createABTest(
  input: unknown
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const parsed = abTestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const db = getAdminDb();
  await db.collection("ab_tests").add({
    ...parsed.data,
    created_at: new Date(),
    updated_at: new Date(),
  });

  revalidatePath("/admin/ab-tests");
  return { success: true };
}

export async function updateABTest(
  id: string,
  input: unknown
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const parsed = abTestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const db = getAdminDb();
  await db.collection("ab_tests").doc(id).update({
    ...parsed.data,
    updated_at: new Date(),
  });

  revalidatePath("/admin/ab-tests");
  return { success: true };
}

export async function deleteABTest(
  id: string
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const db = getAdminDb();
  await db.collection("ab_tests").doc(id).delete();
  revalidatePath("/admin/ab-tests");
  return { success: true };
}

export async function toggleABTestActive(
  id: string,
  is_active: boolean
): Promise<{ success: boolean }> {
  await requireAuth();
  const db = getAdminDb();
  await db.collection("ab_tests").doc(id).update({
    is_active,
    updated_at: new Date(),
  });
  revalidatePath("/admin/ab-tests");
  return { success: true };
}

export async function recordImpression(
  testId: string,
  variantId: string
): Promise<void> {
  const db = getAdminDb();
  await db.collection("ab_impressions").add({
    test_id: testId,
    variant_id: variantId,
    created_at: new Date(),
  });
}

export async function recordConversion(
  testId: string,
  variantId: string,
  event: string
): Promise<void> {
  const db = getAdminDb();
  await db.collection("ab_conversions").add({
    test_id: testId,
    variant_id: variantId,
    event,
    created_at: new Date(),
  });
}

export async function getTestResults(testId: string): Promise<{
  variants: { id: string; name: string; impressions: number; conversions: number }[];
}> {
  await requireAuth();
  const db = getAdminDb();

  const [test, impressionsSnap, conversionsSnap] = await Promise.all([
    db.collection("ab_tests").doc(testId).get(),
    db.collection("ab_impressions").where("test_id", "==", testId).get(),
    db.collection("ab_conversions").where("test_id", "==", testId).get(),
  ]);

  const testData = test.data() as ABTest | undefined;
  if (!testData) return { variants: [] };

  const impressionCounts: Record<string, number> = {};
  impressionsSnap.forEach((doc) => {
    const vid = doc.data().variant_id;
    impressionCounts[vid] = (impressionCounts[vid] ?? 0) + 1;
  });

  const conversionCounts: Record<string, number> = {};
  conversionsSnap.forEach((doc) => {
    const vid = doc.data().variant_id;
    conversionCounts[vid] = (conversionCounts[vid] ?? 0) + 1;
  });

  return {
    variants: testData.variants.map((v) => ({
      id: v.id,
      name: v.name,
      impressions: impressionCounts[v.id] ?? 0,
      conversions: conversionCounts[v.id] ?? 0,
    })),
  };
}
