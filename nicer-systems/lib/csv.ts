export function escapeCsvCell(value: unknown): string {
  const normalized =
    value === null || value === undefined ? "" : String(value);

  return `"${normalized.replace(/"/g, '""')}"`;
}
