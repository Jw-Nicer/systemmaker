import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("variants manager resyncs local items from refreshed server props", () => {
  const source = readFileSync(
    join(process.cwd(), "app", "admin", "(authenticated)", "variants", "VariantsManager.tsx"),
    "utf8"
  );

  assert.match(source, /useEffect\(\(\) => \{\s*setItems\(initialData\);/);
});

test("experiments manager resyncs local items from refreshed server props", () => {
  const source = readFileSync(
    join(process.cwd(), "app", "admin", "(authenticated)", "experiments", "ExperimentsManager.tsx"),
    "utf8"
  );

  assert.match(source, /useEffect\(\(\) => \{\s*setItems\(initialData\);/);
});
