import type { Experiment, ExperimentAssignment } from "@/types/experiment";

const STORAGE_KEY_PREFIX = "ns-exp:";
const STORAGE_META_KEY = "ns-exp-meta";

function isBrowser() {
  return typeof window !== "undefined";
}

function shallowEqual(
  a: Record<string, string>,
  b: Record<string, string>
) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}

export function getExperimentStorageKey(experimentId: string) {
  return `${STORAGE_KEY_PREFIX}${experimentId}`;
}

export function chooseWeightedVariant(experiment: Experiment) {
  const totalWeight = experiment.variants.reduce((sum, variant) => sum + variant.weight, 0);
  const target = Math.random() * totalWeight;
  let cursor = 0;

  for (const variant of experiment.variants) {
    cursor += variant.weight;
    if (target <= cursor) return variant.key;
  }

  return experiment.variants[0]?.key ?? "control";
}

export function getStoredAssignments(experiments: Experiment[]) {
  if (!isBrowser()) return {} as Record<string, string>;

  const assignments: Record<string, string> = {};

  for (const experiment of experiments) {
    if (experiment.status !== "running") continue;
    const stored = window.localStorage.getItem(getExperimentStorageKey(experiment.id));
    if (experiment.variants.some((variant) => variant.key === stored)) {
      assignments[experiment.id] = stored!;
    }
  }

  return assignments;
}

export function ensureAssignments(experiments: Experiment[]) {
  if (!isBrowser()) return false;

  let changed = false;

  for (const experiment of experiments) {
    if (experiment.status !== "running") continue;

    const storageKey = getExperimentStorageKey(experiment.id);
    const stored = window.localStorage.getItem(storageKey);
    const validStored = experiment.variants.some((variant) => variant.key === stored);
    if (validStored) continue;

    window.localStorage.setItem(storageKey, chooseWeightedVariant(experiment));
    changed = true;
  }

  return changed;
}

function parseStoredMetadata(raw: string | null) {
  if (!raw) return {} as Record<string, ExperimentAssignment>;

  try {
    const parsed = JSON.parse(raw) as Record<string, ExperimentAssignment>;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

export function syncExperimentAssignmentMetadata(
  experiments: Experiment[],
  assignments: Record<string, string>
) {
  if (!isBrowser()) return false;

  const next: Record<string, ExperimentAssignment> = {};

  for (const experiment of experiments) {
    if (experiment.status !== "running") continue;
    const assignedKey = assignments[experiment.id];
    if (!assignedKey) continue;
    const variant = experiment.variants.find((item) => item.key === assignedKey);
    if (!variant) continue;

    next[experiment.id] = {
      experiment_id: experiment.id,
      experiment_name: experiment.name,
      target: experiment.target,
      variant_key: assignedKey,
      variant_label: variant.label,
    };
  }

  const current = parseStoredMetadata(window.localStorage.getItem(STORAGE_META_KEY));
  const currentComparable = Object.fromEntries(
    Object.entries(current).map(([key, value]) => [key, JSON.stringify(value)])
  );
  const nextComparable = Object.fromEntries(
    Object.entries(next).map(([key, value]) => [key, JSON.stringify(value)])
  );

  if (shallowEqual(currentComparable, nextComparable)) {
    return false;
  }

  window.localStorage.setItem(STORAGE_META_KEY, JSON.stringify(next));
  return true;
}

export function getCurrentExperimentAssignments(): ExperimentAssignment[] {
  if (!isBrowser()) return [];

  return Object.values(
    parseStoredMetadata(window.localStorage.getItem(STORAGE_META_KEY))
  );
}
