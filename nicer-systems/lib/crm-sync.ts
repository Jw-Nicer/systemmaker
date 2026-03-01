/**
 * CRM webhook sync — sends lead data to configured CRM endpoints.
 * Supports generic webhook (works with HubSpot, Close, ClickUp, Zapier, Make).
 */

import { getAdminDb } from "@/lib/firebase/admin";

export interface CRMConfig {
  webhook_url: string;
  is_active: boolean;
  provider: "hubspot" | "close" | "clickup" | "zapier" | "custom";
  secret_header?: string;
  secret_value?: string;
}

interface LeadPayload {
  id: string;
  name: string;
  email: string;
  company: string;
  bottleneck: string;
  tools: string;
  urgency: string;
  score: number;
  score_label: string;
  source: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  created_at: string;
}

export async function getCRMConfig(): Promise<CRMConfig | null> {
  try {
    const db = getAdminDb();
    const doc = await db.collection("site_settings").doc("crm").get();
    if (!doc.exists) return null;
    return doc.data() as CRMConfig;
  } catch {
    return null;
  }
}

export async function syncLeadToCRM(lead: LeadPayload): Promise<{ success: boolean; error?: string }> {
  const config = await getCRMConfig();
  if (!config || !config.is_active || !config.webhook_url) {
    return { success: true }; // No CRM configured, skip silently
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (config.secret_header && config.secret_value) {
      headers[config.secret_header] = config.secret_value;
    }

    const res = await fetch(config.webhook_url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        lead_id: lead.id,
        name: lead.name,
        email: lead.email,
        company: lead.company,
        bottleneck: lead.bottleneck,
        tools: lead.tools,
        urgency: lead.urgency,
        score: lead.score,
        score_label: lead.score_label,
        source: lead.source,
        utm_source: lead.utm_source,
        utm_medium: lead.utm_medium,
        utm_campaign: lead.utm_campaign,
        created_at: lead.created_at,
      }),
    });

    if (!res.ok) {
      console.error("CRM sync failed:", res.status, await res.text().catch(() => ""));
      return { success: false, error: `CRM webhook returned ${res.status}` };
    }

    return { success: true };
  } catch (err) {
    console.error("CRM sync error:", err);
    return { success: false, error: "CRM webhook request failed" };
  }
}
