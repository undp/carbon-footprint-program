import { defineConfig } from "vitest/config";
import { apiCoverageConfig, defineApiVitestProject } from "./vitest.shared.js";
import { STORAGE_TEST_MANIFEST } from "./test/setup/storageTestManifest.js";

// Dummy storage env per project. These only need to satisfy `buildStorageConfig()`
// validation at `app.ready()`; the real adapter is built from the injected
// `storageDescriptor` (see test/factories/appFactory.ts). globalSetup.ts picks the
// provider — and boots the matching testcontainer — from the project NAME, not
// from these vars, so the three projects stay isolated even in a single run.
const AZURE_TEST_ENV = {
  STORAGE_PROVIDER: "azure_blob_storage",
  AZURE_STORAGE_ACCOUNT_NAME: "devstoreaccount1",
  AZURE_STORAGE_CONTAINER_NAME: "test-files",
};

const MINIO_TEST_ENV = {
  STORAGE_PROVIDER: "minio",
  MINIO_ENDPOINT: "http://localhost:9000",
  MINIO_ACCESS_KEY: "minioadmin",
  MINIO_SECRET_KEY: "minioadmin",
  MINIO_BUCKET: "test-files",
  MINIO_REGION: "us-east-1",
};

// One Vitest config, three projects that partition the suite into disjoint sets.
// The project names (`base`, `storage-azure`, `storage-minio`) are the CI matrix
// legs AND the branch-protection check names — do not rename them.
//   - base:          the full suite EXCEPT the storage manifest — the bulk.
//   - storage-azure: ONLY the storage manifest, against Azurite.
//   - storage-minio: ONLY the storage manifest, against MinIO.
// base ∪ storage-* == the full suite. The storage manifest
// (test/setup/storageTestManifest.ts) is the single source of truth for both the
// base `exclude` and the storage `include`; `test:verify-storage-manifest`
// guards it against drift.
//
// One config, two run modes (same coverage numbers by construction). The gate
// (90% for lines, statements, functions, and branches) is passed by flag in the
// package.json scripts, never here — a per-project threshold would fail on the
// files a project never runs.
//   - Local: `vitest run --coverage` runs all three projects and merges their
//     coverage in one pass, then applies the gate. One command, no script.
//   - CI:    each leg runs `--project=<leg> --coverage --reporter=blob`; the
//     `coverage` job merges the blobs with `--merge-reports --coverage` and
//     applies the gate. Keeps the matrix's wall-clock; still no script.
export default defineConfig({
  test: {
    projects: [
      defineApiVitestProject({
        name: "base",
        exclude: [...STORAGE_TEST_MANIFEST],
        storageEnv: AZURE_TEST_ENV,
      }),
      defineApiVitestProject({
        name: "storage-azure",
        include: [...STORAGE_TEST_MANIFEST],
        storageEnv: AZURE_TEST_ENV,
      }),
      defineApiVitestProject({
        name: "storage-minio",
        include: [...STORAGE_TEST_MANIFEST],
        storageEnv: MINIO_TEST_ENV,
      }),
    ],
    coverage: apiCoverageConfig,
  },
});
