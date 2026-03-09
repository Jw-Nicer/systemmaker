import { test, describe, vi, beforeEach } from "vitest";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGet = vi.fn();
const mockUpdate = vi.fn().mockResolvedValue(undefined);
const mockAdd = vi.fn().mockResolvedValue({ id: "activity-1" });
const mockOrderBy = vi.fn().mockReturnThis();
const mockWhere = vi.fn().mockReturnThis();

const mockCollection = vi.fn().mockImplementation(() => ({
  doc: vi.fn().mockImplementation(() => ({
    get: mockGet,
    update: mockUpdate,
    collection: vi.fn().mockReturnValue({ add: mockAdd }),
  })),
  orderBy: mockOrderBy,
  where: mockWhere,
  get: mockGet,
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminDb: () => ({ collection: mockCollection }),
  FieldValue: { delete: () => "__DELETE__" },
}));

const mockGetSessionUser = vi.fn();
vi.mock("@/lib/firebase/auth", () => ({
  getSessionUser: () => mockGetSessionUser(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/leads/export", () => ({
  buildLeadsCSV: (leads: unknown[]) => `csv:${(leads as { id: string }[]).map((l) => l.id).join(",")}`,
  filterLeadsForExport: (leads: unknown[]) => leads,
}));

const {
  getAllLeads,
  getLead,
  updateLeadStatus,
  setLeadFollowUp,
  clearLeadFollowUp,
  getFollowUps,
  exportLeadsCSV,
} = await import("@/lib/actions/leads");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fakeUser = { uid: "admin-1", email: "admin@example.com" };

function fakeDoc(id: string, data: Record<string, unknown>, exists = true) {
  return { id, exists, data: () => data };
}

function fakeSnap(docs: ReturnType<typeof fakeDoc>[]) {
  return { docs };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getAllLeads", () => {
  beforeEach(() => {
    mockGetSessionUser.mockReset();
    mockGet.mockReset();
    mockCollection.mockClear();
    mockOrderBy.mockClear();
  });

  test("returns serialized leads ordered by created_at desc", async () => {
    mockGetSessionUser.mockResolvedValue(fakeUser);
    mockGet.mockResolvedValue(
      fakeSnap([
        fakeDoc("lead-1", { name: "Jane", email: "j@x.com", status: "new", source: "contact", created_at: "2025-01-01T00:00:00Z" }),
        fakeDoc("lead-2", { name: "Bob", email: "b@x.com", status: "qualified", source: "agent_demo", created_at: "2025-02-01T00:00:00Z" }),
      ])
    );

    const leads = await getAllLeads();
    assert.equal(leads.length, 2);
    assert.equal(leads[0].id, "lead-1");
    assert.equal(leads[0].name, "Jane");
    assert.equal(leads[1].id, "lead-2");
    assert.equal(leads[1].status, "qualified");
  });

  test("throws when not authenticated", async () => {
    mockGetSessionUser.mockResolvedValue(null);
    await assert.rejects(() => getAllLeads(), { message: "Unauthorized" });
  });

  test("returns empty array on Firestore error", async () => {
    mockGetSessionUser.mockResolvedValue(fakeUser);
    mockGet.mockRejectedValue(new Error("Firestore down"));
    const leads = await getAllLeads();
    assert.deepEqual(leads, []);
  });

  test("provides defaults for missing fields", async () => {
    mockGetSessionUser.mockResolvedValue(fakeUser);
    mockGet.mockResolvedValue(fakeSnap([fakeDoc("lead-3", {})]));

    const leads = await getAllLeads();
    assert.equal(leads[0].name, "");
    assert.equal(leads[0].email, "");
    assert.equal(leads[0].status, "new");
    assert.equal(leads[0].source, "contact");
    assert.equal(leads[0].nurture_enrolled, false);
  });
});

