"use server";

import { getAdminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/auth";
import { emailSequenceSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import type { EmailSequence } from "@/types/email-sequence";

async function requireAuth() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function getAllEmailSequences(): Promise<EmailSequence[]> {
  await requireAuth();
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("email_sequences")
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
      } as EmailSequence;
    });
  } catch {
    return [];
  }
}

export async function createEmailSequence(
  input: unknown
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const parsed = emailSequenceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const db = getAdminDb();
  await db.collection("email_sequences").add({
    ...parsed.data,
    created_at: new Date(),
    updated_at: new Date(),
  });

  revalidatePath("/admin/email-sequences");
  return { success: true };
}

export async function updateEmailSequence(
  id: string,
  input: unknown
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const parsed = emailSequenceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const db = getAdminDb();
  await db.collection("email_sequences").doc(id).update({
    ...parsed.data,
    updated_at: new Date(),
  });

  revalidatePath("/admin/email-sequences");
  return { success: true };
}

export async function deleteEmailSequence(
  id: string
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const db = getAdminDb();
  await db.collection("email_sequences").doc(id).delete();
  revalidatePath("/admin/email-sequences");
  return { success: true };
}

export async function toggleEmailSequenceActive(
  id: string,
  is_active: boolean
): Promise<{ success: boolean }> {
  await requireAuth();
  const db = getAdminDb();
  await db.collection("email_sequences").doc(id).update({
    is_active,
    updated_at: new Date(),
  });
  revalidatePath("/admin/email-sequences");
  return { success: true };
}
