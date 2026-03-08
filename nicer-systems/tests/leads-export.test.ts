import test from "node:test";
import assert from "node:assert/strict";
import { buildLeadsCSV, filterLeadsForExport } from "@/lib/leads/export";
import {
  type Lead,
} from "@/types/lead";

const LEADS: Lead[] = [
  {
    id: "lead_1",
    name: "Alice",
    email: "alice@example.com",
    company: "Northwind",
    bottleneck: "Manual dispatch updates",
    tools: "Sheets",
    urgency: "high",
    status: "qualified",
    source: "contact",
    score: 55,
    created_at: "2026-03-01T12:00:00.000Z",
  },
  {
    id: "lead_2",
    name: "Bob",
    email: "bob@example.com",
    company: "Contoso",
    bottleneck: "Slow quote follow-up",
    tools: "Email",
    urgency: "medium",
    status: "new",
    source: "agent_chat",
    score: 20,
    created_at: "2026-03-02T12:00:00.000Z",
  },
  {
    id: "lead_3",
    name: "Carol",
    email: "carol@example.com",
    company: "Fabrikam",
    bottleneck: "Manual dispatch scheduling",
    tools: "Phone",
    urgency: "urgent",
    status: "qualified",
    source: "agent_demo",
    score: 65,
    created_at: "2026-03-03T12:00:00.000Z",
  },
];

test("filterLeadsForExport applies status and search filters", () => {
  const filtered = filterLeadsForExport(LEADS, {
    status: "qualified",
    search: "dispatch",
  });

  assert.deepEqual(
    filtered.map((lead) => lead.id),
    ["lead_1", "lead_3"]
  );
});

test("filterLeadsForExport sorts by score when requested", () => {
  const filtered = filterLeadsForExport(LEADS, {
    status: "qualified",
    sortBy: "score",
  });

  assert.deepEqual(
    filtered.map((lead) => lead.id),
    ["lead_3", "lead_1"]
  );
});

test("buildLeadsCSV serializes the filtered lead set", () => {
  const csv = buildLeadsCSV(filterLeadsForExport(LEADS, { status: "qualified" }));

  assert.match(csv, /^Name,Email,Company,Bottleneck,Tools,Urgency,Status,Source,Score,Nurture,Created/m);
  assert.match(csv, /Alice/);
  assert.match(csv, /Carol/);
  assert.doesNotMatch(csv, /Bob/);
});
