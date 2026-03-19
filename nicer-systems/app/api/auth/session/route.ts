import { NextResponse } from "next/server";
import { createSessionCookie } from "@/lib/firebase/auth";
import { enforceRateLimit } from "@/lib/security/request-guards";

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimit(request, {
      keyPrefix: "auth_session",
      windowMs: 60_000,
      maxRequests: 10,
    });
    if (limited) return limited;

    const { idToken } = await request.json();

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    await createSessionCookie(idToken);

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const code =
      (err as { code?: string })?.code ??
      (err as { errorInfo?: { code?: string } })?.errorInfo?.code;
    const message = err instanceof Error ? err.message : String(err);

    console.error("[auth/session] Failed to create session:", {
      code,
      message,
    });

    // Surface a specific hint so the client can decide whether to retry
    if (code === "auth/id-token-expired" || code === "auth/id-token-revoked") {
      return NextResponse.json(
        { error: "Token expired — please retry", code: "TOKEN_EXPIRED" },
        { status: 401 }
      );
    }

    if (code === "auth/argument-error" || code === "auth/invalid-credential") {
      return NextResponse.json(
        { error: "Invalid credentials", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 401 }
    );
  }
}