describe("getLead", () => {
  beforeEach(() => {
    mockGetSessionUser.mockReset();
    mockGet.mockReset();
  });

  test("returns a lead when found", async () => {
    mockGetSessionUser.mockResolvedValue(fakeUser);
    mockGet.mockResolvedValue(
      fakeDoc("lead-1", { name: "Jane", email: "j@x.com", status: "new", source: "contact" })
    );

    const lead = await getLead("lead-1");
    assert.ok(lead);
    assert.equal(lead.id, "lead-1");
    assert.equal(lead.name, "Jane");
  });

  test("returns null when lead does not exist", async () => {
    mockGetSessionUser.mockResolvedValue(fakeUser);
    mockGet.mockResolvedValue({ exists: false, id: "x", data: () => null });

    const lead = await getLead("nonexistent");
    assert.equal(lead, null);
  });

  test("throws when not authenticated", async () => {
    mockGetSessionUser.mockResolvedValue(null);
    await assert.rejects(() => getLead("lead-1"), { message: "Unauthorized" });
  });

  test("returns null on Firestore error", async () => {
    mockGetSessionUser.mockResolvedValue(fakeUser);
    mockGet.mockRejectedValue(new Error("Firestore error"));
    const lead = await getLead("lead-1");
    assert.equal(lead, null);
  });
});

describe("updateLeadStatus", () => {
  beforeEach(() => {
    mockGetSessionUser.mockReset();
    mockGet.mockReset();
    mockUpdate.mockReset();
    mockAdd.mockReset();
    mockUpdate.mockResolvedValue(undefined);
    mockAdd.mockResolvedValue({ id: "activity-1" });
  });

  test("updates status and logs activity", async () => {
    mockGetSessionUser.mockResolvedValue(fakeUser);
    mockGet.mockResolvedValue(fakeDoc("lead-1", { status: "new" }));

    const result = await updateLeadStatus("lead-1", "qualified");
    assert.equal(result.success, true);
    assert.equal(mockUpdate.mock.calls.length, 1);
    const updateArg = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    assert.equal(updateArg.status, "qualified");

    // Activity logged
    assert.equal(mockAdd.mock.calls.length, 1);
    const activity = mockAdd.mock.calls[0][0] as Record<string, unknown>;
    assert.equal(activity.type, "status_change");
    assert.ok((activity.content as string).includes("new → qualified"));
    assert.equal(activity.author, "admin@example.com");
  });

  test("rejects invalid status", async () => {
    mockGetSessionUser.mockResolvedValue(fakeUser);
    const result = await updateLeadStatus("lead-1", "invalid_status");
    assert.equal(result.success, false);
    assert.equal(result.error, "Invalid status");
  });

  test("accepts all valid statuses", async () => {
    mockGetSessionUser.mockResolvedValue(fakeUser);
    mockGet.mockResolvedValue(fakeDoc("lead-1", { status: "new" }));

    for (const status of ["new", "qualified", "booked", "closed", "unqualified"]) {
      mockUpdate.mockClear();
      mockAdd.mockClear();
      const result = await updateLeadStatus("lead-1", status);
      assert.equal(result.success, true, `Expected success for status: ${status}`);
    }
  });

  test("returns error on Firestore failure", async () => {
    mockGetSessionUser.mockResolvedValue(fakeUser);
    mockGet.mockRejectedValue(new Error("DB error"));
    const result = await updateLeadStatus("lead-1", "qualified");
    assert.equal(result.success, false);
    assert.ok(result.error);
  });
});

