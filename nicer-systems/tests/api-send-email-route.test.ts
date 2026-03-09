import { test, describe, vi, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSend = vi.fn().mockResolvedValue({ id: "email-1" });
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

const mockDocGet = vi.fn();
const mockDocUpdate = vi.fn().mockResolvedValue(undefined);
const mockActivityAdd = vi.fn().mockResolvedValue({ id: "act-1" });

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({
    collection: () => ({
      doc: () => ({
        get: mockDocGet,
        update: mockDocUpdate,
        collection: () => ({ add: mockActivityAdd }),
      }),
    }),
  }),
}));

vi.mock("@/lib/agents/email-template", () => ({
  renderPreviewPlanHTML: () => "<html>plan</html>",
}));

vi.mock("@/lib/leads/scoring", () => ({
  computeLeadScore: () => 60,
}));

const mockNotification = vi.fn().mockResolvedValue(undefined);
const mockNurture = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/email/admin-notification", () => ({
  sendAdminNotification: (...args: unknown[]) => mockNotification(...args),
}));
vi.mock("@/lib/email/nurture-sequence", () => ({
  enrollInNurture: (...args: unknown[]) => mockNurture(...args),
}));

const mockEnforceRateLimit = vi.fn().mockResolvedValue(null);
const mockHasFilledHoneypot = vi.fn().mockReturnValue(false);
vi.mock("@/lib/security/request-guards", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
  hasFilledHoneypot: (...args: unknown[]) => mockHasFilledHoneypot(...args),
}));

const { POST } = await import("@/app/api/agent/send-email/route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const minimalPlan = {
  intake: { suggested_scope: "Automate intake", clarified_problem: "Slow process" },
  workflow: { stages: [{ name: "Intake", owner_role: "Coordinator", exit_criteria: "Done" }] },
  dashboard: { kpis: [{ name: "Speed", definition: "Avg time", why_it_matters: "Efficiency" }] },
  automation: { alerts: [{ when: "Failure", who: "Ops", message: "Check it" }] },
  ops_pulse: { actions: [{ priority: "high", owner_role: "Ops", action: "Review queue" }] },
};

const validBody = {
  email: "jane@example.com",
  name: "Jane Doe",
  preview_plan: minimalPlan,
  lead_id: "lead-123",
};

function makeRequest(body: unknown) {
  return new Request("https://example.com/api/agent/send-email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "198.51.100.1",
    },
    body: JSON.stringify(body),
  });
}

