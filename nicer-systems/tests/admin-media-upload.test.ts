import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("case studies manager uses the shared image upload field", () => {
  const source = readFileSync(
    join(process.cwd(), "app", "admin", "(authenticated)", "case-studies", "CaseStudiesManager.tsx"),
    "utf8"
  );

  assert.match(source, /ImageUploadField/);
  assert.match(source, /pathPrefix="admin\/case-studies"/);
});

test("testimonials manager uses the shared image upload field", () => {
  const source = readFileSync(
    join(process.cwd(), "app", "admin", "(authenticated)", "testimonials", "TestimonialsManager.tsx"),
    "utf8"
  );

  assert.match(source, /ImageUploadField/);
  assert.match(source, /pathPrefix="admin\/testimonials"/);
});
