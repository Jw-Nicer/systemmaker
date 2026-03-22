import { test, vi } from "vitest";
import assert from "node:assert/strict";

// Mock firebase-admin so enforceRateLimit falls back to in-memory
vi.mock("firebase-admin/app", () => ({
  initializeApp: () => ({ name: "test" }),
  getApps: () => [],
  cert: (v: unknown) => v,
}));
vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({}),
}));
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({
    collection: () => ({
      doc: () => ({
        get: () => Promise.reject(new Error("no firestore in test")),
      }),
      add: () => Promise.resolve({ id: "test" }),
    }),
    runTransaction: () => Promise.reject(new Error("no firestore in test")),
  }),
  FieldValue: { serverTimestamp: () => null, increment: (n: number) => n },
}));

import {
  POST,
  getActiveSSEConnectionCount,
  releaseSSEConnection,
  reserveSSEConnection,
  resetSSEConnectionTracking,
} from "@/app/api/agent/chat/route";
import { resetInMemoryRateLimitStore } from "@/lib/security/request-guards";

test.beforeEach(() => {
  resetSSEConnectionTracking();
  resetInMemoryRateLimitStore();
});

test("POST does not reserve an SSE slot for invalid JSON requests", async () => {
  const request = new Request("https://example.com/api/agent/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "198.51.100.10",
    },
    body: "{invalid",
  });

  const response = await POST(request);

  assert.equal(response.status, 400);
  assert.equal(getActiveSSEConnectionCount("198.51.100.10"), 0);
});

test("POST does not reserve an SSE slot for schema-invalid requests", async () => {
  const request = new Request("https://example.com/api/agent/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "198.51.100.11",
    },
    body: JSON.stringify({
      message: "",
      history: [],
      phase: "gathering",
      extracted: {},
    }),
  });

  const response = await POST(request);

  assert.equal(response.status, 400);
  assert.equal(getActiveSSEConnectionCount("198.51.100.11"), 0);
});

test("SSE connection helpers reserve up to the limit and release cleanly", () => {
  assert.equal(reserveSSEConnection("198.51.100.12"), true);
  assert.equal(reserveSSEConnection("198.51.100.12"), true);
  assert.equal(reserveSSEConnection("198.51.100.12"), true);
  assert.equal(reserveSSEConnection("198.51.100.12"), false);
  assert.equal(getActiveSSEConnectionCount("198.51.100.12"), 3);

  releaseSSEConnection("198.51.100.12");
  releaseSSEConnection("198.51.100.12");
  releaseSSEConnection("198.51.100.12");

  assert.equal(getActiveSSEConnectionCount("198.51.100.12"), 0);
});
