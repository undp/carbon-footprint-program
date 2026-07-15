## 1. Shared types and enums (no behavior change)

- [x] 1.1 Add `StorageProvider` enum (`AZURE_BLOB_STORAGE = "azure_blob_storage"`, `MINIO = "minio"`) to `packages/storage/src/provider.ts` (`@repo/storage`).
- [x] 1.2 Create `packages/types/src/files/httpMethod.ts` with `HttpUploadMethod` enum (`PUT = "PUT"`) and `HttpUploadMethodSchema` Zod schema; export from `packages/types/src/files/index.ts`.
- [x] 1.3 Create `packages/storage/src/types.ts` with `StorageAdapter` interface, `ReadUrlResult`, `ReadOptions`, `WriteUrlResult`, `ObjectMetadata`, `ObjectStream`, and `ObjectNotFoundError`.
- [x] 1.4 Create `packages/storage/src/index.ts` barrel and the `createStorageAdapter` factory in `packages/storage/src/createStorageAdapter.ts`.

## 2. Facade + Azure adapter (ports existing logic)

- [x] 2.1 Create `packages/storage/src/adapters/azureBlobAdapter.ts`; port `createReadSasUrlSigner`, `generateReadSasUrl`, `generateWriteSasUrl`, `copyBlob` (with `pollUntilDone`), and `deleteBlob` (with `deleteIfExists`) from `apps/api/src/services/blobService.ts` (`moveBlob` dropped — no callers; the interface omits a move primitive). `generateWriteUrl` returns `headers: { "x-ms-blob-type": "BlockBlob" }`, `method: HttpUploadMethod.PUT`. Implement `headObject` (translates `RestError` 404 → `ObjectNotFoundError`) and `healthCheck` (`ContainerClient.exists()`).
- [x] 2.2 Implement `createStorageAdapter(config)` in `packages/storage/src/createStorageAdapter.ts`; for `AZURE_BLOB_STORAGE` construct `BlobServiceClient` via `getStorageCredential` (ClientSecretCredential, else DefaultAzureCredential) and return `AzureBlobAdapter`.
- [x] 2.3 Adapter behavior covered by existing Azurite integration tests via `test/factories/appFactory.ts` + per-feature integration tests under `apps/api/test/features/`; no standalone unit tests added because the integration suite runs against real Azurite (no SDK mocks per project policy) and exercises every adapter method end-to-end.

## 3. MinIO adapter

- [x] 3.1 Add `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` to `apps/api/package.json`. **User must run `pnpm install` after merge** (per workspace policy, build commands are not run by the assistant).
- [x] 3.2 Create `packages/storage/src/adapters/minioAdapter.ts`. Implements `generateReadUrl` (uses `GetObjectCommand` with `ResponseContentType` / `ResponseContentDisposition`), `createReadUrlSigner` (closure over `generateReadUrl`), `generateWriteUrl` (uses `PutObjectCommand`, returns `method: PUT`, `headers: {}`), `headObject` (uses `HeadObjectCommand`, 404 → `ObjectNotFoundError`), `deleteObject` (uses `DeleteObjectCommand`, idempotent), `copyObject` (uses `CopyObjectCommand`, awaits directly), `healthCheck` (uses `HeadBucketCommand`). No `moveObject` — the interface omits a move primitive (YAGNI).
- [x] 3.3 `createStorageAdapter` dispatches `MINIO` → `createMinioAdapter()` (in `createStorageAdapter.ts`). The MinIO adapter factory constructs `S3Client` with `endpoint`, `region`, `forcePathStyle`, and credentials from the resolved `MinioStorageConfig`.
- [x] 3.4 Adapter behavior covered by the integration test suite under CI matrix `STORAGE_PROVIDER=minio` (task 9 + 10.5); no standalone unit tests added because the integration suite runs against real MinIO via `GenericContainer` and exercises every adapter method end-to-end.

## 4. Plugin swap and env

