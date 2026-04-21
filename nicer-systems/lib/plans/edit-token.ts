import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getAdminDb, FieldValue } from "@/lib/firebase/admin";

export function generateEditToken(): string {
  return randomBytes(24).toString("hex");
}

export function hashEditToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function verifyEditToken(token: string, hashes: unknown): boolean {
  if (!token || typeof token !== "string") return false;
  if (!Array.isArray(hashes) || hashes.length === 0) return false;

  const candidate = Buffer.from(hashEditToken(token), "hex");
  for (const stored of hashes) {
    if (typeof stored !== "string" || stored.length !== candidate.length * 2) {
      continue;
    }
    const storedBuf = Buffer.from(stored, "hex");
    if (storedBuf.length !== candidate.length) continue;
    if (timingSafeEqual(candidate, storedBuf)) return true;
  }
  return false;
}

/**
 * Mint a new edit token, append its hash to the plan doc's
 * `edit_token_hashes` array, and return the plaintext token.
 *
 * Used on cache-hit plan reuse so each distinct requester gets their
 * own token without invalidating tokens previously issued for the same plan.
 */
export async function mintEditTokenForPlan(planId: string): Promise<string> {
  const token = generateEditToken();
  const hash = hashEditToken(token);
  const db = getAdminDb();
  await db
    .collection("plans")
    .doc(planId)
    .update({
      edit_token_hashes: FieldValue.arrayUnion(hash),
    });
  return token;
}
