import type { Page } from "@playwright/test";

export function encodeSSE(
  type: "message" | "phase_change" | "plan_section" | "plan_complete" | "error" | "done",
  data: Record<string, unknown>
) {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Mock a fast gathering → complete transition (skips building).
 * Useful for tests that only need the email-capture state.
 */
export async function mockPreviewPlanCompletion(page: Page) {
  await page.route("**/api/agent/chat", async (route) => {
    const body = [
      encodeSSE("phase_change", { from: "gathering", to: "complete" }),
      encodeSSE("message", {
        content:
          "Your Preview Plan is ready! Want me to email it to you? Just share your name and email, and I'll send the full plan to your inbox.",
        email_capture: true,
      }),
      encodeSSE("done", {}),
    ].join("");

    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: {
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
      body,
    });
  });
}

/**
 * Mock a gathering-phase agent reply.
 */
export function buildGatheringReply(content: string) {
  return [
    encodeSSE("message", { content }),
    encodeSSE("done", {}),
  ].join("");
}

/**
 * Mock the full building → complete pipeline with plan sections.
 */
export function buildFullPlanSSE(planId = "test-plan-1") {
  return [
    encodeSSE("phase_change", { from: "confirming", to: "building" }),
    encodeSSE("plan_section", {
      section: "intake",
      label: "Bottleneck analysis complete",
      content: JSON.stringify({ clarified_problem: "Manual intake is slow." }),
    }),
    encodeSSE("plan_section", {
      section: "workflow",
      label: "Workflow mapped",
      content: JSON.stringify({ stages: [{ name: "Intake", owner_role: "Coordinator" }] }),
    }),
    encodeSSE("plan_section", {
      section: "dashboard",
      label: "KPIs defined",
      content: JSON.stringify({ kpis: [{ name: "Cycle time" }] }),
    }),
    encodeSSE("plan_section", {
      section: "automation",
      label: "Automations configured",
      content: JSON.stringify({ automations: [{ trigger: "New request" }] }),
    }),
    encodeSSE("plan_section", {
      section: "ops_pulse",
      label: "Ops Pulse ready",
      content: JSON.stringify({ sections: [{ title: "Weekly summary" }] }),
    }),
    encodeSSE("plan_complete", {
      plan_id: planId,
      lead_id: "test-lead-1",
      share_url: `/plan/${planId}`,
    }),
    encodeSSE("phase_change", { from: "building", to: "complete" }),
    encodeSSE("message", {
      content: "Your Preview Plan is ready! Want me to email it to you?",
      email_capture: true,
    }),
    encodeSSE("done", {}),
  ].join("");
}
