## Why

The platform's pilot country deploys to its own infrastructure using MinIO as its object store, but the API is currently hard-wired to Azure Blob Storage (`@azure/storage-blob`, `BlobServiceClient`, `ContainerClient`, user-delegation-key SAS). This violates the country-agnostic principle (CLAUDE.md): country-specific variations must be handled through configuration, never through code forks. Adding a second backend now — before the codebase grows further on its Azure-only assumptions — keeps the abstraction cost bounded and proves the deployment model.

## What Changes

- Introduce a `StorageAdapter` facade in the shared `@repo/storage` package (`packages/storage/`) that defines a backend-agnostic contract for read/write presigned URLs, head/stream/put/delete/copy, and health check. No move primitive — the only consumer pattern is copy-then-cleanup (`linkFilesToSubmission` + `cleanupSourceObjects`), so `moveObject` would have no callers (YAGNI).
- Ship two adapters behind the facade: `AzureBlobAdapter` (ports the current `blobService.ts` 1:1) and `MinioAdapter` (new, via AWS SDK v3 with `forcePathStyle`).
- **BREAKING (internal API only)**: Replace the three Fastify decorators `blobServiceClient`, `blobStorage`, `storageContainerName` with a single `storage: StorageAdapter`. All ~211 callsites across feature handlers/services migrate to the new decorator.
- **BREAKING (env)**: `STORAGE_PROVIDER` becomes required at startup (no more silent "storage disabled" path). Provider-specific vars (`AZURE_STORAGE_ACCOUNT_NAME` or `MINIO_*`) are required conditionally.
- Extend `RequestUploadResponseSchema` (in `packages/types/src/files/requestUpload/`) with `uploadMethod` and `uploadHeaders` so the frontend stops hard-coding `PUT` + `x-ms-blob-type: BlockBlob`. Introduce a shared `HttpUploadMethod` enum + Zod schema in `packages/types/src/files/`.
- Add a provider-agnostic FE helper `apps/web/src/api/lib/uploadFile.ts`. Update the three upload hooks (`useBadgeUpload`, `useUploadCarbonInventoryLineFiles`, `usePreUploadSubmissionFiles`) to consume `uploadMethod`/`uploadHeaders` from the response.
- Add MinIO + `minio-init` (bucket bootstrap via `mc`) services in a dedicated opt-in `docker-compose.minio.yml` (mergeable with the main compose file), with `.envrc.template` entries for the new variables.
- Add a CI matrix to `.github/workflows/ci.yml` so the API test suite runs once per provider (`[azure_blob_storage, minio]`).
- Delete `apps/api/src/services/blobService.ts` and `apps/api/src/plugins/app/blobStoragePlugin.ts` once all callsites are migrated.
- Rewrite `docs/infrastructure/FileStorage.md` to document the facade, both setups, and the upload protocol.

## Capabilities

### New Capabilities

- `object-storage`: Backend-agnostic object storage capability (presigned URL issuance, head/stream/put/delete/copy, health checks) selected at runtime by `STORAGE_PROVIDER`. Defines the `StorageAdapter` contract, the `HttpUploadMethod` enum exchanged with clients, and the upload-response shape returned by `requestUpload`-style endpoints.

### Modified Capabilities

<!-- None. No existing capability spec covers storage behavior today; this introduces it. -->

## Impact

- **Code**: ~211 references to `fastify.blobServiceClient` / `fastify.blobStorage` / `fastify.storageContainerName` across ~30-40 feature files become `fastify.storage`. 9+ files with direct `@azure/storage-blob` imports lose them (the storage SDKs now live only inside `@repo/storage`). `persistFileRecord.ts` and `persistLegalFileRecord.ts` switch to `storage.headObject` / `storage.deleteObject`.
- **APIs**: `RequestUploadResponseSchema` gains two fields (additive at the wire level; frontend updated in the same PR). No public REST contract removals.
- **Dependencies (added)**: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` in `apps/api`. No new package for testcontainers — `@testcontainers/minio` is absent from the ecosystem; MinIO test container uses `GenericContainer("minio/minio")`.
- **Dependencies (kept)**: `@azure/storage-blob` and `@azure/identity` remain, scoped to the Azure adapter only.
- **Infra**: new `docker-compose.minio.yml` provides `minio` + `minio-init`; `docker-compose.yml` gains the `STORAGE_PROVIDER`/`MINIO_*` env passthroughs. `.envrc.template` gains `STORAGE_PROVIDER` and `MINIO_*` vars. MinIO requires a CORS allow-origin for browser presigned PUTs; documented in `FileStorage.md`.
- **CI**: `test` job in `.github/workflows/ci.yml` gains `strategy.matrix.storage_provider: [azure_blob_storage, minio]`. Test suite runtime roughly doubles for that job.
- **Tests**: `apps/api/test/setup/` splits storage/database setup (`testStorage.ts` branches on provider, `testDatabase.ts` owns Postgres); `appFactory.ts` constructs the adapter via the `@repo/storage/testing` factories instead of `BlobServiceClient.fromConnectionString` directly; `blobHelper.ts` → `storageHelper.ts` with `uploadFixture` that seeds fixtures via the adapter's direct `putObject` (works against either backend).
- **Out of scope**: `getBadgePreviews/service.ts` performance optimization (switching its per-badge `generateReadSasUrl` loop to the batched `createReadUrlSigner`) is deferred to a follow-up PR.
- **Operational**: Each country deployment must now pick a provider explicitly. The pilot country switches to `STORAGE_PROVIDER=minio`; existing Azure deployments set `STORAGE_PROVIDER=azure_blob_storage` (no behavior change beyond the now-required env var).
