import { AzuriteContainer } from "@testcontainers/azurite";
import type { StartedAzuriteContainer } from "@testcontainers/azurite";
import { GenericContainer } from "testcontainers";
import type { StartedTestContainer } from "testcontainers";
import { StorageProvider } from "@repo/storage";

const AZURE_TEST_CONFIG = {
  // Digest-pinned for reproducibility; bump the tag and digest together.
  image:
    "mcr.microsoft.com/azure-storage/azurite:3.35.0@sha256:647c63a91102a9d8e8000aab803436e1fc85fbb285e7ce830a82ee5d6661cf37",
  containerName: "test-files",
} as const;

const MINIO_TEST_CONFIG = {
  // Chainguard's build, because MinIO no longer publishes a publicly pullable
  // image anywhere. Docker Hub's `minio/minio` went first (registry 401, Hub
  // API 404), so this pointed at quay.io — MinIO's own registry, same artifact,
  // a source swap rather than an image swap. On 2026-09-24 that closed too:
  // `quay.io/api/v1/repository/minio/minio` answers 401 where a public repo
  // answers 200, and neither the tag nor the pinned digest resolves any more.
  // The storage-minio leg then failed at global setup, before a single test,
  // with the Docker daemon's "(HTTP code 500) … unauthorized".
  //
  // This one IS an image swap: a different vendor's build of the same server,
  // and a newer release than the one pinned before. It runs under the same
  // `server /data` command and the same root-credential environment, and its
  // non-root user (65532) writes to `/data` without help.
  //
  // Digest-pinned for reproducibility, but note the tag: Chainguard's free
  // tier publishes only `latest`, so there is no version to pin beside the
  // digest, and old digests are garbage-collected rather than kept forever.
  // Expect to bump this. Mirroring the image into the organization's own
  // registry is the durable fix, tracked in
  // https://github.com/undp/carbon-footprint-program/issues/662.
  image:
    "chainguard/minio:latest@sha256:bd014394a80898e68c149f2311fdf8d5a2c2f3bb2c33b9327ae6d02b4b065ae1",
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
 * Starts the storage testcontainer for the given provider. The provider is
 * chosen by the caller (globalSetup, from the Vitest project name) rather than
 * read from `process.env`, so the three projects can boot different providers in
 * a single run without contending on a shared env var.
 */
export async function setupTestStorage(provider: StorageProvider): Promise<{
  descriptor: TestStorageDescriptor;
  container: TestStorageContainer;
}> {
  if (provider === StorageProvider.MINIO) {
    return setupMinioTestStorage();
  }
  if (provider === StorageProvider.AZURE_BLOB_STORAGE) {
    return setupAzureTestStorage();
  }
  throw new Error(
    `Invalid storage provider for tests: "${String(provider)}". Expected ${Object.values(StorageProvider).join(" or ")}.`
  );
}
