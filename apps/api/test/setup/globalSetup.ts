import {
  runPrismaMigrations,
  runSeeds,
  setupTestDatabase,
} from "./testDatabase.js";
import {
  setupTestStorage,
  type TestStorageContainer,
  type TestStorageDescriptor,
} from "./testStorage.js";
import type { TestProject } from "vitest/node";
import { StorageProvider } from "@repo/storage";

/**
 * Sets process.env for the chosen storage provider before workers are spawned,
 * so the storage plugin's `buildStorageConfig()` validation passes at
 * `app.ready()` in each worker.
 *
 * Connection details are dummies — real values are injected per-app in
 * `createTestApp`. The storagePlugin will still construct an adapter at boot
 * (its background health check will warn), but `createTestApp` then overrides
 * `app.storage` with the testcontainer-backed adapter.
 */
function applyStorageEnv(descriptor: TestStorageDescriptor): void {
  process.env.STORAGE_PROVIDER = descriptor.provider;
  if (descriptor.provider === StorageProvider.AZURE_BLOB_STORAGE) {
    process.env.AZURE_STORAGE_ACCOUNT_NAME ??= "devstoreaccount1";
    process.env.AZURE_STORAGE_CONTAINER_NAME = descriptor.containerName;
  }
  if (descriptor.provider === StorageProvider.MINIO) {
    process.env.MINIO_ENDPOINT = descriptor.endpoint;
    process.env.MINIO_ACCESS_KEY = descriptor.accessKey;
    process.env.MINIO_SECRET_KEY = descriptor.secretKey;
    process.env.MINIO_BUCKET = descriptor.bucket;
    process.env.MINIO_REGION = descriptor.region;
  }
}

export default async function setup(project: TestProject) {
  // The chatbot is opt-in (CHATBOT_ENABLED defaults off). Enable it for the
  // suite so its routes register and the chatbot integration tests run
  // (LLM_PROVIDER defaults to "mock"). Set before workers spawn so each worker
  // inherits it — same mechanism as the storage env below.
  process.env.CHATBOT_ENABLED = "true";

  // Database is required for all tests — let it propagate and fail fast.
  const { databaseUrl, container: dbContainer } = await setupTestDatabase();

  // Storage is best-effort: only the storage-manifest tests (the storage-*
  // legs) need the testcontainer. If it fails to start (wrong Node.js version,
  // missing Docker image, CI network issue, etc.) we still want the
  // storage-independent tests to run.
  //
  // This invariant holds because each test script sets STORAGE_PROVIDER itself
  // (base leg = azure_blob_storage), so `buildStorageConfig()` at `app.ready()`
  // clears its "STORAGE_PROVIDER is required" check without the container. The
  // remaining provider-required var (AZURE_STORAGE_ACCOUNT_NAME) comes from the
  // CI job env, so boot succeeds in CI even when the container is down. Locally
  // that var is only injected by `applyStorageEnv` on the happy path, so a
  // failed container there still breaks boot unless it is exported in the shell.
  let storageDescriptor: TestStorageDescriptor | null = null;
  let storageContainer: TestStorageContainer | null = null;

  try {
    const storage = await setupTestStorage();
    storageDescriptor = storage.descriptor;
    storageContainer = storage.container;
    applyStorageEnv(storageDescriptor);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(
      "\n⚠️  Storage testcontainer failed to start — storage-dependent tests will fail.\n",
      error
    );
  }

  // Provide values BEFORE migrations/seeds so that an error in the next block
  // doesn't leave test workers with stale (never-provided) context.
  project.provide("databaseUrl", databaseUrl);
  project.provide("storageDescriptor", storageDescriptor);

  try {
    runPrismaMigrations(databaseUrl);
    runSeeds(databaseUrl);
  } catch (error) {
    await dbContainer.stop();
    if (storageContainer) await storageContainer.stop();
    throw error;
  }

  return async () => {
    await dbContainer.stop();
    if (storageContainer) await storageContainer.stop();
  };
}

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
    /** `null` when the storage testcontainer failed to start. */
    storageDescriptor: TestStorageDescriptor | null;
  }
}
