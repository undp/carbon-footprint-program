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
 * Maps a Vitest project name to the storage provider its tests run against.
 *
 * The provider selection travels via the project NAME (set in vitest.config.ts),
 * not `process.env` — globalSetup runs once per project in the main process, so
 * a shared `process.env.STORAGE_PROVIDER` would be last-writer-wins across the
 * three projects when they run in a single command. Each project also declares
 * the matching `STORAGE_PROVIDER` in its `test.env`, which Vitest applies inside
 * the worker so `buildStorageConfig()` validation passes at `app.ready()`.
 *
 * `base` runs the storage-independent suite and boots no storage container.
 */
function storageProviderForProject(
  name: string | undefined
): StorageProvider | null {
  switch (name) {
    case "storage-azure":
      return StorageProvider.AZURE_BLOB_STORAGE;
    case "storage-minio":
      return StorageProvider.MINIO;
    case "base":
      return null;
    default:
      throw new Error(
        `Unknown Vitest project "${String(name)}" — expected "base", ` +
          `"storage-azure", or "storage-minio". globalSetup selects the storage ` +
          `provider from the project name (see vitest.config.ts).`
      );
  }
}

export default async function setup(project: TestProject) {
  // Database is required for all tests — let it propagate and fail fast.
  const { databaseUrl, container: dbContainer } = await setupTestDatabase();

  // Storage is per-project: only the storage projects boot a testcontainer, each
  // against its own provider (picked from the project name, so the three
  // projects never contend on a shared process.env). The `base` project skips it
  // entirely. It stays best-effort: if the container fails to start we still
  // provide `null` so the storage-independent tests run; a storage test then
  // fails loudly in `createTestApp` with an actionable message.
  const provider = storageProviderForProject(project.name);
  let storageDescriptor: TestStorageDescriptor | null = null;
  let storageContainer: TestStorageContainer | null = null;

  if (provider) {
    try {
      const storage = await setupTestStorage(provider);
      storageDescriptor = storage.descriptor;
      storageContainer = storage.container;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        "\n⚠️  Storage testcontainer failed to start — storage-dependent tests will fail.\n",
        error
      );
    }
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
    /**
     * `null` for the `base` project (no storage) and when the storage
     * testcontainer failed to start.
     */
    storageDescriptor: TestStorageDescriptor | null;
  }
}
