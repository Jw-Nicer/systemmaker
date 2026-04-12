import { test, describe, vi, beforeEach } from "vitest";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockDocGet = vi.fn();
const mockDocSet = vi.fn();
const mockDocUpdate = vi.fn();

// Track which doc path is being accessed
const mockDoc = vi.fn().mockReturnValue({
  get: () => mockDocGet(),
  set: (...args: unknown[]) => mockDocSet(...args),
  update: (...args: unknown[]) => mockDocUpdate(...args),
});

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({
    collection: () => ({
      doc: (...args: unknown[]) => mockDoc(...args),
    }),
    runTransaction: async (
      fn: (tx: {
        get: () => unknown;
        set: (ref: unknown, data: unknown) => void;
        update: (ref: unknown, data: unknown) => void;
      }) => unknown
    ) => {
      return fn({
        get: () => mockDocGet(),
        set: (_ref: unknown, data: unknown) => {
          mockDocSet(data);
        },
        update: (_ref: unknown, data: unknown) => {
          mockDocUpdate(data);
        },
      });
    },
  }),
}));

// Import after mocks
import {
  createVisitorId,
  recallVisitorContext,
  storeMemory,
  buildMemoryPromptSection,
  type AgentMemoryEntry,
  type MemoryContext,
} from "@/lib/agents/memory";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMemoryEntry(
  overrides: Partial<AgentMemoryEntry> = {}
): AgentMemoryEntry {
  return {
    visitorId: "abc123def456",
    email: "test@example.com",
    name: "Test User",
    industry: "construction",
    lastBottleneck: "Scheduling is a mess",
    planIds: ["plan_1"],
    interactions: [
      {
        timestamp: Date.now() - 86400000,
        type: "plan_generated",
        summary: "Generated a preview plan for construction scheduling",
      },
    ],
    preferences: {
      typicalUrgency: "medium",
      knownTools: ["Google Sheets", "QuickBooks"],
      topicsOfInterest: ["scheduling", "invoicing"],
      detailPreference: "detailed",
    },
    firstSeenAt: Date.now() - 604800000,
    lastSeenAt: Date.now() - 86400000,
    sessionCount: 2,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests: createVisitorId
// ---------------------------------------------------------------------------

describe("createVisitorId", () => {
  // 1. Deterministic — same email produces same hash
  test("is deterministic for the same email", () => {
    const id1 = createVisitorId("test@example.com");
    const id2 = createVisitorId("test@example.com");

    assert.equal(id1, id2);
    assert.equal(typeof id1, "string");
    assert.equal(id1.length, 16);
  });

  // 2. Case-insensitive
  test("is case-insensitive", () => {
    const lower = createVisitorId("user@example.com");
    const upper = createVisitorId("USER@EXAMPLE.COM");
    const mixed = createVisitorId("User@Example.COM");

    assert.equal(lower, upper);
    assert.equal(lower, mixed);
  });

  // 3. Different emails produce different IDs
  test("produces different IDs for different emails", () => {
    const id1 = createVisitorId("alice@example.com");
    const id2 = createVisitorId("bob@example.com");

    assert.notEqual(id1, id2);
  });
});

// ---------------------------------------------------------------------------
// Tests: recallVisitorContext
// ---------------------------------------------------------------------------

describe("recallVisitorContext", () => {
  beforeEach(() => {
    mockDocGet.mockReset();
    mockDocSet.mockReset();
    mockDocUpdate.mockReset();
    mockDoc.mockClear();
  });

  // 4. Returns isReturningVisitor:false when doc doesn't exist
  test("returns isReturningVisitor:false when doc does not exist", async () => {
    mockDocGet.mockResolvedValueOnce({ exists: false, data: () => undefined });

    const result = await recallVisitorContext("new@example.com");

    assert.equal(result.isReturningVisitor, false);
    assert.equal(result.contextSummary, "");
    assert.deepStrictEqual(result.preFilled, {});
  });

  // 5. Returns full context for returning visitor
  test("returns full context for a returning visitor", async () => {
    const entry = makeMemoryEntry();
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => entry,
    });

    const result = await recallVisitorContext("test@example.com");

    assert.equal(result.isReturningVisitor, true);
    assert.ok(result.contextSummary.includes("Test User"));
    assert.ok(result.contextSummary.includes("construction"));
    assert.ok(result.contextSummary.includes("Scheduling is a mess"));
    assert.ok(result.contextSummary.includes("1 previous plan(s)"));
    assert.ok(result.contextSummary.includes("session #3"));
    assert.ok(result.contextSummary.includes("Google Sheets"));
    assert.ok(result.entry !== undefined);
  });

  // 6. Returns preFilled fields from memory
  test("returns preFilled fields from memory entry", async () => {
    const entry = makeMemoryEntry();
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => entry,
    });

    const result = await recallVisitorContext("test@example.com");

    assert.equal(result.preFilled.industry, "construction");
    assert.equal(result.preFilled.bottleneck, "Scheduling is a mess");
    assert.equal(
      result.preFilled.current_tools,
      "Google Sheets, QuickBooks"
    );
  });

  // 7. Returns empty for blank email
  test("returns empty context for blank email (no Firestore call)", async () => {
    const result = await recallVisitorContext("");

    assert.equal(result.isReturningVisitor, false);
    assert.deepStrictEqual(result.preFilled, {});
    // Should not have called Firestore at all
    assert.equal(mockDocGet.mock.calls.length, 0);
  });

  // 8. Handles Firestore error gracefully
  test("handles Firestore error gracefully", async () => {
    mockDocGet.mockRejectedValueOnce(new Error("Firestore unavailable"));

    const result = await recallVisitorContext("error@example.com");

    assert.equal(result.isReturningVisitor, false);
    assert.equal(result.contextSummary, "");
    assert.deepStrictEqual(result.preFilled, {});
  });
});