- [x] 4.1 Add `STORAGE_PROVIDER` validation to `storageConfigFromEnv` (`packages/storage/src/config.ts`) using an imperative throw; `apps/api/src/config/environment.ts` consumes it via `buildStorageConfig()` (matching the `AZURE_TENANT_TYPE` throw-on-invalid pattern).
- [x] 4.2 Parse `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET` (default `"files"`), `MINIO_REGION` (default `"us-east-1"`), `MINIO_FORCE_PATH_STYLE` (default `true`) in `storageConfigFromEnv`.
- [x] 4.3 Add conditional throws in `storageConfigFromEnv`: throw if `STORAGE_PROVIDER=minio` and any of `MINIO_ENDPOINT`/`MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY` are missing; throw if `STORAGE_PROVIDER=azure_blob_storage` and `AZURE_STORAGE_ACCOUNT_NAME` is missing.
- [x] 4.4 Create `apps/api/src/plugins/app/storagePlugin.ts`: read `STORAGE_PROVIDER`, call `createStorageAdapter`, decorate `fastify.storage`, run background `healthCheck()` mirroring the existing Azure verify-and-warn behavior.
- [x] 4.5 Update `apps/api/src/types/fastify.ts` to declare `storage: StorageAdapter` (non-optional) and remove `blobServiceClient?`, `blobStorage?`, `storageContainerName?`, `storageAccountName?` declarations.
- [x] 4.6 New `storagePlugin.ts` is autoloaded from `plugins/app/` (see `app.ts:76-79`). Deleted old `blobStoragePlugin.ts` early to avoid the now-stripped decorator types colliding with autoload (task 11.2 moved up).

## 5. Feature callsite migration (~211 references)

- [x] 5.1 Replace `(blobServiceClient, containerName, ...)` with `(storage, ...)` in service signatures across all feature files under `apps/api/src/features/` (incl. `files/requestUpload`, `downloadFile`, `confirmUpload`, `previewFile`, `badges/requestBadgeUpload`, `badges/confirmBadgeUpload`, `legal/requestLegalUpload`, `legal/confirmLegalUpload`).
- [x] 5.2 Updated `features/badges/*` services + handlers (`activateBadge`, `deactivateBadge`, `getBadgePreviews`, `listBadges`, `helpers.ts`, `files/badges/helpers.ts`). Preserved `getBadgePreviews` per-badge `generateReadUrl` loop unchanged (signer optimization deferred).
- [x] 5.3 Updated `features/carbonInventories/*` services + handlers (`confirmLineFileUpload`, `previewLineFile`, `requestLineFileUpload`, `getCarbonInventoryBadges`, `requestVerification`).
- [x] 5.4 Also updated `features/organizations/app/*` (`getOrganizationRecognitions`, `updateOrganization`, `requestOrganizationAccreditation`), `features/reductionProjects/*` (`createReductionProject`, `updateReductionProject`), `features/submissions/*` (`helpers.ts`, `getCarbonInventoryHistory`, `getOrganizationHistory`, `getReductionProjectHistory`, `mappers.ts`), `features/termsConditions/streamCurrentTermsConditions` (now uses new `storage.streamObject`), `features/files/helpers/linkFilesToSubmission.ts`, `handlerFactory/createSubmissionRequestHandler.ts`, and `mappers/mapFilesWithUrls.ts`. Also dropped `StorageNotConfiguredError` (no longer needed — provider is required). Grep confirms zero remaining references to the old decorators.
- [x] 5.5 Direct storage-SDK imports now exist only inside the `@repo/storage` package (`packages/storage/src/adapters/*`, `internal/getStorageCredential.ts`, `testing.ts`). Grep verified — nothing in `apps/*` or `tools/*` imports a storage SDK directly.

## 6. Helpers refactor

- [x] 6.1 Update `apps/api/src/features/files/helpers/persistFileRecord.ts`: drop direct `ContainerClient` dependency; accept `storage: StorageAdapter`; replace `checkFileRecordExists` body with `storage.headObject(blobPath)`; catch `ObjectNotFoundError` → throw `FileNotFoundError`.
- [x] 6.2 Update `apps/api/src/features/files/helpers/persistLegalFileRecord.ts`: accept `storage: StorageAdapter`; replace `getBlockBlobClient().deleteIfExists()` calls with `storage.deleteObject(blobPath)`; drop `@azure/storage-blob` `RestError` import.

