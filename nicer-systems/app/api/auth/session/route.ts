import { NextResponse } from "next/server";
import { createSessionCookie } from "@/lib/firebase/auth";
import { enforceRateLimit } from "@/lib/security/request-guards";

export async function POST(request: Request) {
  try {
    const limited = enforceRateLimit(request, {
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
  } catch {
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 401 }
    );
  }
}
