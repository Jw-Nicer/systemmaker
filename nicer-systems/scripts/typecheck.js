const { spawnSync } = require("node:child_process");

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (typeof result.status === "number") {
    return result.status;
  }

  if (result.error) {
    throw result.error;
  }

  return 1;
}

function runTypegenAndTsc() {
  if (run("next", ["typegen"]) !== 0) {
    return 1;
  }

  return run("tsc", ["--noEmit"]);
}

const firstAttempt = runTypegenAndTsc();

if (firstAttempt === 0) {
  process.exit(0);
}

// Next.js 16 intermittently omits .next/types/cache-life.d.ts on the first pass.
// A second immediate run has been consistently sufficient in this repo.
process.exit(runTypegenAndTsc());
