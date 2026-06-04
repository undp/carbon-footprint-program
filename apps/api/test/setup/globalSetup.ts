import {
  runPrismaMigrations,
  runSeeds,
  setupTestDatabase,
  setupTestStorage,
  type TestStorageContainer,
  type TestStorageDescriptor,
} from "./testcontainers.js";
import type { TestProject } from "vitest/node";
import { StorageProvider } from "@/config/constants.js";

const EMPTY_DESCRIPTOR: TestStorageDescriptor = {
  provider: StorageProvider.AZURE_BLOB_STORAGE,
  azureConnectionString: "",
  minioEndpoint: "",
  containerName: "",
  minioAccessKey: "",
  minioSecretKey: "",
  minioRegion: "",
};

/**
 * Sets process.env for the chosen storage provider before workers are spawned,
 * so that environment.ts validation passes when modules import it in workers.
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
    process.env.MINIO_ENDPOINT = descriptor.minioEndpoint;
    process.env.MINIO_ACCESS_KEY = descriptor.minioAccessKey;
    process.env.MINIO_SECRET_KEY = descriptor.minioSecretKey;
    process.env.MINIO_BUCKET = descriptor.containerName;
    process.env.MINIO_REGION = descriptor.minioRegion;
  }
}

export default async function setup(project: TestProject) {
  // Database is required for all tests — let it propagate and fail fast.
  const { databaseUrl, container: dbContainer } = await setupTestDatabase();

  // Storage is only required for file-upload tests. If the container fails to
  // start (wrong Node.js version, missing Docker image, CI network issue, etc.)
  // we still want database-only tests to run.
  let storageDescriptor: TestStorageDescriptor = EMPTY_DESCRIPTOR;
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
    storageDescriptor: TestStorageDescriptor;
  }
}
