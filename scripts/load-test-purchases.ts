/**
 * Runs purchase concurrency load tests against an isolated SQLite DB (via Vitest).
 *
 * Usage:
 *   bun run scripts/load-test-purchases.ts           # 100 concurrent buyers
 *   bun run scripts/load-test-purchases.ts 500       # 500 concurrent
 *   LOAD_TEST_CONCURRENCY=1000 bun run scripts/load-test-purchases.ts
 *   RUN_FULL_LOAD_TESTS=1 bun run scripts/load-test-purchases.ts  # 100 + 500 + 1000
 *
 * For staging HTTP load tests, set DATABASE_URL to a disposable DB and TRUST_PROXY=true
 * behind your reverse proxy.
 */
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(scriptDir, "..")
const appDir = path.join(repoRoot, "app")

const concurrencyArg = process.argv[2]
const env: NodeJS.ProcessEnv = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL ?? `file:${path.join(repoRoot, "packages/shared/data/raffle-load-test.db")}`,
}

if (concurrencyArg && /^\d+$/.test(concurrencyArg)) {
  env.LOAD_TEST_CONCURRENCY = concurrencyArg
}

if (process.argv.includes("--full")) {
  env.RUN_FULL_LOAD_TESTS = "1"
}

const result = spawnSync(
  "pnpm",
  ["exec", "vitest", "run", "src/server/purchase.load.test.ts"],
  {
    cwd: appDir,
    env,
    stdio: "inherit",
    shell: true,
  },
)

process.exit(result.status ?? 1)
