import { test, describe, vi, beforeEach } from "vitest";
import assert from "node:assert/strict";

// Mock Resend before importing the module
const mockSend = vi.fn().mockResolvedValue({ id: "mock-id" });
vi.mock("resend", () => {
  return {
    Resend: class MockResend {
      emails = { send: mockSend };
    },
  };
});

// Mock Firestore
const mockUpdate = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({
    collection: () => ({
      doc: () => ({ update: mockUpdate }),
    }),
  }),
}));

const { enrollInNurture } = await import("@/lib/email/nurture-sequence");

const baseInput = {
  lead_id: "lead-123",
  name: "Jane Doe",
  email: "jane@example.com",
  industry: "healthcare",
  bottleneck: "manual intake",
};

describe("enrollInNurture", () => {
  beforeEach(() => {
    mockSend.mockClear();
    mockUpdate.mockClear();
    mockSend.mockResolvedValue({ id: "mock-id" });
    mockUpdate.mockResolvedValue(undefined);
  });

  test("skips when RESEND_API_KEY is not set", async () => {
    const original = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    await enrollInNurture(baseInput);
    assert.equal(mockSend.mock.calls.length, 0);
    assert.equal(mockUpdate.mock.calls.length, 0);
    if (original) process.env.RESEND_API_KEY = original;
  });

  test("schedules 4 emails", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    await enrollInNurture(baseInput);
    assert.equal(mockSend.mock.calls.length, 4);
    delete process.env.RESEND_API_KEY;
  });

  test("emails are scheduled at day +2, +4, +7, +14", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const before = new Date();
    await enrollInNurture(baseInput);

    const scheduledDates = mockSend.mock.calls.map((call: unknown[]) => {
      const arg = call[0] as { scheduledAt: string };
      return new Date(arg.scheduledAt);
    });

    const dayOffsets = scheduledDates.map((d: Date) => {
      const diffMs = d.getTime() - before.getTime();
      return Math.round(diffMs / (1000 * 60 * 60 * 24));
    });

    assert.deepEqual(dayOffsets, [2, 4, 7, 14]);
    delete process.env.RESEND_API_KEY;
  });

  test("emails have expected subjects", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    await enrollInNurture(baseInput);

    const subjects = mockSend.mock.calls.map(
      (call: unknown[]) => (call[0] as { subject: string }).subject
    );

    // Quick tip email
    assert.ok(subjects[0].includes("quick automation tip"));
    // Case study email
    assert.ok(subjects[1].includes("cut manual work"));
    // ROI email
    assert.ok(subjects[2].includes("math on automation"));
    // Final CTA email
    assert.ok(subjects[3].includes("Preview Plan is still here"));

    delete process.env.RESEND_API_KEY;
  });

  test("sends to the correct recipient", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    await enrollInNurture(baseInput);

    for (const call of mockSend.mock.calls) {
      assert.equal((call[0] as { to: string }).to, "jane@example.com");
    }

    delete process.env.RESEND_API_KEY;
  });

  test("updates lead with nurture_enrolled after scheduling", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    await enrollInNurture(baseInput);
    assert.equal(mockUpdate.mock.calls.length, 1);

    const updateArg = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    assert.equal(updateArg.nurture_enrolled, true);
    assert.ok(updateArg.nurture_enrolled_at instanceof Date);

    delete process.env.RESEND_API_KEY;
  });

  test("still updates Firestore when some emails fail", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    mockSend
      .mockResolvedValueOnce({ id: "ok-1" })
      .mockRejectedValueOnce(new Error("API error"))
      .mockResolvedValueOnce({ id: "ok-3" })
      .mockResolvedValueOnce({ id: "ok-4" });

    await enrollInNurture(baseInput);
    assert.equal(mockUpdate.mock.calls.length, 1);
    delete process.env.RESEND_API_KEY;
  });

  test("does not throw when Firestore update fails", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    mockUpdate.mockRejectedValueOnce(new Error("Firestore error"));

    // Should not throw
    await enrollInNurture(baseInput);
    delete process.env.RESEND_API_KEY;
  });
});
