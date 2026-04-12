/**
 * Run the chat eval suite from the command line.
 *
 * Usage:
 *   npm run eval:chat                    # run full suite
 *   npm run eval:chat -- --concurrency 2 # limit parallelism
 *   npm run eval:chat -- --threshold 0.8 # exit non-zero below 80% pass rate
 *
 * Environment:
 *   GOOGLE_GEMINI_API_KEY  required (uses real Gemini for both agent + judge)
 *   GOOGLE_GEMINI_MODEL    optional override for the agent under test
 *
 * The script makes real LLM calls — costs API credits. Use sparingly.
 */
import "dotenv/config";
import { runChatEvalSuite } from "@/lib/agents/chat-evals";
import { CHAT_EVAL_CASES } from "@/lib/agents/chat-eval-cases";
import type { ChatEvalSuiteSummary, ChatEvalResult } from "@/lib/agents/chat-evals";

interface CliFlags {
  concurrency: number;
  threshold: number;
  filter?: string;
}

function parseFlags(argv: string[]): CliFlags {
  const flags: CliFlags = { concurrency: 4, threshold: 0.8 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--concurrency" && argv[i + 1]) {
      flags.concurrency = Math.max(1, Number.parseInt(argv[++i], 10) || 4);
    } else if (arg === "--threshold" && argv[i + 1]) {
      flags.threshold = Math.max(0, Math.min(1, Number.parseFloat(argv[++i]) || 0.8));
    } else if (arg === "--filter" && argv[i + 1]) {
      flags.filter = argv[++i];
    }
  }
  return flags;
}

function bold(s: string) {
  return `\x1b[1m${s}\x1b[0m`;
}
function green(s: string) {
  return `\x1b[32m${s}\x1b[0m`;
}
function red(s: string) {
  return `\x1b[31m${s}\x1b[0m`;
}
function dim(s: string) {
  return `\x1b[90m${s}\x1b[0m`;
}

function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function printResult(r: ChatEvalResult) {
  const tag = r.passed ? green("PASS") : red("FAIL");
  const phase = dim(`[${r.phase}]`);
  const score = `${r.score.toFixed(2)}`;
  console.log(`  ${tag} ${phase} ${r.caseId} ${dim(`(${score})`)}`);
  if (!r.passed) {
    for (const v of r.verdicts.filter((v) => !v.passed)) {
      console.log(dim(`        ✗ ${v.id}: ${v.rationale}`));
    }
    console.log(dim(`        response: ${r.response.slice(0, 160).replace(/\n/g, " ")}${r.response.length > 160 ? "…" : ""}`));
  }
}

function printSuiteSummary(s: ChatEvalSuiteSummary) {
  console.log("");
  console.log(bold("─".repeat(60)));
  console.log(bold("Suite summary"));
  console.log(bold("─".repeat(60)));
  console.log(
    `  Cases:        ${s.passedCases}/${s.totalCases} passed  ${dim(`(${pct(s.passRate)})`)}`
  );
  console.log(`  Latency:      ${(s.totalLatencyMs / 1000).toFixed(1)}s`);
  console.log("");
  console.log(bold("Per phase"));
  for (const [phase, agg] of Object.entries(s.passRateByPhase)) {
    if (agg.total === 0) continue;
    const tag = agg.rate >= 0.8 ? green(pct(agg.rate)) : red(pct(agg.rate));
    console.log(`  ${phase.padEnd(11)} ${agg.passed}/${agg.total}  ${tag}`);
  }
  console.log("");
  console.log(bold("Per criterion"));
  const sortedCriteria = Object.entries(s.passRateByCriterion).sort(
    (a, b) => a[1].rate - b[1].rate
  );
  for (const [id, agg] of sortedCriteria) {
    const tag = agg.rate >= 0.8 ? green(pct(agg.rate)) : red(pct(agg.rate));
    console.log(`  ${id.padEnd(28)} ${agg.passed}/${agg.total}  ${tag}`);
  }
  console.log("");
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));

  const cases = flags.filter
    ? CHAT_EVAL_CASES.filter((c) => c.id.includes(flags.filter!))
    : CHAT_EVAL_CASES;

  if (cases.length === 0) {
    console.error(red(`No cases match filter "${flags.filter}"`));
    process.exit(1);
  }

  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    console.error(red("GOOGLE_GEMINI_API_KEY is not set"));
    process.exit(1);
  }

  console.log(
    bold(`\nRunning ${cases.length} chat eval cases (concurrency=${flags.concurrency})\n`)
  );

  const summary = await runChatEvalSuite(cases, {
    concurrency: flags.concurrency,
  });

  // Print individual results sorted by phase, then by id
  const sorted = [...summary.results].sort((a, b) => {
    if (a.phase !== b.phase) return a.phase.localeCompare(b.phase);
    return a.caseId.localeCompare(b.caseId);
  });
  for (const r of sorted) printResult(r);

  printSuiteSummary(summary);

  if (summary.passRate < flags.threshold) {
    console.error(
      red(
        `\n✗ Suite pass rate ${pct(summary.passRate)} is below threshold ${pct(flags.threshold)}\n`
      )
    );
    process.exit(1);
  }

  console.log(green(`\n✓ Suite passed (≥ ${pct(flags.threshold)})\n`));
}

main().catch((err) => {
  console.error(red(`\nEval run failed: ${err instanceof Error ? err.message : String(err)}\n`));
  process.exit(1);
});
