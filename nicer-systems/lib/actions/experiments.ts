"use server";

import { getAdminDb, FieldValue } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/auth";
import { experimentConfigSchema } from "@/lib/validation";
import type { Experiment, ExperimentVariant } from "@/types/experiment";
import { serializeDoc } from "@/lib/firestore/serialize";
import { revalidatePath, revalidateTag } from "next/cache";
import type { ActionResult } from "./types";

async function requireAuth() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

function validateExperimentConfig(data: {
  name?: string;
  target: string;
  variants: ExperimentVariant[];
}) {
  const parsed = experimentConfigSchema.safeParse({
    name: data.name ?? "Untitled",
    target: data.target,
    variants: data.variants,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid experiment config");
  }
}

export async function getAllExperiments(): Promise<Experiment[]> {
  await requireAuth();
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("experiments")
      .orderBy("created_at", "desc")
      .get();

    return snap.docs.map((doc) => serializeDoc<Experiment>(doc));
  } catch (err) {
    console.error("[actions] getAllExperiments failed:", err);
    return [];
  }
}

export async function createExperiment(data: {
  name: string;
  target: string;
  variants: ExperimentVariant[];
}): Promise<ActionResult> {
  try {
    await requireAuth();
    const db = getAdminDb();
    validateExperimentConfig(data);

    // Ensure only one running experiment per target
    const existing = await db
      .collection("experiments")
      .where("target", "==", data.target)
      .where("status", "==", "running")
      .get();

    if (!existing.empty) {
      return { success: false, error: `An experiment is already running for target "${data.target}"` };
    }

    await db.collection("experiments").add({
      ...data,
      status: "draft",
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    revalidatePath("/admin/experiments");
    revalidatePath("/");
    revalidateTag("experiments", "max");
    return { success: true };
  } catch (err) {
    console.error("[actions] createExperiment failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to create experiment" };
  }
}

export async function startExperiment(
  id: string
): Promise<ActionResult> {
  try {
    await requireAuth();
    const db = getAdminDb();
    const doc = await db.collection("experiments").doc(id).get();
    const data = doc.data();

    if (!data) return { success: false, error: "Experiment not found" };
    validateExperimentConfig({
      target: data.target as string,
      variants: (data.variants as ExperimentVariant[]) ?? [],
    });

    // Check no other running experiment for same target
    const existing = await db
      .collection("experiments")
      .where("target", "==", data.target)
      .where("status", "==", "running")
      .get();

    if (!existing.empty) {
      return { success: false, error: `Another experiment is already running for target "${data.target}"` };
    }

    await db.collection("experiments").doc(id).update({
      status: "running",
      updated_at: FieldValue.serverTimestamp(),
    });

    revalidatePath("/admin/experiments");
    revalidatePath("/");
    revalidateTag("experiments", "max");
    return { success: true };
  } catch (err) {
    console.error("[actions] startExperiment failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to start experiment" };
  }
}

export async function completeExperiment(
  id: string,
  winner: string
): Promise<ActionResult> {
  try {
    await requireAuth();
    const db = getAdminDb();
    const doc = await db.collection("experiments").doc(id).get();
    const data = doc.data();

    if (!data) return { success: false, error: "Experiment not found" };
    const variants = (data.variants as ExperimentVariant[]) ?? [];
    if (!variants.some((variant) => variant.key === winner)) {
      return { success: false, error: "Selected winner is not part of this experiment" };
    }

    await db.collection("experiments").doc(id).update({
      status: "completed",
      winner,
      updated_at: FieldValue.serverTimestamp(),
    });

    revalidatePath("/admin/experiments");
    revalidatePath("/");
    revalidateTag("experiments", "max");
    return { success: true };
  } catch (err) {
    console.error("[actions] completeExperiment failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to complete experiment" };
  }
}

export async function stopExperiment(
  id: string
): Promise<ActionResult> {
  try {
    await requireAuth();
    const db = getAdminDb();
    const doc = await db.collection("experiments").doc(id).get();
    const data = doc.data();

    if (!data) return { success: false, error: "Experiment not found" };
    if (data.status !== "running") {
      return { success: false, error: "Only running experiments can be stopped" };
    }

    await db.collection("experiments").doc(id).update({
      status: "stopped",
      winner: FieldValue.delete(),
      updated_at: FieldValue.serverTimestamp(),
    });

    revalidatePath("/admin/experiments");
    revalidatePath("/");
    revalidateTag("experiments", "max");
    return { success: true };
  } catch (err) {
    console.error("[actions] stopExperiment failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to stop experiment" };
  }
}

export async function deleteExperiment(
  id: string
): Promise<ActionResult> {
  try {
    await requireAuth();
    const db = getAdminDb();
    await db.collection("experiments").doc(id).delete();
    revalidatePath("/admin/experiments");
    revalidatePath("/");
    revalidateTag("experiments", "max");
    return { success: true };
  } catch (err) {
    console.error("[actions] deleteExperiment failed:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete experiment" };
  }
}