function fakeLeadDoc(data: Record<string, unknown> | null, exists = true) {
  return { exists, data: () => data };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/agent/send-email", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test_key";
    mockSend.mockClear().mockResolvedValue({ id: "email-1" });
    mockDocGet.mockReset();
    mockDocUpdate.mockReset().mockResolvedValue(undefined);
    mockActivityAdd.mockReset().mockResolvedValue({ id: "act-1" });
    mockNotification.mockClear().mockResolvedValue(undefined);
    mockNurture.mockClear().mockResolvedValue(undefined);
    mockEnforceRateLimit.mockClear().mockResolvedValue(null);
    mockHasFilledHoneypot.mockClear().mockReturnValue(false);
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  // --- Happy path ---

  test("sends email and returns 200 on success", async () => {
    mockDocGet.mockResolvedValue(
      fakeLeadDoc({ source: "agent_demo", company: "Acme" })
    );

    const response = await POST(makeRequest(validBody));
    assert.equal(response.status, 200);
    const json = await response.json();
    assert.equal(json.success, true);
  });

  test("sends email to correct recipient with correct subject", async () => {
    mockDocGet.mockResolvedValue(
      fakeLeadDoc({ source: "agent_demo", company: "Acme" })
    );

    await POST(makeRequest(validBody));
    assert.equal(mockSend.mock.calls.length, 1);
    const emailArg = mockSend.mock.calls[0][0] as Record<string, string>;
    assert.equal(emailArg.to, "jane@example.com");
    assert.ok(emailArg.subject.includes("Preview Plan"));
  });

  // --- Lead update flow ---

  test("updates lead with name, email, and score", async () => {
    mockDocGet.mockResolvedValue(
      fakeLeadDoc({ source: "agent_demo", company: "Acme", bottleneck: "slow" })
    );

    await POST(makeRequest(validBody));
    assert.equal(mockDocUpdate.mock.calls.length, 1);
    const update = mockDocUpdate.mock.calls[0][0] as Record<string, unknown>;
    assert.equal(update.name, "Jane Doe");
    assert.equal(update.email, "jane@example.com");
    assert.equal(update.score, 60);
    assert.ok(update.preview_plan_sent_at instanceof Date);
    assert.ok(update.updated_at instanceof Date);
  });

  test("logs email_sent activity on the lead", async () => {
    mockDocGet.mockResolvedValue(
      fakeLeadDoc({ source: "agent_chat", company: "Acme" })
    );

    await POST(makeRequest(validBody));
    assert.equal(mockActivityAdd.mock.calls.length, 1);
    const activity = mockActivityAdd.mock.calls[0][0] as Record<string, unknown>;
    assert.equal(activity.type, "email_sent");
    assert.equal(activity.content, "Preview Plan sent");
  });

  test("triggers admin notification and nurture enrollment", async () => {
    mockDocGet.mockResolvedValue(
      fakeLeadDoc({ source: "guided_audit", company: "Acme", industry: "healthcare" })
    );

    await POST(makeRequest(validBody));
    assert.equal(mockNotification.mock.calls.length, 1);
    assert.equal(mockNurture.mock.calls.length, 1);
  });

  // --- Blind response pattern ---

  test("returns 200 even when lead does not exist (blind response)", async () => {
    mockDocGet.mockResolvedValue(fakeLeadDoc(null, false));

    const response = await POST(makeRequest(validBody));
    assert.equal(response.status, 200);
    assert.equal(mockDocUpdate.mock.calls.length, 0);
  });

  test("returns 200 when lead source is not an agent source", async () => {
    mockDocGet.mockResolvedValue(
      fakeLeadDoc({ source: "contact", company: "Acme" })
    );

    const response = await POST(makeRequest(validBody));
    assert.equal(response.status, 200);
    // Should not update lead for non-agent sources
    assert.equal(mockDocUpdate.mock.calls.length, 0);
  });

  test("accepts all valid agent sources: agent_demo, agent_chat, guided_audit", async () => {
    for (const source of ["agent_demo", "agent_chat", "guided_audit"]) {
      mockDocGet.mockResolvedValue(fakeLeadDoc({ source }));
      mockDocUpdate.mockClear();
      await POST(makeRequest(validBody));
      assert.equal(
        mockDocUpdate.mock.calls.length,
        1,
        `Expected update for source: ${source}`
      );
    }
  });

  // --- No lead_id ---

  test("skips lead lookup when lead_id is absent", async () => {
    const bodyNoLead = { ...validBody, lead_id: undefined };

    const response = await POST(makeRequest(bodyNoLead));
    assert.equal(response.status, 200);
    assert.equal(mockDocGet.mock.calls.length, 0);
    assert.equal(mockDocUpdate.mock.calls.length, 0);
  });

  // --- Validation errors ---

  test("returns 400 on invalid body", async () => {
    const response = await POST(makeRequest({ email: "bad" }));
    assert.equal(response.status, 400);
    const json = await response.json();
    assert.equal(json.error, "Validation failed");
  });

  test("returns 400 when honeypot is filled", async () => {
    mockHasFilledHoneypot.mockReturnValue(true);
    const response = await POST(makeRequest(validBody));
    assert.equal(response.status, 400);
  });

  test("returns rate limit response when limited", async () => {
    mockEnforceRateLimit.mockResolvedValue(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
    );
    const response = await POST(makeRequest(validBody));
    assert.equal(response.status, 429);
  });

  // --- Missing API key ---

  test("returns 500 when RESEND_API_KEY is not set", async () => {
    delete process.env.RESEND_API_KEY;
    const response = await POST(makeRequest(validBody));
    assert.equal(response.status, 500);
    const json = await response.json();
    assert.equal(json.error, "Email service not configured");
  });

  // --- Resend failure ---

  test("returns 500 when email send fails", async () => {
    mockSend.mockRejectedValue(new Error("Resend API error"));
    const response = await POST(makeRequest(validBody));
    assert.equal(response.status, 500);
    const json = await response.json();
    assert.equal(json.error, "Failed to send email");
  });
});
