import { defineApiVitestConfig } from "./vitest.shared.js";
import { STORAGE_TEST_MANIFEST } from "./test/setup/storageTestManifest.js";

// Base config: runs the full apps/api suite EXCEPT the storage-dependent files
// (test/setup/storageTestManifest.ts). Used by the `test:base` CI leg. Those
// storage files are covered separately, once per provider, by
// `test:storage-azure` / `test:storage-minio`, so excluding them here keeps the
// three legs a disjoint partition of the suite (base ∪ storage == full suite).
//
// The same manifest drives both this exclude and the storage config's include,
// so there is one source of truth; `test:verify-storage-manifest` guards it
// against drift.
export default defineApiVitestConfig({
  exclude: [...STORAGE_TEST_MANIFEST],
});
