import { createHmac } from "node:crypto";
import { getCRMConfig } from "@/lib/firestore/crm-config";
import { wrapPayload } from "./adapters/generic";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function signPayload(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fire-and-forget CRM webhook dispatcher.
 * Reads config, signs payload with HMAC-SHA256, POSTs to webhook_url.
 * Retries up to 3 times with exponential backoff on 5xx.
 * Never throws — logs failures and returns silently.
 */
export async function dispatchCRMWebhook(
  event: string,
  payload: unknown
): Promise<void> {
  try {
    const config = await getCRMConfig();

    if (!config || !config.enabled || !config.webhook_url) {
      return;
    }

    // Check if this event type is in the configured events list
    if (config.events && config.events.length > 0 && !config.events.includes(event)) {
      return;
    }

    const envelope = wrapPayload(event, payload);
    const body = JSON.stringify(envelope);
    const signature = signPayload(body, config.webhook_secret);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(config.webhook_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": `sha256=${signature}`,
            "X-Event-Type": event,
          },
          body,
        });

        // Success or client error — don't retry
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return;
        }

        // 5xx — retry with exponential backoff
        if (attempt < MAX_RETRIES - 1) {
          await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
        }
      } catch (err) {
        // Network error — retry
        if (attempt < MAX_RETRIES - 1) {
          await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
        } else {
          console.error("[crm-sync] Webhook dispatch failed after retries:", err);
        }
      }
    }
  } catch (err) {
    console.error("[crm-sync] Webhook dispatch error:", err);
  }
}
