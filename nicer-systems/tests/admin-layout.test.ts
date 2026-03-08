import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("admin layout uses a plain anchor for the view site action", () => {
  const filePath = join(process.cwd(), "app", "admin", "(authenticated)", "layout.tsx");
  const source = readFileSync(filePath, "utf8");

  assert.match(source, /<a\s+[\s\S]*href="\/"/);
  assert.match(source, /target="_blank"/);
  assert.match(source, /rel="noreferrer"/);
  assert.doesNotMatch(source, /<Link[\s\S]*View site/);
});
