import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { INPUT_CLASS_NAME } from "../hooks/useCrudManager";

test("INPUT_CLASS_NAME is a non-empty string with expected Tailwind classes", () => {
  assert.ok(INPUT_CLASS_NAME.length > 0);
  assert.ok(INPUT_CLASS_NAME.includes("rounded-[18px]"));
  assert.ok(INPUT_CLASS_NAME.includes("border"));
  assert.ok(INPUT_CLASS_NAME.includes("focus:border-[#92a07a]"));
});

test("INPUT_CLASS_NAME matches the previously duplicated value exactly", () => {
  const expected =
    "w-full rounded-[18px] border border-[#d7d0c1] bg-[#fbf7ef] px-4 py-3 text-sm text-[#1d2318] outline-none transition-colors focus:border-[#92a07a]";
  assert.equal(INPUT_CLASS_NAME, expected);
});

test("useCrudManager syncs local items when server props refresh", () => {
  const source = readFileSync(
    join(process.cwd(), "hooks", "useCrudManager.ts"),
    "utf8"
  );

  assert.match(source, /useEffect\(\(\) => \{\s*setItems\(initialData\);/);
});

test("useCrudManager reverts optimistic reorder when the action returns success false", () => {
  const source = readFileSync(
    join(process.cwd(), "hooks", "useCrudManager.ts"),
    "utf8"
  );

  assert.match(source, /const result = await actions\.reorder/);
  assert.match(source, /if \(result && !result\.success\) \{\s*setItems\(previous\);/);
});
