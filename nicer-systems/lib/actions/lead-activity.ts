"use server";

import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/auth";
import { leadNoteSchema } from "@/lib/validation";
import type { ActionResult } from "./types";

export interface LeadActivity {
  id: string;
  type: "note" | "status_change" | "email_sent";
  content: string;
  author?: string;
  created_at: string;
}

async function requireAuth() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function getLeadActivity(
  leadId: string
): Promise<LeadActivity[]> {
  await requireAuth();
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("leads")
      .doc(leadId)
      .collection("activity")
      .orderBy("created_at", "desc")
      .limit(50)
      .get();

    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type,
        content: data.content ?? "",
        author: data.author,
        created_at: data.created_at?.toDate?.()
          ? data.created_at.toDate().toISOString()
          : typeof data.created_at === "string"
            ? data.created_at
            : new Date().toISOString(),
      } as LeadActivity;
    });
  } catch (err) {
    console.error("[actions] getLeadActivity failed:", err);
    return [];
  }
}

export async function addLeadNote(
  leadId: string,
  content: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const parsed = leadNoteSchema.safeParse({ content });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid note" };
    }

    const db = getAdminDb();
    await db.collection("leads").doc(leadId).collection("activity").add({
      type: "note",
      content: parsed.data.content.trim(),
      author: user.email,
      created_at: new Date(),
    });

    revalidatePath(`/admin/leads/${leadId}`);
    return { success: true };
  } catch (err) {
    console.error("[actions] addLeadNote failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to add note" };
  }
}
