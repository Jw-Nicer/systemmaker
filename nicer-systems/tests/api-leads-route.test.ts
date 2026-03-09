import { test, describe, vi, beforeEach } from "vitest";
import assert from "node:assert/strict";

// Mock Firebase admin
const mockAdd = vi.fn().mockResolvedValue({ id: "lead-abc" });
vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({
    collection: () => ({ add: mockAdd }),
  }),
}));

// Mock rate limiting — allow all by default
const mockEnforceRateLimit = vi.fn().mockResolvedValue(null);
const mockHasFilledHoneypot = vi.fn().mockReturnValue(false);
vi.mock("@/lib/security/request-guards", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
  hasFilledHoneypot: (...args: unknown[]) => mockHasFilledHoneypot(...args),
}));

// Mock fire-and-forget services
const mockSendNotification = vi.fn().mockResolvedValue(undefined);
const mockEnrollNurture = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/email/admin-notification", () => ({
  sendAdminNotification: (...args: unknown[]) => mockSendNotification(...args),
}));
vi.mock("@/lib/email/nurture-sequence", () => ({
  enrollInNurture: (...args: unknown[]) => mockEnrollNurture(...args),
}));

// Mock lead scoring
vi.mock("@/lib/leads/scoring", () => ({
  computeLeadScore: () => 45,
}));

const { POST } = await import("@/app/api/leads/route");

const validBody = {
  name: "Jane Doe",
  email: "jane@example.com",
  company: "Acme Corp",
  bottleneck: "manual intake",
};

function makeRequest(body: unknown) {
  return new Request("https://example.com/api/leads", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "198.51.100.1",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/leads", () => {
  beforeEach(() => {
    mockAdd.mockClear();
    mockEnforceRateLimit.mockClear();
    mockHasFilledHoneypot.mockClear();
    mockSendNotification.mockClear();
    mockEnrollNurture.mockClear();
    mockAdd.mockResolvedValue({ id: "lead-abc" });
    mockEnforceRateLimit.mockResolvedValue(null);
    mockHasFilledHoneypot.mockReturnValue(false);
  });

  test("returns 201 with lead_id on valid submission", async () => {
    const response = await POST(makeRequest(validBody));
    assert.equal(response.status, 201);
    const json = await response.json();
    assert.equal(json.lead_id, "lead-abc");
  });

  test("stores lead in Firestore with score and status", async () => {
    await POST(makeRequest(validBody));
    assert.equal(mockAdd.mock.calls.length, 1);
    const stored = mockAdd.mock.calls[0][0] as Record<string, unknown>;
    assert.equal(stored.name, "Jane Doe");
    assert.equal(stored.email, "jane@example.com");
    assert.equal(stored.score, 45);
    assert.equal(stored.status, "new");
    assert.equal(stored.source, "contact");
    assert.ok(stored.created_at instanceof Date);
  });

  test("returns 400 on invalid body", async () => {
    const response = await POST(makeRequest({ name: "" }));
    assert.equal(response.status, 400);
    const json = await response.json();
    assert.equal(json.error, "Validation failed");
    assert.ok(json.details);
  });

  test("returns 400 when honeypot is filled", async () => {
    mockHasFilledHoneypot.mockReturnValue(true);
    const response = await POST(makeRequest(validBody));
    assert.equal(response.status, 400);
    const json = await response.json();
    assert.equal(json.error, "Validation failed");
  });

  test("returns rate limit response when limited", async () => {
    const rateLimitResponse = new Response(
      JSON.stringify({ error: "Too many requests" }),
      { status: 429 }
    );
    mockEnforceRateLimit.mockResolvedValue(rateLimitResponse);
    const response = await POST(makeRequest(validBody));
    assert.equal(response.status, 429);
  });

  test("returns 500 on Firestore error", async () => {
    mockAdd.mockRejectedValueOnce(new Error("Firestore down"));
    const response = await POST(makeRequest(validBody));
    assert.equal(response.status, 500);
    const json = await response.json();
    assert.equal(json.error, "Failed to save lead");
  });

  test("triggers notification and nurture as fire-and-forget", async () => {
    await POST(makeRequest(validBody));
    assert.equal(mockSendNotification.mock.calls.length, 1);
    assert.equal(mockEnrollNurture.mock.calls.length, 1);
  });

  test("notification failure does not affect response", async () => {
    mockSendNotification.mockRejectedValueOnce(new Error("email failed"));
    const response = await POST(makeRequest(validBody));
    assert.equal(response.status, 201);
  });
});
