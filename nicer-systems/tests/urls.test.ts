import { describe, test } from "vitest";
import assert from "node:assert/strict";
import {
  buildPublicPlanPath,
  buildPublicPlanUrl,
  getRequestOrigin,
} from "@/lib/urls";

describe("lib/urls", () => {
  test("builds the plan path", () => {
    assert.equal(buildPublicPlanPath("plan-123"), "/plan/plan-123");
  });

  test("prefers forwarded host and protocol", () => {
    const request = new Request("http://internal.local/api/agent/run", {
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "nicersystems.com",
      },
    });

    assert.equal(getRequestOrigin(request), "https://nicersystems.com");
    assert.equal(
      buildPublicPlanUrl(request, "plan-123"),
      "https://nicersystems.com/plan/plan-123"
    );
  });

  test("falls back to host header", () => {
    const request = new Request("http://localhost:3000/api/agent/run", {
      headers: {
        host: "localhost:3000",
      },
    });

    assert.equal(getRequestOrigin(request), "http://localhost:3000");
  });

  test("falls back to request url origin", () => {
    const request = new Request("https://preview.example.com/api/agent/run");
    assert.equal(getRequestOrigin(request), "https://preview.example.com");
  });
});
