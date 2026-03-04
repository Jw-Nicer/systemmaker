import { NextResponse } from "next/server";

interface RateLimitState {
  count: number;
  windowStart: number;
}

export interface RateLimitConfig {
  keyPrefix: string;
  windowMs: number;
  maxRequests: number;
}

const rateLimitStore = new Map<string, RateLimitState>();

function nowMs(): number {
  return Date.now();
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  const cloudflareIp = request.headers.get("cf-connecting-ip");
  if (cloudflareIp) return cloudflareIp;

  return "unknown";
}

export function enforceRateLimit(
  request: Request,
  config: RateLimitConfig
): NextResponse | null {
  const ip = getClientIp(request);
  const key = `${config.keyPrefix}:${ip}`;
  const current = rateLimitStore.get(key);
  const now = nowMs();

  if (!current || now - current.windowStart >= config.windowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return null;
  }

  if (current.count >= config.maxRequests) {
    const retryAfterSec = Math.ceil(
      (config.windowMs - (now - current.windowStart)) / 1000
    );
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
        },
      }
    );
  }

  current.count += 1;
  return null;
}

export function hasFilledHoneypot(
  payload: unknown,
  fieldNames: string[] = ["website", "homepage", "url"]
): boolean {
  if (!payload || typeof payload !== "object") return false;
  const body = payload as Record<string, unknown>;

  return fieldNames.some((field) => {
    const value = body[field];
    return typeof value === "string" && value.trim().length > 0;
  });
}
