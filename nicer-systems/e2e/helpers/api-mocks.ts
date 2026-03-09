import type { Page, Request } from "@playwright/test";
import { encodeSSE, buildGatheringReply, buildFullPlanSSE } from "./sse";

// ─── Leads ──────────────────────────────────────────────

export async function mockLeadsAPI(
  page: Page,
  opts?: { capture?: Request[]; leadId?: string }
) {
  await page.route("**/api/leads", async (route) => {
    opts?.capture?.push(route.request());
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ lead_id: opts?.leadId ?? "test-lead-1" }),
    });
  });
}

export async function mockLeadsAPIError(
  page: Page,
  status = 500,
  error = "Something went wrong"
) {
  await page.route("**/api/leads", async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({ error }),
    });
  });
}

// ─── Agent Chat ─────────────────────────────────────────

type ChatMockSequence = string[];

/**
 * Mock /api/agent/chat to return different SSE bodies on successive calls.
 * If only one body is provided, all calls return the same body.
 */
export async function mockAgentChatSequence(page: Page, bodies: ChatMockSequence) {
  let callIndex = 0;
  await page.route("**/api/agent/chat", async (route) => {
    const body = bodies[Math.min(callIndex, bodies.length - 1)];
    callIndex++;
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: { "Cache-Control": "no-cache", Connection: "keep-alive" },
      body,
    });
  });
}

// ─── Send Email ─────────────────────────────────────────

export async function mockSendEmailAPI(page: Page) {
  await page.route("**/api/agent/send-email", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });
}

// ─── Events / Analytics ─────────────────────────────────

export async function mockEventsAPI(
  page: Page,
  opts?: { capture?: Request[] }
) {
  await page.route("**/api/events", async (route) => {
    opts?.capture?.push(route.request());
    await route.fulfill({ status: 204, body: "" });
  });
}

// ─── Auth ───────────────────────────────────────────────

export async function mockAuthSessionAPI(page: Page, success = true) {
  await page.route("**/api/auth/session", async (route) => {
    if (success) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Invalid token" }),
      });
    }
  });
}

export async function mockAuthSignoutAPI(page: Page) {
  await page.route("**/api/auth/signout", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
      headers: { Location: "/admin/login" },
    });
  });
}

// Re-export SSE utilities for convenience
export { encodeSSE, buildGatheringReply, buildFullPlanSSE };
