import { afterEach, beforeEach, describe, test, vi } from "vitest";
import assert from "node:assert/strict";

const mockInitializeApp = vi.fn<(options?: unknown) => { name: string }>(() => ({
  name: "admin-app",
}));
const mockGetApps = vi.fn(() => []);
const mockCert = vi.fn((value: unknown) => value);
const mockGetAuth = vi.fn<(app?: unknown) => { name: string }>(() => ({
  name: "auth",
}));
const mockGetFirestore = vi.fn<(app?: unknown) => { name: string }>(() => ({
  name: "db",
}));

vi.mock("firebase-admin/app", () => ({
  initializeApp: (options?: unknown) => mockInitializeApp(options),
  getApps: () => mockGetApps(),
  cert: (value: unknown) => mockCert(value),
}));

vi.mock("firebase-admin/auth", () => ({
  getAuth: (app?: unknown) => mockGetAuth(app),
}));

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: (app?: unknown) => mockGetFirestore(app),
}));

const originalEnv = { ...process.env };

describe("firebase admin init", () => {
  beforeEach(() => {
    vi.resetModules();
    mockInitializeApp.mockClear();
    mockGetApps.mockReset();
    mockGetApps.mockReturnValue([]);
    mockCert.mockClear();
    mockGetAuth.mockClear();
    mockGetFirestore.mockClear();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test("uses service account credentials when configured", async () => {
    process.env.FIREBASE_PROJECT_ID = "demo-project";
    process.env.FIREBASE_CLIENT_EMAIL = "admin@example.com";
    process.env.FIREBASE_PRIVATE_KEY = "line-1\\nline-2";

    const { getAdminAuth } = await import("@/lib/firebase/admin");
    getAdminAuth();

    assert.equal(mockInitializeApp.mock.calls.length, 1);
    assert.equal(mockCert.mock.calls.length, 1);
    assert.deepEqual(mockCert.mock.calls[0][0], {
      projectId: "demo-project",
      clientEmail: "admin@example.com",
      privateKey: "line-1\nline-2",
    });
    const firstInitArg = (mockInitializeApp.mock.calls as unknown[][])[0]?.[0];
    assert.deepEqual(firstInitArg, {
      credential: {
        projectId: "demo-project",
        clientEmail: "admin@example.com",
        privateKey: "line-1\nline-2",
      },
      projectId: "demo-project",
    });
  });

  test("falls back to application default credentials when service account env vars are absent", async () => {
    process.env.FIREBASE_PROJECT_ID = "demo-project";
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;

    const { getAdminDb } = await import("@/lib/firebase/admin");
    getAdminDb();

    assert.equal(mockInitializeApp.mock.calls.length, 1);
    assert.equal(mockCert.mock.calls.length, 0);
    const firstInitArg = (mockInitializeApp.mock.calls as unknown[][])[0]?.[0];
    assert.deepEqual(firstInitArg, {
      projectId: "demo-project",
    });
  });
});
