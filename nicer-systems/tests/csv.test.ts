import test from "node:test";
import assert from "node:assert/strict";
import { escapeCsvCell } from "@/lib/csv";

test("escapeCsvCell quotes and escapes commas, quotes, and newlines", () => {
  assert.equal(escapeCsvCell('ACME, Inc.\n"Priority"'), "\"ACME, Inc.\n\"\"Priority\"\"\"");
  assert.equal(escapeCsvCell("plain"), "\"plain\"");
  assert.equal(escapeCsvCell(undefined), "\"\"");
});
