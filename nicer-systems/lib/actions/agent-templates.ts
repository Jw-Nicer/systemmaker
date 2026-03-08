"use server";

import { getAdminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/auth";
import type { AgentTemplate } from "@/types/agent-template";
import { serializeDoc } from "@/lib/firestore/serialize";
import { revalidatePath } from "next/cache";
import {
  invalidateTemplateCache,
  runSingleAgent,
} from "@/lib/agents/runner";
import { templateUpdateSchema } from "@/lib/validation";
import type { ActionResult } from "./types";

async function requireAuth() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function getAllTemplates(): Promise<AgentTemplate[]> {
  await requireAuth();
  try {
    const db = getAdminDb();
    const snap = await db.collection("agent_templates").get();
    return snap.docs.map(
      (doc) => serializeDoc<AgentTemplate>(doc)
    );
  } catch (err) {
    console.error("[actions] getAllTemplates failed:", err);
    return [];
  }
}

export async function updateTemplate(
  id: string,
  markdown: string
): Promise<ActionResult> {
  try {
    await requireAuth();
    const parsed = templateUpdateSchema.safeParse({ markdown });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid template data" };
    }

    const db = getAdminDb();
    await db.collection("agent_templates").doc(id).update({
      markdown,
      updated_at: new Date().toISOString(),
    });

    invalidateTemplateCache();
    revalidatePath("/admin/agent-templates");
    return { success: true };
  } catch (err) {
    console.error("[actions] updateTemplate failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to update template" };
  }
}

export async function testRunTemplate(
  templateKey: string,
  sampleInput: Record<string, unknown>
): Promise<ActionResult<{ output: unknown }>> {
  try {
    await requireAuth();
    const output = await runSingleAgent(templateKey, sampleInput);
    return { success: true, output };
  } catch (err) {
    console.error("[actions] testRunTemplate failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Test run failed",
    };
  }
}
