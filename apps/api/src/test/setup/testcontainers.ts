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

export function getDatabasePackagePath(): string {
  return path.resolve(__dirname, "../../../../../packages/database");
}

export function runPrismaMigrations(databaseUrl: string): void {
  const databasePackagePath = getDatabasePackagePath();

  const command = "pnpm exec prisma migrate deploy";
  const options = {
    cwd: databasePackagePath,
    stdio: "inherit" as const,
    env: {
      DATABASE_URL: databaseUrl,
    },
  };

  try {
    execSync(command, options);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Error al ejecutar migraciones de Prisma: ${errorMessage}`);
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
    .start();
  const databaseUrl = container.getConnectionUri();
  return { databaseUrl, container };
}
