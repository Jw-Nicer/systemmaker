import { test } from "vitest";
import assert from "node:assert/strict";

import type { ActionResult } from "../lib/actions/types";

test("ActionResult<void> shape has success and optional error", () => {
  // Type-level checks: these should compile without error
  const ok: ActionResult = { success: true };
  const fail: ActionResult = { success: false, error: "Something failed" };
  assert.equal(ok.success, true);
  assert.equal(ok.error, undefined);
  assert.equal(fail.success, false);
  assert.equal(fail.error, "Something failed");
});

test("ActionResult<{id: string}> shape extends base with id", () => {
  const ok: ActionResult<{ id: string }> = { success: true, id: "abc-123" };
  const fail: ActionResult<{ id: string }> = { success: false, error: "Nope" };
  assert.equal(ok.success, true);
  assert.equal(ok.id, "abc-123");
  assert.equal(fail.success, false);
  assert.equal(fail.error, "Nope");
});
