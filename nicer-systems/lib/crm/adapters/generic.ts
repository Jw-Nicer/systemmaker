/**
 * Generic CRM adapter — wraps any payload in a standard envelope.
 */
export interface WebhookEnvelope {
  event: string;
  timestamp: string;
  data: unknown;
}

export function wrapPayload(event: string, payload: unknown): WebhookEnvelope {
  return {
    event,
    timestamp: new Date().toISOString(),
    data: payload,
  };
}
