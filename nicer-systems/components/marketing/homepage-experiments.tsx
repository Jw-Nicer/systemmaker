"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import type { Experiment } from "@/types/experiment";
import { track, EVENTS } from "@/lib/analytics";
import { BrushRevealHero } from "@/components/marketing/BrushRevealHero";
import { FinalCTA } from "@/components/marketing/FinalCTA";
import { getResolvedExperimentValue } from "@/lib/experiments/runtime";
import {
  ensureAssignments,
  getStoredAssignments,
  syncExperimentAssignmentMetadata,
} from "@/lib/experiments/assignments";

function subscribeToAssignments(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange = () => onStoreChange();
  window.addEventListener("storage", handleChange);
  window.addEventListener("ns-exp-updated", handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener("ns-exp-updated", handleChange);
  };
}

const EMPTY_ASSIGNMENTS: Record<string, string> = {};

function shallowEqual(a: Record<string, string>, b: Record<string, string>) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => a[k] === b[k]);
}

function useHomepageAssignments(experiments: Experiment[]) {
  const cacheRef = useRef<Record<string, string>>(EMPTY_ASSIGNMENTS);

  const getSnapshot = useCallback(() => {
    const next = getStoredAssignments(experiments);
    if (shallowEqual(next, cacheRef.current)) return cacheRef.current;
    cacheRef.current = next;
    return next;
  }, [experiments]);

  const assignments = useSyncExternalStore<Record<string, string>>(
    subscribeToAssignments,
    getSnapshot,
    () => EMPTY_ASSIGNMENTS
  );

  useEffect(() => {
    if (typeof window === "undefined" || experiments.length === 0) return;
    const changed =
      ensureAssignments(experiments) ||
      syncExperimentAssignmentMetadata(experiments, getStoredAssignments(experiments));
    if (changed) {
      window.dispatchEvent(new Event("ns-exp-updated"));
    }
  }, [experiments]);

  useEffect(() => {
    if (typeof window === "undefined" || experiments.length === 0) return;
    if (syncExperimentAssignmentMetadata(experiments, assignments)) {
      window.dispatchEvent(new Event("ns-exp-updated"));
    }
  }, [assignments, experiments]);

  return assignments;
}

function getExperimentValue(
  experiments: Experiment[],
  assignments: Record<string, string>,
  target: string
) {
  const experiment = experiments.find((item) => item.target === target);
  return getResolvedExperimentValue(experiment, assignments[experiment?.id ?? ""]);
}

export function HomepageExperimentTracker({
  experiments,
}: {
  experiments: Experiment[];
}) {
  const assignments = useHomepageAssignments(experiments);

  useEffect(() => {
    if (typeof window === "undefined" || experiments.length === 0) return;
    if (Object.keys(assignments).length === 0) return;

    for (const experiment of experiments) {
      if (experiment.status !== "running") continue;
      const assignedKey = assignments[experiment.id];
      const variant = experiment.variants.find((item) => item.key === assignedKey);
      track(EVENTS.LANDING_EXPERIMENT_EXPOSURE, {
        experiment_id: experiment.id,
        experiment_name: experiment.name,
        target: experiment.target,
        variant_key: assignedKey,
        variant_label: variant?.label,
        landing_path: "/",
      });
    }
  }, [assignments, experiments]);

  return null;
}

export function HomepageExperimentHero({
  experiments,
}: {
  experiments: Experiment[];
}) {
  const assignments = useHomepageAssignments(experiments);

  return (
    <BrushRevealHero
      headline={getExperimentValue(experiments, assignments, "hero_headline")}
      ctaText={getExperimentValue(experiments, assignments, "hero_cta")}
    />
  );
}

export function HomepageExperimentFinalCTA({
  experiments,
}: {
  experiments: Experiment[];
}) {
  const assignments = useHomepageAssignments(experiments);

  return (
    <FinalCTA ctaText={getExperimentValue(experiments, assignments, "final_cta")} />
  );
}
