import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { AzuriteContainer } from "@testcontainers/azurite";
import type { StartedAzuriteContainer } from "@testcontainers/azurite";
import { BlobServiceClient } from "@azure/storage-blob";
import { execSync } from "node:child_process";
import path from "node:path";

const TEST_DATABASE_CONFIG = {
  image: "pgvector/pgvector:pg18",
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
  // On Windows, `localhost` resolves to `::1` (IPv6) first, but Docker
  // Desktop only binds `0.0.0.0` (IPv4) by default — Prisma then fails with
  // P1001 "Can't reach database server". Force IPv4 here so the URL works
  // identically across macOS/Linux/Windows hosts.
  if (url.hostname === "localhost") {
    url.hostname = "127.0.0.1";
  }
  // Note: connection_limit is not set; Vitest runs files sequentially (fileParallelism: false).
  // url.searchParams.set("connection_limit", "1");
  const databaseUrl = url.toString();

  return { databaseUrl, container };
}

const TEST_STORAGE_CONFIG = {
  image: "mcr.microsoft.com/azure-storage/azurite",
  containerName: "test-files",
} as const;

export async function setupTestStorage(): Promise<{
  connectionString: string;
  containerName: string;
  container: StartedAzuriteContainer;
}> {
  const container = await new AzuriteContainer(TEST_STORAGE_CONFIG.image)
    .withInMemoryPersistence()
    .withSkipApiVersionCheck()
    .withStartupTimeout(120000) // 2 minutes – accounts for first-run image pull in CI
    .start();

  const connectionString = container.getConnectionString();
  const containerName = TEST_STORAGE_CONFIG.containerName;

  // Pre-create the test container in Azurite
  const blobServiceClient =
    BlobServiceClient.fromConnectionString(connectionString);
  await blobServiceClient.getContainerClient(containerName).createIfNotExists();

  // eslint-disable-next-line no-console
  console.log("Azurite storage started successfully");

  return { connectionString, containerName, container };
}
