// Load .env from the monorepo root before anything else.
// dotenv is a pipeline-only dependency — it never ships to the browser.
import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { runPipeline } from './run.js';
import { closeDatabase } from './db/sqlite.js';

// Resolve the .env file relative to the monorepo root (three levels up from
// packages/pipeline/dist/cli.js  →  packages/pipeline  →  packages  →  root)
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const envPath = resolve(__dirname, '..', '..', '..', '.env');
loadDotenv({ path: envPath });

// ── Startup secret checks ───────────────────────────────────────────────────
// We verify presence only — values are never printed or logged.
const REQUIRED_VARS = ['GITHUB_TOKEN', 'GROQ_API_KEY', 'GEMINI_API_KEY'] as const;

function checkEnv(): void {
  const missing = REQUIRED_VARS.filter(v => !process.env[v]?.trim());
  if (missing.length > 0) {
    for (const v of missing) {
      process.stderr.write(
        `[ColdCase] Missing required environment variable: ${v}\n` +
        `  Add it to your .env file or export it in your shell.\n`
      );
    }
    process.exit(1);
  }
}

// ── CLI ─────────────────────────────────────────────────────────────────────
const program = new Command();

program
  .name('coldcase-pipeline')
  .description('Offline forensic analysis pipeline for code history')
  .requiredOption('--repo <owner/repo>', 'GitHub repository owner/name')
  .option('--top <number>', 'Number of hotspot files to analyze', '10')
  .option('--out <dir>', 'Snapshot output directory', 'data/demo')
  .option('--db <path>', 'SQLite database path', '.cache/coldcase.db')
  .option('--dry-run', 'Run pipeline up to evidence ledger without LLM execution', false)
  .option('--verbose', 'Print verbose timing and logs', false)
  .option('--skip-env-check', 'Skip the API-key startup check (use with --dry-run)', false)
  .action(async (options) => {
    if (!options.skipEnvCheck) {
      checkEnv();
    }

    try {
      if (options.verbose) {
        process.env.VERBOSE = 'true';
      }
      const topN = parseInt(options.top, 10);
      await runPipeline({
        repo: options.repo,
        top: isNaN(topN) ? 10 : topN,
        out: options.out,
        db: options.db,
        dryRun: Boolean(options.dryRun),
      });
      closeDatabase();
      process.exit(0);
    } catch (error) {
      process.stderr.write(
        JSON.stringify({
          pipeline: 'failed',
          error: error instanceof Error ? error.message : String(error),
        }) + '\n'
      );
      process.exit(1);
    }
  });

program.parse(process.argv);
