export function toIndustryKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function matchesIndustryKey(value: string, candidates: string[]) {
  const normalizedValue = toIndustryKey(value);
  return candidates.some((candidate) => toIndustryKey(candidate) === normalizedValue);
}
