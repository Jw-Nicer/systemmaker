import { NextResponse } from "next/server";
import { createSessionCookie } from "@/lib/firebase/auth";

export async function POST(request: Request) {
  try {
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
