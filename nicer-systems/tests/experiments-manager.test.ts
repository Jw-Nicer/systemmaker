import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("experiments manager exposes stop and restart controls", () => {
  const source = readFileSync(
    join(process.cwd(), "app", "admin", "(authenticated)", "experiments", "ExperimentsManager.tsx"),
    "utf8"
  );

  assert.match(source, /stopExperiment/);
  assert.match(source, /handleStop/);
  assert.match(source, /Stop/);
  assert.match(source, /Restart/);
  assert.match(source, /status === "stopped"/);
});
