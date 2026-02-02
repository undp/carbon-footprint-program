import { execSync } from "node:child_process";
import {
  runPrismaMigrations,
  runPrismaSeeds,
  setupTestDatabase,
} from "./testcontainers.js";
import type { TestProject } from "vitest/node";

function runPretest() {
  execSync("pnpm run pretest", {
    stdio: "inherit",
    cwd: process.cwd(),
  });
}

export default async function setup(project: TestProject) {
  runPretest();
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
