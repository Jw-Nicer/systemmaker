import { test, describe } from "vitest";
import assert from "node:assert/strict";
import {
  generateEditToken,
  hashEditToken,
  verifyEditToken,
} from "@/lib/plans/edit-token";

describe("generateEditToken", () => {
  test("returns a 48-char hex string", () => {
    const t = generateEditToken();
    assert.equal(t.length, 48);
    assert.match(t, /^[0-9a-f]+$/);
  });

  test("returns distinct values across calls", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) seen.add(generateEditToken());
    assert.equal(seen.size, 20);
  });
});

describe("hashEditToken", () => {
  test("returns a stable 64-char sha256 hex digest", () => {
    const hash = hashEditToken("abc123");
    assert.equal(hash.length, 64);
    assert.match(hash, /^[0-9a-f]+$/);
    assert.equal(hashEditToken("abc123"), hash);
  });

  test("different tokens produce different hashes", () => {
    assert.notEqual(hashEditToken("a"), hashEditToken("b"));
  });
});

describe("verifyEditToken", () => {
  test("returns true when token matches one of the stored hashes", () => {
    const token = generateEditToken();
    const other = generateEditToken();
    const hashes = [hashEditToken(other), hashEditToken(token)];
    assert.equal(verifyEditToken(token, hashes), true);
  });

  test("returns false when no hash matches", () => {
    const token = generateEditToken();
    const hashes = [hashEditToken(generateEditToken())];
    assert.equal(verifyEditToken(token, hashes), false);
  });

  test("returns false for empty/missing inputs", () => {
    assert.equal(verifyEditToken("", [hashEditToken("x")]), false);
    assert.equal(verifyEditToken("x", []), false);
    assert.equal(verifyEditToken("x", undefined), false);
    assert.equal(verifyEditToken("x", null), false);
  });

  test("ignores non-string entries in the hashes array", () => {
    const token = generateEditToken();
    const hashes = [123, null, hashEditToken(token)];
    assert.equal(verifyEditToken(token, hashes as unknown), true);
  });

  test("rejects malformed hex entries without throwing", () => {
    const token = generateEditToken();
    assert.equal(verifyEditToken(token, ["not-hex", "zz"]), false);
  });
});
