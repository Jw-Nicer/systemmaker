import { test } from "vitest";
import assert from "node:assert/strict";
import {
  assertSafeAgentObject,
  assertSafeAgentText,
  buildSafeConversationFallback,
  collectObjectSafetyIssues,
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

// --- Extended coverage ---

test("inspectAgentText detects all secret key patterns", () => {
  // Each test value must meet the minimum length from the regex pattern
  const secrets = [
    "sk-abc123def456ghi789jklmno",           // sk[-_] + 16+ alphanumeric
    "AIzaSyD0ExampleSecretTokenValue12345",   // AIza + 20+ chars
    "ghp_1234567890abcdefghijklmno",          // ghp_ + 20+ chars
    "xoxb-123456789-abcdefghij",              // xox[baprs]- + 10+ chars
    "glpat-abcdefghij1234567890",             // glpat- + 10+ chars
    "npm_1234567890abcdefghijklmno",          // npm_ + 20+ chars
    "SG.abcdefghij12345678901234",            // SG. + 20+ chars
    "re_12345678901234567890ab",              // re_ + 20+ chars
  ];
  for (const secret of secrets) {
    const issues = inspectAgentText(`Found: ${secret}`);
    assert.ok(issues.length > 0, `Should detect: ${secret.slice(0, 10)}...`);
    assert.equal(issues[0].code, "secret_leak");
  }
});

test("inspectAgentText detects impersonation claims", () => {
  const phrases = [
    "I am with Nicer Systems",
    "I work for your company",
    "I'm your employee at the office",
  ];
  for (const phrase of phrases) {
    const issues = inspectAgentText(phrase);
    assert.ok(issues.length > 0, `Should detect impersonation: "${phrase}"`);
    assert.equal(issues[0].code, "impersonation_claim");
  }
});

test("inspectAgentText returns empty for empty/whitespace text", () => {
  assert.equal(inspectAgentText("").length, 0);
  assert.equal(inspectAgentText("   ").length, 0);
});

test("collectObjectSafetyIssues traverses nested arrays", () => {
  const arr = ["Safe text", "AIzaSyD0ExampleSecretTokenValue12345", "More safe text"];
  const issues = collectObjectSafetyIssues(arr);
  assert.ok(issues.length > 0);
  assert.equal(issues[0].code, "secret_leak");
});

test("collectObjectSafetyIssues returns empty for safe objects", () => {
  const obj = {
    kpis: [{ name: "Approval time", definition: "Days from app to approval" }],
    actions: [{ priority: "High", action: "Clear backlog" }],
  };
  assert.equal(collectObjectSafetyIssues(obj).length, 0);
});

test("excerpt masking hides sensitive content", () => {
  const issues = inspectAgentText("Token: AIzaSyD0ExampleSecretTokenValue12345");
  assert.ok(issues.length > 0);
  assert.match(issues[0].excerpt, /\*\*\*/);
});

test("buildSafeConversationFallback returns default for building phase", () => {
  const building = buildSafeConversationFallback("building");
  assert.match(building, /preview plan/i);
});
