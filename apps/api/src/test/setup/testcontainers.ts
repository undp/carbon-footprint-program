import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DATABASE_CONFIG = {
  image: "postgres:18-alpine",
  database: "testdb",
  username: "testuser",
  password: "testpass",
} as const;

export function runPrismaMigrations(databaseUrl: string): void {
  // Calculate path to prisma directory relative to this test file
  // From: apps/api/src/test/setup/testcontainers.ts
  // To: apps/api/prisma
  const prismaPath = path.resolve(__dirname, "../../../prisma");

  const command = "pnpm exec prisma migrate deploy";
  const options = {
    cwd: prismaPath,
    stdio: "pipe" as const,
    env: {
      // eslint-disable-next-line turbo/no-undeclared-env-vars
      PATH: process.env.PATH,
      DATABASE_URL: databaseUrl,
    },
  };

  try {
    execSync(command, options);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Error executing Prisma migrations: ${errorMessage}`);
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
    .withStartupTimeout(120000) // 2 minutes
    .start();

  const baseUrl = container.getConnectionUri();
  const url = new URL(baseUrl);
  url.searchParams.set("connection_limit", "1");
  const databaseUrl = url.toString();

  return { databaseUrl, container };
}
