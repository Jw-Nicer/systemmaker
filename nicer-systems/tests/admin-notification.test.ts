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

// Must import after mock setup
const { sendAdminNotification } = await import(
  "@/lib/email/admin-notification"
);

const baseLead = {
  name: "Jane Doe",
  email: "jane@example.com",
  company: "Acme",
  industry: "healthcare",
  bottleneck: "manual intake forms",
  score: 55,
  source: "contact" as const,
};

describe("sendAdminNotification", () => {
  beforeEach(() => {
    mockSend.mockClear();
  });

  test("skips when RESEND_API_KEY is not set", async () => {
    const original = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    await sendAdminNotification(baseLead);
    assert.equal(mockSend.mock.calls.length, 0);
    if (original) process.env.RESEND_API_KEY = original;
  });

  test("sends email when RESEND_API_KEY is set", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    await sendAdminNotification(baseLead);
    assert.equal(mockSend.mock.calls.length, 1);
    delete process.env.RESEND_API_KEY;
  });

  test("email subject includes lead name and score", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    await sendAdminNotification(baseLead);
    const call = mockSend.mock.calls[0][0];
    assert.ok(call.subject.includes("Jane Doe"));
    assert.ok(call.subject.includes("55"));
    delete process.env.RESEND_API_KEY;
  });

  test("email subject includes source label for contact", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    await sendAdminNotification(baseLead);
    const call = mockSend.mock.calls[0][0];
    assert.ok(call.subject.includes("Contact Form"));
    delete process.env.RESEND_API_KEY;
  });

  test("email subject includes source label for agent_demo", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    await sendAdminNotification({ ...baseLead, source: "agent_demo" });
    const call = mockSend.mock.calls[0][0];
    assert.ok(call.subject.includes("Agent Demo"));
    delete process.env.RESEND_API_KEY;
  });

  test("email subject includes source label for agent_chat", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    await sendAdminNotification({ ...baseLead, source: "agent_chat" });
    const call = mockSend.mock.calls[0][0];
    assert.ok(call.subject.includes("Agent Chat"));
    delete process.env.RESEND_API_KEY;
  });

  test("html includes lead email as mailto link", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    await sendAdminNotification(baseLead);
    const call = mockSend.mock.calls[0][0];
    assert.ok(call.html.includes("mailto:jane@example.com"));
    delete process.env.RESEND_API_KEY;
  });

  test("html includes dashboard link", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    await sendAdminNotification(baseLead);
    const call = mockSend.mock.calls[0][0];
    assert.ok(call.html.includes("/admin/leads"));
    delete process.env.RESEND_API_KEY;
  });

  test("html shows em-dash for missing optional fields", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    await sendAdminNotification({
      ...baseLead,
      company: undefined,
      industry: undefined,
      bottleneck: undefined,
    });
    const call = mockSend.mock.calls[0][0];
    assert.ok(call.html.includes("\u2014")); // em-dash
    delete process.env.RESEND_API_KEY;
  });

  test("does not throw on Resend API error", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    mockSend.mockRejectedValueOnce(new Error("API error"));
    await sendAdminNotification(baseLead);
    delete process.env.RESEND_API_KEY;
  });
});
