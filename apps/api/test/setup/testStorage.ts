import { AzuriteContainer } from "@testcontainers/azurite";
import type { StartedAzuriteContainer } from "@testcontainers/azurite";
import { GenericContainer } from "testcontainers";
import type { StartedTestContainer } from "testcontainers";
import { StorageProvider } from "@repo/storage";

const AZURE_TEST_CONFIG = {
  image: "mcr.microsoft.com/azure-storage/azurite:3.35.0",
  containerName: "test-files",
} as const;

const MINIO_TEST_CONFIG = {
  image: "minio/minio:RELEASE.2025-09-07T16-13-09Z",
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
  StartedAzuriteContainer | StartedTestContainer;

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
