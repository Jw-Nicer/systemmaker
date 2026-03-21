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

const HASH_PATTERN = /firebase-admin-[a-f0-9]{16}/g;
const REAL_NAME = "firebase-admin";

const ROOT = path.join(__dirname, "..");

// Directories to patch — both the build output and the Firebase deploy staging area
const TARGETS = [
  path.join(ROOT, ".next", "server"),
  path.join(ROOT, ".firebase", "nicer-systems", "functions", ".next", "server"),
];

let totalFiles = 0;
let totalReplacements = 0;

function walk(dir) {
  let files = 0;
  let reps = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = walk(full);
      files += sub.files;
      reps += sub.reps;
    } else if (/\.(js|json)$/.test(entry.name)) {
      const content = fs.readFileSync(full, "utf8");
      const matches = content.match(HASH_PATTERN);
      if (matches) {
        fs.writeFileSync(full, content.replace(HASH_PATTERN, REAL_NAME));
        files++;
        reps += matches.length;
      }
    }
  }
  return { files, reps };
}

for (const dir of TARGETS) {
  if (!fs.existsSync(dir)) continue;
  const { files, reps } = walk(dir);
  if (files > 0) {
    const label = path.relative(ROOT, dir);
    console.log(`  ✓ ${label}: ${reps} replacements in ${files} files`);
  }
  totalFiles += files;
  totalReplacements += reps;
}

if (totalFiles > 0) {
  console.log(
    `✓ Fixed Turbopack external hashing: ${totalReplacements} total replacements in ${totalFiles} files`
  );
} else {
  console.log("✓ No Turbopack external hashing issues found");
}
