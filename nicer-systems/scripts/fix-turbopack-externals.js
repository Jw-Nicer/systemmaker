/**
 * fix-turbopack-externals.js
 *
 * Workaround for a Turbopack bug in Next.js 16 where `serverExternalPackages`
 * entries get their names hashed (e.g. firebase-admin → firebase-admin-a14c8a5423a75469).
 * The Cloud Function runtime can't resolve the hashed name, so all dynamic SSR
 * routes crash with ERR_MODULE_NOT_FOUND.
 *
 * This script runs as a postbuild step and replaces every occurrence of the
 * hashed name with the real package name inside .next/server/.
 *
 * See: docs/KNOWN_ISSUES.md — Pattern P8
 */

const fs = require("fs");
const path = require("path");

const SERVER_DIR = path.join(__dirname, "..", ".next", "server");
const HASH_PATTERN = /firebase-admin-[a-f0-9]{16}/g;
const REAL_NAME = "firebase-admin";

let filesPatched = 0;
let replacements = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (/\.(js|json)$/.test(entry.name)) {
      const content = fs.readFileSync(full, "utf8");
      const matches = content.match(HASH_PATTERN);
      if (matches) {
        fs.writeFileSync(full, content.replace(HASH_PATTERN, REAL_NAME));
        filesPatched++;
        replacements += matches.length;
      }
    }
  }
}

if (!fs.existsSync(SERVER_DIR)) {
  console.log("⚠ .next/server not found — skipping external package fix");
  process.exit(0);
}

walk(SERVER_DIR);

if (filesPatched > 0) {
  console.log(
    `✓ Fixed Turbopack external hashing: ${replacements} replacements in ${filesPatched} files`
  );
} else {
  console.log("✓ No Turbopack external hashing issues found");
}
