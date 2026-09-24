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
  // Pulled from Chainguard. This is the second registry this image has moved
  // to: Docker Hub stopped serving `minio/minio` publicly (401 on the registry,
  // 404 on the Hub API), and quay.io — MinIO's own registry, taken as the
  // replacement — now answers the pull with "500 unauthorized: access to the
  // requested resource is not authorized", which fails the storage-minio CI leg
  // before a single test runs. It is not a flake: a re-run of the same job
  // reproduced it exactly.
  //
  // Unlike the Hub-to-quay move, this IS an image swap. Chainguard builds MinIO
  // from source on its own base, so the artifact differs even though the server
  // is the same: it runs as an unprivileged user and its entrypoint is the
  // `minio` binary, so the `server /data` command below is passed as arguments
  // to it rather than replacing it.
  //
  // Digest-pinned as everything else here is, but the guarantee is weaker: the
  // free tier serves `:latest` only — no release tags — and garbage-collects the
  // digests behind it, so this pin has to be refreshed when the pull starts
  // failing rather than bumped alongside a version. That is the cost of the
  // move, and the reason to revisit it once MinIO publishes somewhere pullable
  // again.
  image:
    "cgr.dev/chainguard/minio:latest@sha256:7abc41a42aa78685a2fa48a9088e539625114ac4fc236ce5d58e92ca12f6b960",
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
