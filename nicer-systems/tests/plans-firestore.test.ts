import { afterEach, beforeEach, describe, test, vi } from "vitest";
import assert from "node:assert/strict";
import { createPreviewPlan } from "@/tests/fixtures/preview-plan";

const mockRunTransaction = vi.fn();
const mockDocGet = vi.fn();
const mockDocUpdate = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({
    collection: () => ({
      doc: () => ({
        get: (...args: unknown[]) => mockDocGet(...args),
        update: (...args: unknown[]) => mockDocUpdate(...args),
      }),
    }),
    runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  }),
  FieldValue: {
    serverTimestamp: () => null,
    increment: (n: number) => n,
  },
}));

const {
  buildPlanRefinementUpdate,
  savePlanRefinement,
} = await import("@/lib/firestore/plans");

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

describe("buildPlanRefinementUpdate", () => {
  test("updates preview_plan and serializes version content", () => {
    const plan = createPreviewPlan();
    const refinedOpsPulse = {
      ...plan.ops_pulse,
      actions: [
        {
          priority: "medium",
          owner_role: "Coordinator",
          action: "Review overdue requests every morning",
        },
      ],
    };

    const update = buildPlanRefinementUpdate(plan, {
      version: 2,
      section: "ops_pulse",
      content: refinedOpsPulse,
      feedback: "Make the next steps more realistic for a small team.",
    });

    assert.equal(update.version, 2);
    assert.deepEqual(update.preview_plan.ops_pulse, refinedOpsPulse);
    assert.equal(update.versionEntry.content, JSON.stringify(refinedOpsPulse));
    assert.equal(update.versionEntry.section, "ops_pulse");
    assert.equal(
      update.versionEntry.feedback,
      "Make the next steps more realistic for a small team."
    );
    assert.ok(Date.parse(update.versionEntry.created_at));
  });
});

describe("savePlanRefinement", () => {
  beforeEach(() => {
    mockRunTransaction.mockReset();
    mockDocGet.mockReset();
    mockDocUpdate.mockReset();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("persists accepted refinement inside a Firestore transaction", async () => {
    const plan = createPreviewPlan();
    const refinedRoadmap = {
      ...plan.roadmap,
      total_estimated_weeks: 6,
    };
    let transactionUpdate: Record<string, unknown> | undefined;

    mockRunTransaction.mockImplementation(async (fn: (tx: { get: (docRef: unknown) => Promise<{ exists: boolean; data: () => unknown }>; update: (_docRef: unknown, update: Record<string, unknown>) => void }) => Promise<void>) =>
      fn({
        get: async () => ({
          exists: true,
          data: () => ({
            preview_plan: plan,
            version: 3,
            versions: [
              {
                version: 3,
                section: "workflow",
                content: "{}",
                feedback: "Previous revision",
                created_at: new Date().toISOString(),
              },
            ],
          }),
        }),
        update: (_docRef, update) => {
          transactionUpdate = update;
        },
      })
    );

    await savePlanRefinement("plan-123", {
      section: "implementation_sequencer",
      content: refinedRoadmap,
      feedback: "Stretch the roadmap to six weeks.",
    });

    assert.equal(mockRunTransaction.mock.calls.length, 1);
    assert.ok(transactionUpdate);
    assert.equal(transactionUpdate?.version, 4);
    assert.deepEqual(
      (transactionUpdate?.preview_plan as typeof plan).roadmap,
      refinedRoadmap
    );
    assert.equal(
      (transactionUpdate?.versions as { version: number }[]).at(-1)?.version,
      4
    );
    assert.equal(
      (transactionUpdate?.versions as { section: string }[]).at(-1)?.section,
      "implementation_sequencer"
    );
  });

  test("trims version history to the configured max size", async () => {
    const plan = createPreviewPlan();
    let transactionUpdate: Record<string, unknown> | undefined;
    const existingVersions = Array.from({ length: 20 }, (_, index) => ({
      version: index + 1,
      section: "workflow",
      content: "{}",
      feedback: `Revision ${index + 1}`,
      created_at: new Date().toISOString(),
    }));

    mockRunTransaction.mockImplementation(async (fn: (tx: { get: (docRef: unknown) => Promise<{ exists: boolean; data: () => unknown }>; update: (_docRef: unknown, update: Record<string, unknown>) => void }) => Promise<void>) =>
      fn({
        get: async () => ({
          exists: true,
          data: () => ({
            preview_plan: plan,
            version: 20,
            versions: existingVersions,
          }),
        }),
        update: (_docRef, update) => {
          transactionUpdate = update;
        },
      })
    );

    await savePlanRefinement("plan-123", {
      section: "ops_pulse",
      content: plan.ops_pulse,
      feedback: "Newest revision",
    });

    const versions = transactionUpdate?.versions as { version: number }[];
    assert.equal(versions.length, 20);
    assert.equal(versions[0]?.version, 2);
    assert.equal(versions.at(-1)?.version, 21);
  });

  test("throws when the plan does not exist", async () => {
    mockRunTransaction.mockImplementation(async (fn: (tx: { get: (docRef: unknown) => Promise<{ exists: boolean; data: () => unknown }>; update: () => void }) => Promise<void>) =>
      fn({
        get: async () => ({
          exists: false,
          data: () => undefined,
        }),
        update: () => undefined,
      })
    );

    await assert.rejects(
      () =>
        savePlanRefinement("missing-plan", {
          section: "workflow",
          content: createPreviewPlan().workflow,
        }),
      /Failed to save plan refinement/
    );
  });
});
