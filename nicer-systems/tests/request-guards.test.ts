import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateInMemoryRateLimit,
  getClientIp,
  hasFilledHoneypot,
  resetInMemoryRateLimitStore,
  type RateLimitConfig,
} from "@/lib/security/request-guards";

const config: RateLimitConfig = {
  keyPrefix: "tests",
  windowMs: 60_000,
  maxRequests: 2,
};

test.beforeEach(() => {
  resetInMemoryRateLimitStore();
});

test("getClientIp prefers forwarded headers in order", () => {
  const req = new Request("https://example.com", {
    headers: {
      "x-forwarded-for": "198.51.100.10, 10.0.0.1",
      "x-real-ip": "203.0.113.7",
      "cf-connecting-ip": "203.0.113.8",
    },
  });

  assert.equal(getClientIp(req), "198.51.100.10");
});

test("hasFilledHoneypot detects populated trap fields", () => {
  assert.equal(hasFilledHoneypot({ website: "" }), false);
  assert.equal(hasFilledHoneypot({ website: "https://spam.test" }), true);
  assert.equal(hasFilledHoneypot({ homepage: "filled" }), true);
});

test("evaluateInMemoryRateLimit allows requests until the threshold and then blocks", async () => {
  assert.equal(evaluateInMemoryRateLimit("tests:198.51.100.10", config), null);
  assert.equal(evaluateInMemoryRateLimit("tests:198.51.100.10", config), null);

  const blocked = evaluateInMemoryRateLimit("tests:198.51.100.10", config);

  assert.ok(blocked);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get("Retry-After"), "60");

  const body = await blocked.json();
  assert.equal(body.error, "Rate limit exceeded. Please try again shortly.");
});
