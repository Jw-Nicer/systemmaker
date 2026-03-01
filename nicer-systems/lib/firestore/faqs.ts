import { getAdminDb } from "@/lib/firebase/admin";
import type { FAQ } from "@/types/faq";

export async function getPublishedFAQs(): Promise<FAQ[]> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("faqs")
      .where("is_published", "==", true)
      .orderBy("sort_order", "asc")
      .get();

    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as FAQ);
  } catch {
    // Index may not exist yet or collection is empty
    return [];
  }
}
