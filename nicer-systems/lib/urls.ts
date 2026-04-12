/**
 * Build absolute public URLs from an incoming request.
 * Uses forwarded headers when present so links generated behind proxies/CDNs
 * point to the public-facing origin instead of an internal host.
 */

export function getRequestOrigin(request: Request): string {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");

  if (host) {
    const protocol =
      forwardedProto ?? (host.includes("localhost") ? "http" : "https");
    return `${protocol}://${host}`;
  }

  return new URL(request.url).origin;
}

export function buildPublicPlanPath(planId: string): string {
  return `/plan/${planId}`;
}

export function buildPublicPlanUrl(request: Request, planId: string): string {
  return `${getRequestOrigin(request)}${buildPublicPlanPath(planId)}`;
}