describe("setLeadFollowUp", () => {
  beforeEach(() => {
    mockGetSessionUser.mockReset();
    mockUpdate.mockReset();
    mockAdd.mockReset();
    mockUpdate.mockResolvedValue(undefined);
    mockAdd.mockResolvedValue({ id: "activity-1" });
  });

  test("sets follow-up date at noon and logs activity", async () => {
    mockGetSessionUser.mockResolvedValue(fakeUser);
    const result = await setLeadFollowUp("lead-1", "2025-06-15", "Call back");
    assert.equal(result.success, true);

    const updateArg = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    const followUp = updateArg.follow_up_at as Date;
    assert.equal(followUp.getHours(), 12);
    assert.equal(followUp.getMinutes(), 0);
    assert.equal(updateArg.follow_up_note, "Call back");

    const activity = mockAdd.mock.calls[0][0] as Record<string, unknown>;
    assert.equal(activity.type, "note");
    assert.ok((activity.content as string).includes("Follow-up set"));
    assert.ok((activity.content as string).includes("Call back"));
  });

  test("sets empty note when note is omitted", async () => {
    mockGetSessionUser.mockResolvedValue(fakeUser);
    await setLeadFollowUp("lead-1", "2025-06-15");

    const updateArg = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    assert.equal(updateArg.follow_up_note, "");
  });

  test("returns error on Firestore failure", async () => {
    mockGetSessionUser.mockResolvedValue(fakeUser);
    mockUpdate.mockRejectedValue(new Error("DB error"));
    const result = await setLeadFollowUp("lead-1", "2025-06-15");
    assert.equal(result.success, false);
  });
});

describe("clearLeadFollowUp", () => {
  beforeEach(() => {
    mockGetSessionUser.mockReset();
    mockUpdate.mockReset();
    mockUpdate.mockResolvedValue(undefined);
  });

  test("deletes follow-up fields", async () => {
    mockGetSessionUser.mockResolvedValue(fakeUser);
    const result = await clearLeadFollowUp("lead-1");
    assert.equal(result.success, true);

    const updateArg = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    assert.equal(updateArg.follow_up_at, "__DELETE__");
    assert.equal(updateArg.follow_up_note, "__DELETE__");
    assert.ok(updateArg.updated_at instanceof Date);
  });

  test("returns error on failure", async () => {
    mockGetSessionUser.mockResolvedValue(fakeUser);
    mockUpdate.mockRejectedValue(new Error("DB error"));
    const result = await clearLeadFollowUp("lead-1");
    assert.equal(result.success, false);
  });
});

describe("getFollowUps", () => {
  beforeEach(() => {
    mockGetSessionUser.mockReset();
    mockGet.mockReset();
    mockWhere.mockClear();
  });

  test("returns leads with follow-ups, excluding closed and unqualified", async () => {
    mockGetSessionUser.mockResolvedValue(fakeUser);
    mockGet.mockResolvedValue(
      fakeSnap([
        fakeDoc("lead-1", { status: "new", follow_up_at: "2025-06-15T12:00:00Z", name: "Jane", email: "j@x.com", source: "contact" }),
        fakeDoc("lead-2", { status: "closed", follow_up_at: "2025-06-16T12:00:00Z", name: "Bob", email: "b@x.com", source: "contact" }),
        fakeDoc("lead-3", { status: "qualified", follow_up_at: "2025-06-17T12:00:00Z", name: "Ann", email: "a@x.com", source: "contact" }),
        fakeDoc("lead-4", { status: "unqualified", follow_up_at: "2025-06-18T12:00:00Z", name: "Tim", email: "t@x.com", source: "contact" }),
      ])
    );

    const leads = await getFollowUps();
    assert.equal(leads.length, 2);
    assert.equal(leads[0].id, "lead-1");
    assert.equal(leads[1].id, "lead-3");
  });

  test("returns empty array on error", async () => {
    mockGetSessionUser.mockResolvedValue(fakeUser);
    mockGet.mockRejectedValue(new Error("Firestore error"));
    const leads = await getFollowUps();
    assert.deepEqual(leads, []);
  });
});

describe("exportLeadsCSV", () => {
  beforeEach(() => {
    mockGetSessionUser.mockReset();
    mockGet.mockReset();
  });

  test("returns CSV string from leads", async () => {
    mockGetSessionUser.mockResolvedValue(fakeUser);
    mockGet.mockResolvedValue(
      fakeSnap([
        fakeDoc("lead-1", { name: "Jane", email: "j@x.com", status: "new", source: "contact" }),
      ])
    );

    const csv = await exportLeadsCSV();
    assert.ok(csv.includes("lead-1"));
  });
});
