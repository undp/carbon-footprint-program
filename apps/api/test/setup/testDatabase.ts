import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import path from "node:path";

const TEST_DATABASE_CONFIG = {
  // Digest-pinned for reproducibility; bump the tag and digest together.
  image:
    "postgres:18.4-alpine@sha256:1b1689b20d16a014a3d195653381cf2caa75a41a92d93b255a9d6ea29fd353aa",
  database: "testdb",
  username: "testuser",
  password: "testpass",
} as const;

function getDatabasePackagePath(): string {
  return path.dirname(require.resolve("@repo/database/package.json"));
}

function getSeedPackagePath(): string {
  return path.dirname(require.resolve("@repo/seed/package.json"));
}

// pnpm-workspace.yaml sets `verifyDepsBeforeRun: install`, so `pnpm exec`/`pnpm run`
// would auto-install before running. These test-setup subprocesses execute right after
// a frozen install (node_modules is already in sync) with a stripped env that hides CI
// from the child, so that auto-install would abort while purging node_modules (no TTY)
// and fail the whole suite. Skip the pre-run deps check for these controlled calls.
const PNPM = "pnpm --config.verify-deps-before-run=false";

function createExecOptions(cwd: string, databaseUrl: string) {
  return {
    cwd,
    stdio: "inherit" as const,
    env: {
      // eslint-disable-next-line turbo/no-undeclared-env-vars
      PATH: process.env.PATH,
      // eslint-disable-next-line turbo/no-undeclared-env-vars
      HOME: process.env.HOME,
      DATABASE_URL: databaseUrl,
      SEEDS_DATASET: "testing",
    },
  };
}

export function runPrismaMigrations(databaseUrl: string): void {
  const command = `${PNPM} exec prisma migrate deploy`;
  const opts = createExecOptions(getDatabasePackagePath(), databaseUrl);

  try {
    execSync(command, opts);
    // eslint-disable-next-line no-console
    console.log("Prisma migrations executed successfully");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Error executing Prisma migrations: ${errorMessage}`, {
      cause: error,
    });
  }
}

export function runSeeds(databaseUrl: string): void {
  const command = `${PNPM} run seed`;
  const opts = createExecOptions(getSeedPackagePath(), databaseUrl);

  try {
    execSync(command, opts);
    // eslint-disable-next-line no-console
    console.log("Seeds executed successfully");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Error executing seeds: ${errorMessage}`, {
      cause: error,
    });
  }
}

export async function setupTestDatabase(): Promise<{
  databaseUrl: string;
  container: StartedPostgreSqlContainer;
}> {
  const container = await new PostgreSqlContainer(TEST_DATABASE_CONFIG.image)
    .withDatabase(TEST_DATABASE_CONFIG.database)
    .withUsername(TEST_DATABASE_CONFIG.username)
    .withPassword(TEST_DATABASE_CONFIG.password)
    .withStartupTimeout(180000) // 3 minutes – accounts for first-run image pull in CI
    .start();

  const baseUrl = container.getConnectionUri();
  const url = new URL(baseUrl);
  // Note: connection_limit is not set; Vitest runs files sequentially (fileParallelism: false).
  // url.searchParams.set("connection_limit", "1");
  const databaseUrl = url.toString();

  return { databaseUrl, container };
}
