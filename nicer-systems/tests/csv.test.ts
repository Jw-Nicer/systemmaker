import { test } from "vitest";
import assert from "node:assert/strict";
import { escapeCsvCell } from "@/lib/csv";

test("escapeCsvCell quotes and escapes commas, quotes, and newlines", () => {
  assert.equal(escapeCsvCell('ACME, Inc.\n"Priority"'), "\"ACME, Inc.\n\"\"Priority\"\"\"");
  assert.equal(escapeCsvCell("plain"), "\"plain\"");
  assert.equal(escapeCsvCell(undefined), "\"\"");
});

test("escapeCsvCell neutralizes formula injection triggers", () => {
  assert.equal(escapeCsvCell("=HYPERLINK(\"http://evil\",\"x\")"), "\"'=HYPERLINK(\"\"http://evil\"\",\"\"x\"\")\"");
  assert.equal(escapeCsvCell("+cmd|calc"), "\"'+cmd|calc\"");
  assert.equal(escapeCsvCell("-2+3"), "\"'-2+3\"");
  assert.equal(escapeCsvCell("@sheet"), "\"'@sheet\"");
  assert.equal(escapeCsvCell("\tfoo"), "\"'\tfoo\"");
  assert.equal(escapeCsvCell("\rfoo"), "\"'\rfoo\"");
});

test("escapeCsvCell leaves benign leading characters alone", () => {
  assert.equal(escapeCsvCell("ACME"), "\"ACME\"");
  assert.equal(escapeCsvCell("123"), "\"123\"");
  assert.equal(escapeCsvCell(""), "\"\"");
});
