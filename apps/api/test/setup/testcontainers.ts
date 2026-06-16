import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { AzuriteContainer } from "@testcontainers/azurite";
import type { StartedAzuriteContainer } from "@testcontainers/azurite";
import { GenericContainer } from "testcontainers";
import type { StartedTestContainer } from "testcontainers";
import { execSync } from "node:child_process";
import path from "node:path";
import { StorageProvider } from "@repo/storage";

const TEST_DATABASE_CONFIG = {
  image: "postgres:18-alpine",
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
  const command = "pnpm exec prisma migrate deploy";
  const opts = createExecOptions(getDatabasePackagePath(), databaseUrl);

  try {
    execSync(command, opts);
    // eslint-disable-next-line no-console
    console.log("Prisma migrations executed successfully");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Error executing Prisma migrations: ${errorMessage}`);
  }
}

export function runSeeds(databaseUrl: string): void {
  const command = "pnpm run seed";
  const opts = createExecOptions(getSeedPackagePath(), databaseUrl);

  try {
    execSync(command, opts);
    // eslint-disable-next-line no-console
    console.log("Seeds executed successfully");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Error executing seeds: ${errorMessage}`);
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

const AZURE_TEST_CONFIG = {
  image: "mcr.microsoft.com/azure-storage/azurite",
  containerName: "test-files",
} as const;

const MINIO_TEST_CONFIG = {
  image: "minio/minio:latest",
  bucket: "test-files",
  accessKey: "minioadmin",
  secretKey: "minioadmin",
  region: "us-east-1",
} as const;

/**
 * Test storage descriptor, discriminated by provider. Carries the values
 * workers need to construct a real adapter against the running testcontainer.
 */
export type TestStorageDescriptor =
  | {
      provider: StorageProvider.AZURE_BLOB_STORAGE;
      connectionString: string;
      containerName: string;
    }
  | {
      provider: StorageProvider.MINIO;
      endpoint: string;
      accessKey: string;
      secretKey: string;
      region: string;
      bucket: string;
    };

export type TestStorageContainer =
  | StartedAzuriteContainer
  | StartedTestContainer;

async function setupAzureTestStorage(): Promise<{
  descriptor: TestStorageDescriptor;
  container: StartedAzuriteContainer;
}> {
  const container = await new AzuriteContainer(AZURE_TEST_CONFIG.image)
    .withInMemoryPersistence()
    .withSkipApiVersionCheck()
    .withStartupTimeout(120000)
    .start();

  const connectionString = container.getConnectionString();

  // The blob container is created lazily (and idempotently) by
  // `createAzureBlobTestAdapter` in the app factory — no storage SDK here.

  // eslint-disable-next-line no-console
  console.log("Azurite storage started successfully");

  return {
    container,
    descriptor: {
      provider: StorageProvider.AZURE_BLOB_STORAGE,
      connectionString,
      containerName: AZURE_TEST_CONFIG.containerName,
    },
  };
}

async function setupMinioTestStorage(): Promise<{
  descriptor: TestStorageDescriptor;
  container: StartedTestContainer;
}> {
  const container = await new GenericContainer(MINIO_TEST_CONFIG.image)
    .withCommand(["server", "/data"])
    .withExposedPorts(9000)
    .withEnvironment({
      MINIO_ROOT_USER: MINIO_TEST_CONFIG.accessKey,
      MINIO_ROOT_PASSWORD: MINIO_TEST_CONFIG.secretKey,
    })
    .withStartupTimeout(120000)
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(9000);
  const endpoint = `http://${host}:${port}`;

  // The bucket is created lazily (and idempotently) by `createMinioTestAdapter`
  // in the app factory — no storage SDK here.

  // eslint-disable-next-line no-console
  console.log("MinIO storage started successfully");

  return {
    container,
    descriptor: {
      provider: StorageProvider.MINIO,
      endpoint,
      accessKey: MINIO_TEST_CONFIG.accessKey,
      secretKey: MINIO_TEST_CONFIG.secretKey,
      region: MINIO_TEST_CONFIG.region,
      bucket: MINIO_TEST_CONFIG.bucket,
    },
  };
}

/**
 * Starts the storage testcontainer matching `STORAGE_PROVIDER`.
 * Defaults to Azure Blob (Azurite) when the env var is unset, to preserve the
 * existing developer workflow.
 */
export async function setupTestStorage(): Promise<{
  descriptor: TestStorageDescriptor;
  container: TestStorageContainer;
}> {
  const provider = (process.env.STORAGE_PROVIDER ??
    StorageProvider.AZURE_BLOB_STORAGE) as StorageProvider;

  if (provider === StorageProvider.MINIO) {
    return setupMinioTestStorage();
  }
  if (provider === StorageProvider.AZURE_BLOB_STORAGE) {
    return setupAzureTestStorage();
  }
  throw new Error(
    `Invalid STORAGE_PROVIDER for tests: "${String(provider)}". Expected ${Object.values(StorageProvider).join(" or ")}.`
  );
}
