import { defineApiVitestConfig } from "./vitest.shared.js";
import { STORAGE_TEST_MANIFEST } from "./test/setup/storageTestManifest.js";

// Storage-only config: runs ONLY the tests in the storage manifest
// (test/setup/storageTestManifest.ts). Shared by both storage CI legs —
// `test:storage-azure` and `test:storage-minio` run this same file and differ
// only by the STORAGE_PROVIDER env var (which picks the testcontainer in
// globalSetup). Everything else (globalSetup, env, pool, timeouts, coverage,
// reporters) is shared via `defineApiVitestConfig`.
export default defineApiVitestConfig({
  include: [...STORAGE_TEST_MANIFEST],
});
