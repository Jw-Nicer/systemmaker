const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: unknown): string {
  const normalized =
    value === null || value === undefined ? "" : String(value);

  const safe = FORMULA_TRIGGER.test(normalized) ? `'${normalized}` : normalized;

  return `"${safe.replace(/"/g, '""')}"`;
}