## 7. API contract (types package)

- [x] 7.1 Extend `packages/types/src/files/requestUpload/schemas.ts`: add `uploadMethod: HttpUploadMethodSchema` and `uploadHeaders: z.record(z.string(), z.string())` to `RequestUploadResponseSchema`. Also extended `RequestBadgeUploadResponseSchema`, `RequestLegalUploadResponseSchema`, and `RequestLineFileUploadResponseSchema` (sibling endpoints share the same upload protocol).
- [x] 7.2 Updated `files/requestUpload/service.ts` to populate `uploadMethod` and `uploadHeaders` from `storage.generateWriteUrl()`.
- [x] 7.3 Applied to siblings: `files/badges/requestBadgeUpload/service.ts`, `files/legal/requestLegalUpload/service.ts`, `carbonInventories/requestLineFileUpload/service.ts`. (No separate submission pre-upload endpoint exists — FE pre-upload hook calls `files/requestUpload`.)

## 8. Frontend integration

- [x] 8.1 Created `apps/web/src/api/lib/uploadFile.ts` with provider-agnostic `uploadFile({ url, method, headers, body })`.
- [x] 8.2 Updated `useBadgeUpload.ts` to consume `uploadMethod`/`uploadHeaders` via `uploadFile`.
- [x] 8.3 Updated `useUploadCarbonInventoryLineFiles.ts` likewise.
- [x] 8.4 Updated `usePreUploadSubmissionFiles.ts` likewise (response typed as `RequestUploadResponse`).
- [x] 8.5 `apps/api/src/rest/files-badges.rest` and `files-submissions.rest` keep the `x-ms-blob-type` line (the .rest format cannot read response headers dynamically) but now carry a NOTE block explaining the provider-conditional behavior and pointing readers to the API response fields for code clients.
- [x] 8.6 `grep -r "x-ms-blob-type" apps/web/src` returns zero hits (only `apps/web/dist/...` build artifacts contain old references — those are gitignored and will rebuild).

## 9. Test setup

- [x] 9.1 Split `apps/api/test/setup/testcontainers.ts` into `testDatabase.ts` (Postgres) and `testStorage.ts`; `testStorage.ts` branches on `STORAGE_PROVIDER`. Azurite path preserved; `minio` path uses `GenericContainer("minio/minio")` with `["server","/data"]`. The bucket/container are created lazily by the `@repo/storage/testing` factories (not in setup). Returns a unified `TestStorageDescriptor`.
- [x] 9.2 Updated `apps/api/test/setup/globalSetup.ts`: provides `storageDescriptor` (replacing `storageConnectionString` / `storageContainerName`) and sets the matching `process.env` vars before workers boot so `environment.ts` validation passes.
- [x] 9.3 Updated `apps/api/test/factories/appFactory.ts`: removed the `BlobServiceClient.fromConnectionString` hardcode. Now builds the right `StorageAdapter` from the descriptor via the `@repo/storage/testing` factories (`createAzureBlobTestAdapter` / `createMinioTestAdapter`, which own bucket/container bootstrap and all storage-SDK construction) and assigns it to `app.storage` after `app.ready()`.
- [x] 9.4 Renamed `apps/api/test/factories/blobHelper.ts` → `storageHelper.ts`; replaced `uploadBlobToAzurite` with provider-agnostic `uploadFixture(storage, path, options)` that seeds the fixture via the adapter's direct `putObject` (Azurite's shared-key mode cannot issue the presigned URLs a `generateWriteUrl` + `fetch` approach would need). Added `testcontainers@^11.12.0` to apps/api devDependencies.
- [x] 9.5 Batch-migrated all integration tests via sed: `blobHelper` → `storageHelper`, `uploadBlobToAzurite` → `uploadFixture`, `app.blobStorage!` → `app.storage`, `storageContainerName/storageConnectionString` inject params → `storageDescriptor`. Cleaned up `getOrganizationHistory/integration.test.ts` (removed the now-unsupported "storage-disabled" test path and its `vi.mock("@/services/blobService.js")` block).
- [x] 9.5b All `vi.mock("@/services/blobService.js", ...)` blocks removed. Most became unnecessary once the Azure adapter gained shared-key SAS signing (Azurite can sign for real now); the few suites that still need inert copy/delete use `vi.spyOn(app.storage, ...)` after `createTestApp`, and pure service tests use the `createMockStorageAdapter` factory (`test/factories/mockStorageAdapter.ts`).
- [x] 9.6 Both provider suites ran green: `STORAGE_PROVIDER=azure_blob_storage` and `STORAGE_PROVIDER=minio` → 1302 passed / 1 skipped each. CI runs both legs per PR (task 10.5).

