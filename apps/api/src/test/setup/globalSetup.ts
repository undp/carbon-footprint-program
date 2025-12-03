import { runPrismaMigrations, setupTestDatabase } from "./testcontainers.js";
import type { TestProject } from "vitest/node";

export default async function setup(project: TestProject) {
  const { databaseUrl, container } = await setupTestDatabase();
  project.provide("databaseUrl", databaseUrl);
  runPrismaMigrations(databaseUrl);
  return async () => {
    await container.stop();
  };
}

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}
