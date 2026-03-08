import { getAdminDb } from "@/lib/firebase/admin";
import type { Experiment } from "@/types/experiment";
import { serializeDoc } from "./serialize";
import { EXPERIMENT_TARGETS } from "@/lib/constants/experiments";
import { unstable_cache } from "next/cache";

async function _getRunningExperiments(): Promise<Experiment[]> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("experiments")
      .where("status", "==", "running")
      .get();

    return snap.docs.map((doc) => serializeDoc<Experiment>(doc));
  } catch (err) {
    console.error("[firestore] getRunningExperiments failed:", err);
    return [];
  }
}

export const getRunningExperiments = unstable_cache(
  _getRunningExperiments,
  ["running-experiments"],
  { revalidate: 300, tags: ["experiments"] }
);

async function _getHomepageExperiments(): Promise<Experiment[]> {
  try {
    const db = getAdminDb();
    const snap = await db.collection("experiments").orderBy("updated_at", "desc").get();
    const experiments = snap.docs.map((doc) => serializeDoc<Experiment>(doc));
    const runningByTarget = new Map<string, Experiment>();
    const completedByTarget = new Map<string, Experiment>();

    for (const experiment of experiments) {
      if (!(EXPERIMENT_TARGETS as readonly string[]).includes(experiment.target)) {
        continue;
      }

      if (experiment.status === "running" && !runningByTarget.has(experiment.target)) {
        runningByTarget.set(experiment.target, experiment);
      }

      if (
        experiment.status === "completed"
        && experiment.winner
        && !completedByTarget.has(experiment.target)
      ) {
        completedByTarget.set(experiment.target, experiment);
      }
    }

    return EXPERIMENT_TARGETS.flatMap((target) => {
      const experiment = runningByTarget.get(target) ?? completedByTarget.get(target);
      return experiment ? [experiment] : [];
    });
  } catch (err) {
    console.error("[firestore] getHomepageExperiments failed:", err);
    return [];
  }
}

export const getHomepageExperiments = unstable_cache(
  _getHomepageExperiments,
  ["homepage-experiments"],
  { revalidate: 300, tags: ["experiments"] }
);

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
    return serializeDoc<Experiment>(snap.docs[0]);
  } catch (err) {
    console.error("[firestore] getExperimentByTarget failed:", err);
    return null;
  }
}