## 10. Infra and CI

- [x] 10.1 Added `minio` (`/minio/health/live` healthcheck, ports 9000/9001) and `minio-init` (one-shot `mc mb --ignore-existing`) services in a dedicated opt-in `docker-compose.minio.yml` (MinIO is only needed when `STORAGE_PROVIDER=minio`, so it stays out of the main compose file; both files merge into one project via `-f docker-compose.yml -f docker-compose.minio.yml`). New `minio-data` volume.
- [x] 10.2 Updated the `api` service in `docker-compose.yml`: added `STORAGE_PROVIDER` and `MINIO_*` env passthroughs alongside the existing `AZURE_STORAGE_*` ones. No `depends_on` on the MinIO services — they live in the opt-in compose file.
- [x] 10.3 Added `MINIO_API_CORS_ALLOW_ORIGIN` env on the MinIO service (defaults to `"*"`; override in `.envrc` for stricter dev origins).
- [x] 10.4 Updated `.envrc.template`: added `STORAGE_PROVIDER` (defaults to `"minio"`) and the full `MINIO_*` block. Kept the Azure block with a "only required when…" note.
- [x] 10.5 Updated `.github/workflows/ci.yml`: added `strategy.matrix.storage_provider: [azure_blob_storage, minio]` to the `test` job with `fail-fast: false`. Each matrix run gets its own `STORAGE_PROVIDER` env and provider-specific dummy values that satisfy startup validation; testcontainer overrides them with real values. Coverage artifact name now includes the provider so both reports survive upload. Other jobs (lint, type-check, format, build) stay single-run.

## 11. Cleanup

- [x] 11.1 Deleted `apps/api/src/services/blobService.ts` and the now-empty barrel `apps/api/src/services/index.ts`. Grep confirms zero remaining references.
- [x] 11.2 Deleted `apps/api/src/plugins/app/blobStoragePlugin.ts` in step 4.6 (moved up to avoid TS errors during the callsite migration window).
- [x] 11.3 `pnpm install` ran (adds `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `testcontainers`); `pnpm format && pnpm lint && pnpm type-check` all green at the repo root.

## 12. Documentation

- [x] 12.1 Rewrote `docs/infrastructure/FileStorage.md` (previously Spanish, Azure-only): architecture diagram (facade + 2 adapters), provider-selection table, Azure + MinIO setup sections, env var reference, upload protocol with the new response shape, dev recipes via docker-compose, CI matrix testing instructions, operational notes.

## 13. Verification

- [ ] 13.1 Bring up MinIO locally: `docker compose up minio minio-init postgres api` with `STORAGE_PROVIDER=minio`. Exercise upload/preview/replace/delete via the UI for badges, carbon-inventory line files, and submission pre-upload. Confirm objects appear in the MinIO console (`http://localhost:9001`).
- [ ] 13.2 Switch to `STORAGE_PROVIDER=azure_blob_storage` (against Azurite or a real account); repeat the same UI flow.
- [x] 13.3 Ran the API test suite under both providers (see 9.6). Both green: 1302 passed / 1 skipped each. CI matrix legs (`Test (azure_blob_storage)`, `Test (minio)`) also pass on the PR.
- [x] 13.4 Final `pnpm format && pnpm lint && pnpm type-check` — zero warnings/errors.
