const KEY_PREFIX = "plan_edit_token:";

function storageKey(planId: string): string {
  return `${KEY_PREFIX}${planId}`;
}

export function saveEditToken(planId: string, token: string): void {
  if (typeof window === "undefined" || !planId || !token) return;
  try {
    window.localStorage.setItem(storageKey(planId), token);
  } catch {
    // localStorage can throw in private mode or when quota is exceeded;
    // refinement just silently falls back to admin-only.
  }
}

export function readEditToken(planId: string): string | null {
  if (typeof window === "undefined" || !planId) return null;
  try {
    return window.localStorage.getItem(storageKey(planId));
  } catch {
    return null;
  }
}

export function clearEditToken(planId: string): void {
  if (typeof window === "undefined" || !planId) return;
  try {
    window.localStorage.removeItem(storageKey(planId));
  } catch {
    // best-effort
  }
}
