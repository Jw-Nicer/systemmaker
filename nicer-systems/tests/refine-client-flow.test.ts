import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("useRefineSection previews with /api/agent/refine and persists with /api/agent/refine/apply", () => {
  const source = readFileSync(
    join(process.cwd(), "hooks", "useRefineSection.ts"),
    "utf8"
  );

  assert.match(source, /fetch\("\/api\/agent\/refine"/);
  assert.match(source, /fetch\("\/api\/agent\/refine\/apply"/);
});

test("SectionRefiner applies saved content only after applyRefinement succeeds", () => {
  const source = readFileSync(
    join(process.cwd(), "components", "marketing", "SectionRefiner.tsx"),
    "utf8"
  );

  assert.match(source, /const savedContent = await applyRefinement\(\);/);
  assert.match(source, /if \(savedContent\) \{\s*onRefined\(sectionKey, savedContent\);/);
});

test("PlanWithRefine no longer shows a saving state before persistence happens", () => {
  const source = readFileSync(
    join(process.cwd(), "app", "(marketing)", "plan", "[id]", "PlanWithRefine.tsx"),
    "utf8"
  );

  assert.doesNotMatch(source, /saveStatus === "saving"/);
  assert.match(source, /useState<"idle" \| "saved" \| "error">/);
});
