import { getAdminDb } from "@/lib/firebase/admin";
import type { Experiment } from "@/types/experiment";

export async function getRunningExperiments(): Promise<Experiment[]> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("experiments")
      .where("status", "==", "running")
      .get();

    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Experiment);
  } catch {
    return [];
  }
}

export async function getExperimentByTarget(
  target: string
): Promise<Experiment | null> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("experiments")
      .where("target", "==", target)
      .where("status", "==", "running")
      .limit(1)
      .get();

    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() } as Experiment;
  } catch {
    return null;
  }
}
