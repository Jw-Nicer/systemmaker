import { getAdminDb } from "@/lib/firebase/admin";
import type { ABTest } from "@/types/ab-test";

export async function getActiveTests(): Promise<ABTest[]> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("ab_tests")
      .where("is_active", "==", true)
      .get();

    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ABTest);
  } catch {
    return [];
  }
}

export async function getActiveTestForPage(
  targetPage: string,
  element: string
): Promise<ABTest | null> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("ab_tests")
      .where("is_active", "==", true)
      .where("target_page", "==", targetPage)
      .where("element", "==", element)
      .limit(1)
      .get();

    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() } as ABTest;
  } catch {
    return null;
  }
}
