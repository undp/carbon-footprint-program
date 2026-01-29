import {
  runPrismaMigrations,
  runPrismaSeeds,
  setupTestDatabase,
} from "./testcontainers.js";
import type { TestProject } from "vitest/node";

// Disable authentication for all tests
process.env.AUTH_PROVIDER = "none";

export default async function setup(project: TestProject) {
  const { databaseUrl, container } = await setupTestDatabase();
  project.provide("databaseUrl", databaseUrl);
  try {
    runPrismaMigrations(databaseUrl);
    runPrismaSeeds(databaseUrl);
  } catch (error) {
    await container.stop();
    throw error;
  }
  return () => container.stop();
}

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}
