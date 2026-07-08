/**
 * Storage test manifest — the exact set of apps/api integration tests that
 * exercise REAL object storage (a running Azurite/MinIO testcontainer, wired via
 * `createTestApp({ storageDescriptor })`).
 *
 * Why this list exists:
 * - The `azure_blob_storage` CI leg runs the whole suite; the `minio` leg runs
 *   ONLY these files (see `vitest.storage.config.ts`). Together they prove the
 *   storage layer works against both providers without paying to run every test
 *   file twice.
 * - `test:verify-storage-manifest` (test/setup/assertStorageTestManifest.ts)
 *   keeps this list honest: CI fails if a test touches storage but is missing
 *   here, if an entry no longer exists on disk, or if an entry no longer shows
 *   any storage markers.
 *
 * Paths are relative to `apps/api`. Keep the list sorted.
 */
export const STORAGE_TEST_MANIFEST = [
  "test/features/badges/activateBadge/integration.test.ts",
  "test/features/badges/deactivateBadge/integration.test.ts",
  "test/features/badges/listBadges/integration.test.ts",
  "test/features/carbonInventories/getCarbonInventoryFilesManifest/integration.test.ts",
  "test/features/files/badges/confirmBadgeUpload/integration.test.ts",
  "test/features/files/badges/flow.test.ts",
  "test/features/files/badges/requestBadgeUpload/integration.test.ts",
  "test/features/files/confirmUpload/integration.test.ts",
  "test/features/files/downloadFile/integration.test.ts",
  "test/features/files/previewFile/integration.test.ts",
  "test/features/files/requestUpload/integration.test.ts",
  "test/features/organizations/app/requestOrganizationAccreditation/integration.test.ts",
  "test/features/organizations/app/updateOrganization/integration.test.ts",
  "test/features/reductionProjects/createReductionProject/integration.test.ts",
  "test/features/reductionProjects/updateReductionProject/integration.test.ts",
  "test/features/submissions/getCarbonInventoryHistory/integration.test.ts",
  "test/features/submissions/getOrganizationHistory/integration.test.ts",
  "test/plugins/app/storageRelayPlugin.test.ts",
] as const;
