"use server";

import { getAdminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/auth";
import type { AgentTemplate } from "@/types/agent-template";
import { revalidatePath } from "next/cache";
import { runSingleAgent } from "@/lib/agents/runner";

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
      (doc) => ({ id: doc.id, ...doc.data() }) as AgentTemplate
    );
  } catch {
    return [];
  }
}

export async function updateTemplate(
  id: string,
  markdown: string
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  if (!markdown.trim()) {
    return { success: false, error: "Template cannot be empty" };
  }

  const db = getAdminDb();
  await db.collection("agent_templates").doc(id).update({
    markdown,
    updated_at: new Date().toISOString(),
  });

  revalidatePath("/admin/agent-templates");
  return { success: true };
}

export async function testRunTemplate(
  templateKey: string,
  sampleInput: Record<string, unknown>
): Promise<{ success: boolean; output?: unknown; error?: string }> {
  await requireAuth();

  try {
    const output = await runSingleAgent(templateKey, sampleInput);
    return { success: true, output };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Test run failed",
    };
  }
}
