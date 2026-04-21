import { beforeEach, describe, test, vi } from "vitest";
import assert from "node:assert/strict";

const mockVerifySessionCookie = vi.fn();
vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({
    verifySessionCookie: (...args: unknown[]) =>
      mockVerifySessionCookie(...args),
  }),
}));

const cookieStore = {
  get: (name: string) =>
    name === "__session" ? { value: "session-cookie" } : undefined,
  delete: () => {},
  set: () => {},
};
vi.mock("next/headers", () => ({
  cookies: async () => cookieStore,
}));

const { requireAdmin } = await import("@/lib/firebase/auth");

describe("requireAdmin", () => {
  beforeEach(() => {
    mockVerifySessionCookie.mockReset();
  });

  test("returns the user when the admin custom claim is true", async () => {
    mockVerifySessionCookie.mockResolvedValue({
      uid: "u1",
      email: "random@example.com",
      admin: true,
    });
    const user = await requireAdmin();
    assert.ok(user);
    assert.equal(user?.admin, true);
  });

  test("returns the user when email matches the ADMIN_EMAIL fallback", async () => {
    const prev = process.env.ADMIN_EMAIL;
    process.env.ADMIN_EMAIL = "owner@example.com";
    try {
      mockVerifySessionCookie.mockResolvedValue({
        uid: "u2",
        email: "OWNER@example.com",
      });
      const user = await requireAdmin();
      assert.ok(user);
      assert.equal(user?.uid, "u2");
    } finally {
      if (prev === undefined) delete process.env.ADMIN_EMAIL;
      else process.env.ADMIN_EMAIL = prev;
    }
  });

  test("returns null for an authenticated non-admin without fallback match", async () => {
    const prev = process.env.ADMIN_EMAIL;
    process.env.ADMIN_EMAIL = "owner@example.com";
    try {
      mockVerifySessionCookie.mockResolvedValue({
        uid: "u3",
        email: "someone-else@example.com",
      });
      const user = await requireAdmin();
      assert.equal(user, null);
    } finally {
      if (prev === undefined) delete process.env.ADMIN_EMAIL;
      else process.env.ADMIN_EMAIL = prev;
    }
  });

  test("returns null when session verification throws", async () => {
    mockVerifySessionCookie.mockRejectedValue(new Error("expired"));
    const user = await requireAdmin();
    assert.equal(user, null);
  });
});
