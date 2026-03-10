import { createHmac } from "crypto";

function getSecret(): string {
  return process.env.UNSUBSCRIBE_SECRET || process.env.RESEND_API_KEY || "nicer-systems-unsub-fallback";
}

function hmac(leadId: string): string {
  return createHmac("sha256", getSecret()).update(leadId).digest("hex").slice(0, 16);
}

export function generateUnsubscribeToken(leadId: string): string {
  const signature = hmac(leadId);
  return `${leadId}.${signature}`;
}

export function extractLeadIdFromToken(token: string): string | null {
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const leadId = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);

  if (!leadId || !signature) return null;
  if (hmac(leadId) !== signature) return null;

  return leadId;
}

export function buildUnsubscribeUrl(leadId: string): string {
  const token = generateUnsubscribeToken(leadId);
  return `https://nicer-systems.web.app/api/leads/unsubscribe?token=${encodeURIComponent(token)}`;
}
