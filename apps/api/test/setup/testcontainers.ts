import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import path from "node:path";

const TEST_DATABASE_CONFIG = {
  image: "postgres:18-alpine",
  database: "testdb",
  username: "testuser",
  password: "testpass",
} as const;

function getDatabasePackagePath(): string {
  return path.dirname(require.resolve("@repo/database/package.json"));
}

function createPrismaExecOptions(databaseUrl: string) {
  return {
    cwd: getDatabasePackagePath(),
    stdio: "inherit" as const,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      SEEDS_DATASET: "testing",
    },
  };
}

export function runPrismaMigrations(databaseUrl: string): void {
  const command = "pnpm exec prisma migrate deploy";
  const opts = createPrismaExecOptions(databaseUrl);

  try {
    execSync(command, opts);
    // eslint-disable-next-line no-console
    console.log("Prisma migrations executed successfully");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Error executing Prisma migrations: ${errorMessage}`);
  }
}

export function runPrismaSeeds(databaseUrl: string): void {
  const command = "pnpm exec prisma db seed";
  const opts = createPrismaExecOptions(databaseUrl);

  try {
    execSync(command, opts);
    // eslint-disable-next-line no-console
    console.log("Prisma seeds executed successfully");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Error executing Prisma seeds: ${errorMessage}`);
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
