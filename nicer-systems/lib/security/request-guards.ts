import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

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
const RATE_LIMIT_COLLECTION = "_rate_limits";

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

export function evaluateInMemoryRateLimit(
  key: string,
  config: RateLimitConfig
): NextResponse | null {
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

export function resetInMemoryRateLimitStore() {
  rateLimitStore.clear();
}

export async function enforceRateLimit(
  request: Request,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const ip = getClientIp(request);
  const key = `${config.keyPrefix}:${ip}`;
  const now = nowMs();

  try {
    const db = getAdminDb();
    const docRef = db.collection(RATE_LIMIT_COLLECTION).doc(key);

    const blockedUntilMs = await db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);

      if (!snap.exists) {
        tx.set(docRef, {
          count: 1,
          windowStart: now,
          updatedAt: now,
          expiresAt: now + config.windowMs,
        });
        return null;
      }

      const data = snap.data() as Partial<RateLimitState> & {
        updatedAt?: number;
        expiresAt?: number;
      };
      const windowStart =
        typeof data.windowStart === "number" ? data.windowStart : now;
      const count = typeof data.count === "number" ? data.count : 0;

      if (now - windowStart >= config.windowMs) {
        tx.set(
          docRef,
          {
            count: 1,
            windowStart: now,
            updatedAt: now,
            expiresAt: now + config.windowMs,
          },
          { merge: true }
        );
        return null;
      }

      if (count >= config.maxRequests) {
        return windowStart + config.windowMs;
      }

      tx.update(docRef, {
        count: count + 1,
        updatedAt: now,
        expiresAt: windowStart + config.windowMs,
      });
      return null;
    });

    if (blockedUntilMs) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((blockedUntilMs - now) / 1000)
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

    return null;
  } catch {
    return evaluateInMemoryRateLimit(key, config);
  }
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