// ---------------------------------------------------------------------------
// Tests: storeMemory
// ---------------------------------------------------------------------------

describe("storeMemory", () => {
  beforeEach(() => {
    mockDocGet.mockReset();
    mockDocSet.mockReset();
    mockDocUpdate.mockReset();
    mockDoc.mockClear();
  });

  // 9. Creates new entry when doc doesn't exist
  test("creates new memory entry when doc does not exist", async () => {
    mockDocGet.mockResolvedValueOnce({ exists: false, data: () => undefined });

    await storeMemory("new@example.com", {
      name: "New User",
      industry: "healthcare",
      bottleneck: "Patient scheduling",
      planId: "plan_abc",
      tools: ["Excel"],
    });

    assert.equal(mockDocSet.mock.calls.length, 1);
    const storedData = mockDocSet.mock.calls[0][0] as AgentMemoryEntry;
    assert.equal(storedData.name, "New User");
    assert.equal(storedData.industry, "healthcare");
    assert.equal(storedData.lastBottleneck, "Patient scheduling");
    assert.deepStrictEqual(storedData.planIds, ["plan_abc"]);
    assert.deepStrictEqual(storedData.preferences.knownTools, ["Excel"]);
    assert.equal(storedData.sessionCount, 1);
  });

  // 10. Merges with existing entry (update path)
  test("merges with existing memory entry", async () => {
    const existing = makeMemoryEntry();
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => existing,
    });

    await storeMemory("test@example.com", {
      bottleneck: "Invoicing delays",
      planId: "plan_2",
      tools: ["Trello"],
    });

    assert.equal(mockDocUpdate.mock.calls.length, 1);
    const updates = mockDocUpdate.mock.calls[0][0] as Record<string, unknown>;
    assert.equal(updates.lastBottleneck, "Invoicing delays");
    assert.equal(updates.sessionCount, 3);
    // planIds should include both old and new
    const planIds = updates.planIds as string[];
    assert.ok(planIds.includes("plan_1"));
    assert.ok(planIds.includes("plan_2"));
    // Tools merged
    const knownTools = updates["preferences.knownTools"] as string[];
    assert.ok(knownTools.includes("Google Sheets"));
    assert.ok(knownTools.includes("QuickBooks"));
    assert.ok(knownTools.includes("Trello"));
  });

  // 11. Skips for blank email
  test("skips storing memory for blank email", async () => {
    await storeMemory("", { name: "Nobody" });

    assert.equal(mockDocGet.mock.calls.length, 0);
    assert.equal(mockDocSet.mock.calls.length, 0);
  });
});

// ---------------------------------------------------------------------------
// Tests: buildMemoryPromptSection
// ---------------------------------------------------------------------------

describe("buildMemoryPromptSection", () => {
  // 12. Returns empty string for non-returning visitor
  test('returns "" for non-returning visitor', () => {
    const context: MemoryContext = {
      isReturningVisitor: false,
      contextSummary: "",
      preFilled: {},
    };

    const section = buildMemoryPromptSection(context);
    assert.equal(section, "");
  });

  // 13. Returns empty when isReturningVisitor is true but no summary
  test('returns "" when returning but contextSummary is empty', () => {
    const context: MemoryContext = {
      isReturningVisitor: true,
      contextSummary: "",
      preFilled: {},
    };

    const section = buildMemoryPromptSection(context);
    assert.equal(section, "");
  });

  // 14. Includes "Returning visitor context" header
  test('includes "Returning visitor context" header for returning visitor', () => {
    const context: MemoryContext = {
      isReturningVisitor: true,
      contextSummary: "Visitor name: Alice\nKnown industry: construction",
      preFilled: { industry: "construction" },
    };

    const section = buildMemoryPromptSection(context);

    assert.ok(section.includes("Returning visitor context"));
    assert.ok(section.includes("Alice"));
    assert.ok(section.includes("construction"));
    assert.ok(section.includes("Greet them by name"));
  });
});
