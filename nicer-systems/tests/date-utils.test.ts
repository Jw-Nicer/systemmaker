import { test } from "vitest";
import assert from "node:assert/strict";
import {
  formatDateLabel,
  formatDateTimeLabel,
  isPastDate,
  parseDateValue,
  toDateInputValue,
} from "@/lib/date";

test("date helpers safely handle invalid values", () => {
  assert.equal(parseDateValue("not-a-date"), null);
  assert.equal(toDateInputValue("not-a-date"), "");
  assert.equal(formatDateLabel("not-a-date"), "not-a-date");
  assert.equal(formatDateTimeLabel("not-a-date"), "not-a-date");
  assert.equal(isPastDate("not-a-date"), false);
});

test("date helpers format valid values consistently", () => {
  assert.equal(toDateInputValue("2026-03-08T12:00:00.000Z"), "2026-03-08");
  assert.equal(formatDateLabel("2026-03-08T12:00:00.000Z"), "Mar 8, 2026");
});
