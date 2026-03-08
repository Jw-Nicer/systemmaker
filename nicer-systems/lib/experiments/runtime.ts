import type { Experiment } from "@/types/experiment";

export function normalizeExperimentCopy(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getResolvedExperimentValue(
  experiment: Experiment | null | undefined,
  assignedKey?: string | null
) {
  if (!experiment) return undefined;

  if (experiment.status === "completed") {
    const winningVariant = experiment.variants.find(
      (variant) => variant.key === experiment.winner
    );
    return normalizeExperimentCopy(winningVariant?.value);
  }

  const assignedVariant = experiment.variants.find(
    (variant) => variant.key === assignedKey
  );
  return normalizeExperimentCopy(assignedVariant?.value);
}
