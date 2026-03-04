"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import type { Experiment } from "@/types/experiment";

/**
 * Client-side hook that assigns and persists an experiment variant.
 * Uses localStorage for sticky bucketing so users always see the same variant.
 */
export function useExperiment(experiment: Experiment | null): string | null {
  const [assignedVariant, setAssignedVariant] = useState<string | null>(null);

  useEffect(() => {
    if (!experiment || experiment.status !== "running") return;

    const storageKey = `exp_${experiment.id}`;
    const stored = localStorage.getItem(storageKey);

    if (stored && experiment.variants.some((v) => v.key === stored)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAssignedVariant(stored);
      return;
    }

    // Weighted random assignment
    const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
    let random = Math.random() * totalWeight;
    let chosen = experiment.variants[0].key;

    for (const variant of experiment.variants) {
      random -= variant.weight;
      if (random <= 0) {
        chosen = variant.key;
        break;
      }
    }

    localStorage.setItem(storageKey, chosen);
    setAssignedVariant(chosen);

    // Track assignment
    track("experiment_assigned" as never, {
      experiment_id: experiment.id,
      experiment_name: experiment.name,
      variant: chosen,
    });
  }, [experiment]);

  return assignedVariant;
}

/**
 * Get the variant value for the assigned variant key.
 */
export function getVariantValue(
  experiment: Experiment | null,
  assignedKey: string | null
): string | null {
  if (!experiment || !assignedKey) return null;
  const variant = experiment.variants.find((v) => v.key === assignedKey);
  return variant?.value ?? null;
}
