import { defineApiVitestConfig } from "./vitest.base.js";
import { STORAGE_TEST_MANIFEST } from "./test/setup/storageTestManifest.js";

// Storage-only config: runs ONLY the tests in the storage manifest
// (test/setup/storageTestManifest.ts). Used by the MinIO CI leg (`test:storage`)
// to validate the storage layer against MinIO without re-running every file.
// Everything else (globalSetup, env, pool, timeouts, coverage, reporters) is
// shared via `defineApiVitestConfig`; the default config still runs everything.
export default defineApiVitestConfig({
  include: [...STORAGE_TEST_MANIFEST],
});
