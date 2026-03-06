import test from "node:test";
import assert from "node:assert/strict";
import {
  assertSafeAgentObject,
  assertSafeAgentText,
  buildSafeConversationFallback,
  inspectAgentText,
} from "@/lib/agents/safety";

test("inspectAgentText detects credential requests and access claims", () => {
  const issues = inspectAgentText(
    "I already accessed your CRM. Please send me your password and API key so I can finish the setup."
  );

  assert.ok(issues.some((issue) => issue.code === "system_access_claim"));
  assert.ok(issues.some((issue) => issue.code === "credential_request"));
});

test("assertSafeAgentObject blocks leaked secrets nested inside structured output", () => {
  assert.throws(() => {
    assertSafeAgentObject(
      {
        summary: "Use this key for the integration",
        notes: ["AIzaSyD0ExampleSecretTokenValue12345"],
      },
      "runner:test"
    );
  }, /Unsafe agent output blocked/);
});

test("assertSafeAgentText allows ordinary draft planning language", () => {
  assert.doesNotThrow(() => {
    assertSafeAgentText(
      "Draft plan: automate intake first, then add alerts for overdue requests.",
      "conversation:test"
    );
  });
});

test("buildSafeConversationFallback returns non-empty safe copy for each phase", () => {
  assert.match(buildSafeConversationFallback("gathering"), /can't access your systems/i);
  assert.match(buildSafeConversationFallback("confirming"), /can't access your systems/i);
  assert.match(buildSafeConversationFallback("follow_up"), /can't access your systems/i);
});
