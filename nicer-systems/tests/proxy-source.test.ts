import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

test("proxy does not redirect /admin/login based solely on a session cookie", () => {
  const source = readFileSync(
    path.join(process.cwd(), "proxy.ts"),
    "utf8"
  );

  assert.doesNotMatch(
    source,
    /request\.nextUrl\.pathname === "\/admin\/login"[\s\S]*sessionCookie/
  );
});
