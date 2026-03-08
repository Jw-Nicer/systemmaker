"use server";

import { getAdminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/auth";
import type { LandingVariant } from "@/types/variant";
import { serializeDoc } from "@/lib/firestore/serialize";

export async function getVariantForPreview(id: string): Promise<LandingVariant | null> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const db = getAdminDb();
  const snap = await db.collection("variants").doc(id).get();
  if (!snap.exists) return null;

  return serializeDoc<LandingVariant>(snap);
}
