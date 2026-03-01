"use server";

import { getAdminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/auth";
import type { Experiment, ExperimentVariant } from "@/types/experiment";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";

async function requireAuth() {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function getAllExperiments(): Promise<Experiment[]> {
  await requireAuth();
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("experiments")
      .orderBy("created_at", "desc")
      .get();

    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Experiment);
  } catch {
    return [];
  }
}

export async function createExperiment(data: {
  name: string;
  target: string;
  variants: ExperimentVariant[];
}) {
  await requireAuth();
  const db = getAdminDb();

  // Ensure only one running experiment per target
  const existing = await db
    .collection("experiments")
    .where("target", "==", data.target)
    .where("status", "==", "running")
    .get();

  if (!existing.empty) {
    throw new Error(`An experiment is already running for target "${data.target}"`);
  }

  await db.collection("experiments").add({
    ...data,
    status: "draft",
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  });

  revalidatePath("/admin/experiments");
}

export async function startExperiment(id: string) {
  await requireAuth();
  const db = getAdminDb();
  const doc = await db.collection("experiments").doc(id).get();
  const data = doc.data();

  if (!data) throw new Error("Experiment not found");

  // Check no other running experiment for same target
  const existing = await db
    .collection("experiments")
    .where("target", "==", data.target)
    .where("status", "==", "running")
    .get();

  if (!existing.empty) {
    throw new Error(`Another experiment is already running for target "${data.target}"`);
  }

  await db.collection("experiments").doc(id).update({
    status: "running",
    updated_at: FieldValue.serverTimestamp(),
  });

  revalidatePath("/admin/experiments");
}

export async function completeExperiment(id: string, winner: string) {
  await requireAuth();
  const db = getAdminDb();

  await db.collection("experiments").doc(id).update({
    status: "completed",
    winner,
    updated_at: FieldValue.serverTimestamp(),
  });

  revalidatePath("/admin/experiments");
}

export async function deleteExperiment(id: string) {
  await requireAuth();
  const db = getAdminDb();
  await db.collection("experiments").doc(id).delete();
  revalidatePath("/admin/experiments");
}
