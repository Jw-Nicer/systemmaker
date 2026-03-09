export function parseDateValue(value?: string): Date | null {
  if (!value) return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateLabel(value?: string): string {
  const parsed = parseDateValue(value);
  if (!parsed) return value || "—";

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTimeLabel(value?: string): string {
  const parsed = parseDateValue(value);
  if (!parsed) return value || "—";

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function toDateInputValue(value?: string): string {
  const parsed = parseDateValue(value);
  return parsed ? parsed.toISOString().slice(0, 10) : "";
}

export function isPastDate(value?: string, now = new Date()): boolean {
  const parsed = parseDateValue(value);
  return parsed ? parsed < now : false;
}
