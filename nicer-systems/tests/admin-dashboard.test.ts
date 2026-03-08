import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("dashboard includes lead and experiment metric cards", () => {
  const source = readFileSync(
    join(process.cwd(), "app", "admin", "(authenticated)", "page.tsx"),
    "utf8"
  );

  assert.match(source, /label: "Leads"/);
  assert.match(source, /key: "totalLeads"/);
  assert.match(source, /label: "Experiments"/);
  assert.match(source, /key: "totalExperiments"/);
});

test("dashboard surfaces a degraded-state message when metrics fail to load", () => {
  const source = readFileSync(
    join(process.cwd(), "app", "admin", "(authenticated)", "page.tsx"),
    "utf8"
  );

  assert.match(source, /loadError: true/);
  assert.match(source, /Dashboard metrics are partially unavailable right now/);
});
