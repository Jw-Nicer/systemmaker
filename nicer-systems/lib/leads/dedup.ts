import { getAdminDb } from "@/lib/firebase/admin";

/**
 * Find an existing lead by email address.
 * Returns the lead ID and data if found, null otherwise.
 */
export async function findLeadByEmail(
  email: string
): Promise<{ id: string; data: Record<string, unknown> } | null> {
  if (!email?.trim()) return null;
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("leads")
      .where("email", "==", email.toLowerCase().trim())
      .orderBy("created_at", "desc")
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, data: doc.data() as Record<string, unknown> };
  } catch (err) {
    console.error("[leads] findLeadByEmail failed:", err);
    return null;
  }
}

/** Normalize email for consistent storage. */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}
