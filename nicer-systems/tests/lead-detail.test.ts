import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("lead detail exposes a public plan link when plan_id is available", () => {
  const source = readFileSync(
    join(process.cwd(), "app", "admin", "(authenticated)", "leads", "[id]", "LeadDetail.tsx"),
    "utf8"
  );

  assert.match(source, /lead\.plan_id/);
  assert.match(source, /href=\{`\/plan\/\$\{lead\.plan_id\}`\}/);
  assert.match(source, /View plan/);
});

test("lead detail only clears follow-up state after a successful server action", () => {
  const source = readFileSync(
    join(process.cwd(), "app", "admin", "(authenticated)", "leads", "[id]", "LeadDetail.tsx"),
    "utf8"
  );

  assert.match(source, /const result = await clearLeadFollowUp\(lead\.id\);/);
  assert.match(source, /if \(result\.success\) \{/);
});
