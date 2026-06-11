import {
  runPrismaMigrations,
  runSeeds,
  setupTestDatabase,
  setupTestStorage,
} from "./testcontainers.js";
import type { StartedAzuriteContainer } from "@testcontainers/azurite";
import type { TestProject } from "vitest/node";

type TestStorageContainer = StartedAzuriteContainer | null;

export default async function setup(project: TestProject) {
  // Database is required for all tests — let it propagate and fail fast.
  const { databaseUrl, container: dbContainer } = await setupTestDatabase();

  // Storage is only required for file-upload tests. If Azurite fails to start
  // (wrong Node.js version, missing Docker image, CI network issue, etc.) we
  // still want database-only tests to run, so we handle the failure here
  // instead of letting it abort the whole setup via Promise.all.
  let storageConnectionString = "";
  let storageContainerName = "";
  let storageContainer: TestStorageContainer = null;

  try {
    const storage = await setupTestStorage();
    storageConnectionString = storage.connectionString;
    storageContainerName = storage.containerName;
    storageContainer = storage.container;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(
      "\n⚠️  Azurite storage container failed to start — storage-dependent tests will fail.\n",
      error
    );
  }

  // Provide values BEFORE migrations/seeds so that an error in the next block
  // doesn't leave test workers with stale (never-provided) context.
  project.provide("databaseUrl", databaseUrl);
  project.provide("storageConnectionString", storageConnectionString);
  project.provide("storageContainerName", storageContainerName);

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
    storageConnectionString: string;
    storageContainerName: string;
  }
}
