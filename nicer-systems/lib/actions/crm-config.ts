"use server";

import { getSessionUser } from "@/lib/firebase/auth";
import {
  getCRMConfig,
  updateCRMConfig,
  type CRMConfig,
} from "@/lib/firestore/crm-config";
import { dispatchCRMWebhook } from "@/lib/crm/sync";

export async function getCRMConfigAction(): Promise<CRMConfig | null> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return getCRMConfig();
}

export async function updateCRMConfigAction(
  config: Partial<CRMConfig>
): Promise<void> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  // Basic validation
  if (config.webhook_url !== undefined) {
    const url = config.webhook_url.trim();
    if (url && !url.startsWith("https://")) {
      throw new Error("Webhook URL must use HTTPS");
    }
  }

  await updateCRMConfig(config);
}

export async function testWebhookAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const config = await getCRMConfig();
  if (!config?.webhook_url || !config.enabled) {
    return { success: false, error: "Webhook not configured or disabled" };
  }

  try {
    await dispatchCRMWebhook("test", {
      message: "Test webhook from Nicer Systems admin",
      timestamp: new Date().toISOString(),
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
