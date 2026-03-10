import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  generateUnsubscribeToken,
  extractLeadIdFromToken,
} from "@/lib/email/unsubscribe-token";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return new NextResponse(renderHTML("Invalid unsubscribe link."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const leadId = extractLeadIdFromToken(token);
  if (!leadId) {
    return new NextResponse(renderHTML("Invalid or expired unsubscribe link."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  try {
    const db = getAdminDb();
    const docRef = db.collection("leads").doc(leadId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return new NextResponse(renderHTML("Invalid unsubscribe link."), {
        status: 404,
        headers: { "Content-Type": "text/html" },
      });
    }

    await docRef.update({ nurture_unsubscribed: true });

    return new NextResponse(
      renderHTML("You've been unsubscribed from Nicer Systems emails."),
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    console.error("Unsubscribe error:", err);
    return new NextResponse(
      renderHTML("Something went wrong. Please try again later."),
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
}

function renderHTML(message: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unsubscribe — Nicer Systems</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:60px auto;padding:24px;text-align:center;color:#111827;">
  <h1 style="color:#00d4ff;font-size:20px;margin-bottom:24px;">Nicer Systems</h1>
  <p style="font-size:16px;line-height:1.6;">${message}</p>
  <p style="margin-top:24px;"><a href="https://nicer-systems.web.app" style="color:#00d4ff;">Back to Nicer Systems</a></p>
</body>
</html>`;
}
