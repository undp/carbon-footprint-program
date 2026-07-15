## Context

Today the API talks to Azure Blob Storage directly. The plugin `apps/api/src/plugins/app/blobStoragePlugin.ts` constructs a `BlobServiceClient` (Entra ID via `DefaultAzureCredential`) and decorates Fastify with three values: `blobServiceClient`, `blobStorage` (a `ContainerClient`), and `storageContainerName`. The shared logic lives in `apps/api/src/services/blobService.ts` and exposes six functions (`createReadSasUrlSigner`, `generateReadSasUrl`, `generateWriteSasUrl`, `copyBlob`, `deleteBlob`, `moveBlob`), all consumed by ~211 references across feature handlers and services. Nine feature files also import `@azure/storage-blob` directly (mostly for the `RestError` 404 check in `persistFileRecord.ts`). The frontend hard-codes `PUT` and `x-ms-blob-type: BlockBlob` in three upload hooks.

The pilot deployment runs MinIO (S3-compatible). CLAUDE.md mandates country-agnosticism via configuration, not code forks. This change introduces a single abstraction, ports the existing Azure logic into one adapter, and adds a MinIO adapter — selected at startup by `STORAGE_PROVIDER`.

## Goals / Non-Goals

**Goals:**

- One backend-agnostic `StorageAdapter` interface. Features depend on `fastify.storage` only — zero `@azure/storage-blob` imports outside `azureBlobAdapter.ts`.
- Preserve Azure-specific optimizations behind the interface — notably user-delegation-key batching across multiple read SAS URLs.
- Make the upload protocol explicit on the wire: response carries `uploadMethod` and `uploadHeaders` so the FE never assumes a backend.
- Local devs can `docker compose up` and get a working MinIO + bucket. CI validates both backends per PR.
- Single PR. Single-PR delivery is itself a proof point: it measures the true cost of MinIO support in this codebase.

**Non-Goals:**

- Multipart upload, resumable upload, server-side encryption configuration. Current usage is single-PUT presigned uploads up to a fixed size.
- Switching `getBadgePreviews/service.ts` from its per-badge `generateReadSasUrl` loop to the batched `createReadUrlSigner`. Worth doing; deferred to a separate PR to keep this change reviewable.
- Migrating env validation to Zod `superRefine`. The repo's `environment.ts` uses imperative IIFE + throw (see `AZURE_TENANT_TYPE` at lines 74-84). This change matches that style.
- Renaming `AZURE_STORAGE_ACCOUNT_NAME` / `AZURE_STORAGE_CONTAINER_NAME`. Existing deployments keep the same variable names.
- Multi-region or replicated storage configuration.

## Decisions

### 1. Single facade, two adapters (vs. n adapters via plugin registry)

Chose a small, hand-rolled `StorageAdapter` interface with two concrete implementations selected by a switch in `createStorageAdapter(config)` (in the shared `@repo/storage` package). Rejected a plugin-registry approach (dynamic discovery, DI container) because there are exactly two providers in scope and country deployments do not need to register new ones at runtime — they pick one of the supported values at deploy time. Adding more providers later is a 3-step exercise (new adapter file, new enum value, new switch case).

### 2. `createReadUrlSigner` stays as a distinct method

Azure issues a user-delegation key via a network call (`BlobServiceClient.getUserDelegationKey`) that signs N blobs from one fetch — the existing `createReadSasUrlSigner` at `blobService.ts:37-75` already does this. S3 presign is sync and per-blob. Collapsing the two into a single `generateReadUrl` would force a delegation-key fetch per blob on Azure, regressing the batched callsite. Interface keeps the factory:

```
createReadUrlSigner(expiresInMinutes?) : Promise<(path, opts?) => Promise<ReadUrlResult>>
```

MinIO adapter implements it as a trivial closure that calls `generateReadUrl` per invocation. Rejected: a single `generateReadUrl(paths[])` batch method — Azure batches the key fetch, not the SAS generation, so the closure shape models reality better.

### 3. Provider is required; no "storage disabled" fallback

Today the plugin no-ops if `AZURE_STORAGE_ACCOUNT_NAME` is unset, leaving `fastify.blobStorage` undefined and forcing every callsite to handle the optional. Going forward `STORAGE_PROVIDER` is required and validated at startup; `fastify.storage` is non-optional. Rejected the optional path because (a) it complicates the contract for the 211 callsites, (b) running the API without storage is not a supported deployment mode in production, and (c) the previous behavior masked misconfiguration as warnings.

### 4. Response shape carries upload method + headers

`RequestUploadResponseSchema` gains `uploadMethod: HttpUploadMethod` and `uploadHeaders: Record<string, string>`. FE hooks consume them via a new `apps/web/src/api/lib/uploadFile.ts` helper that does `fetch(url, { method, headers, body })`. Rejected the alternative — keeping `PUT` hard-coded and stripping `x-ms-blob-type` because S3 ignores unknown headers — because relying on header-tolerance is fragile across providers (some S3-compatible stores reject unknown headers) and the explicit shape documents the contract.

### 5. Env validation: imperative IIFE + throw

Matches the existing `AZURE_TENANT_TYPE` block (`environment.ts:74-84`) and the conditional requirement check at `environment.ts:140-145`. Rejected Zod `superRefine` because it would inject a different style into a file that already has a working pattern — and a partial migration is worse than either pure style.

### 6. MinIO testcontainer via `GenericContainer`

`@testcontainers/minio` is not in the dependency tree and was not found upstream during exploration. Use `GenericContainer("minio/minio").withCommand(["server","/data"]).withExposedPorts(9000).withStartupTimeout(120000)` and create the bucket post-start with `CreateBucketCommand` via the S3 SDK. Mirrors the `@testcontainers/azurite` `.withStartupTimeout(120000)` style.

### 7. CI matrix on the `test` job

Add `strategy.matrix.storage_provider: [azure_blob_storage, minio]` to the existing `test` job in `.github/workflows/ci.yml`. Other jobs (lint, type-check, format, build) stay single-run. Rejected nightly-only MinIO testing because the pilot deploys to MinIO and the matrix cost is acceptable for a small repo.

### 8. Single PR delivery

The user explicitly framed this as a POC to measure MinIO adaptation cost. Splitting hides the blast radius. Inside the PR, commits are ordered so each is independently reviewable: types → facade + Azure adapter (no callsite changes) → MinIO adapter → plugin/env swap → mechanical callsite renames → helpers → FE → tests → infra → docs + deletions.

## Risks / Trade-offs

- **Copy semantics divergence** → Adapters absorb: S3 `CopyObjectCommand` returns when done; Azure `beginCopyFromURL` requires `pollUntilDone()`. Facade contract is "await returns when the copy is complete." Verified against the existing `copyBlob` implementation.

- **Content-type / content-disposition override mechanism differs** → Azure encodes both into SAS query parameters; S3 needs `ResponseContentType` and `ResponseContentDisposition` on `GetObjectCommand`. MinIO adapter sets both; per-adapter unit test on `generateReadUrl` locks behavior.

- **Path-style vs virtual-hosted-style URLs** → MinIO needs `forcePathStyle: true`. Expose `MINIO_FORCE_PATH_STYLE` (default true) so future S3-compatible deployments can override.

- **CORS for browser presigned PUT against MinIO** → MinIO container needs `MINIO_API_CORS_ALLOW_ORIGIN` set for the web dev origin. Document in `FileStorage.md` and include in compose for the dev profile.

- **PR size** → ~70 files touched (~211 decorator refs dominated by mechanical renames). Mitigation: structured commit order inside the PR (see Decision 8). Reviewer focus stays on the adapter implementations and the plugin swap.

- **Hidden Azure assumptions in FE** → Grep confirmed three hooks + two `.rest` artifacts contain `x-ms-blob-type`. Removal is part of the migration. Risk that other implicit Azure assumptions exist — mitigated by exercising the full UI flow against MinIO during verification.

- **AWS SDK bundle size** → `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` are tree-shakeable but non-trivial. Acceptable cost for cross-provider support; only loaded server-side.

## Migration Plan

Per-country, at deploy time:

1. Set `STORAGE_PROVIDER=azure_blob_storage` (or `minio`) in the environment.
2. For Azure deployments: confirm `AZURE_STORAGE_ACCOUNT_NAME` and `AZURE_STORAGE_CONTAINER_NAME` are set (already required).
3. For MinIO deployments: set `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, optionally `MINIO_BUCKET` (defaults to `files`), `MINIO_REGION` (defaults to `us-east-1`), `MINIO_FORCE_PATH_STYLE` (defaults to true). Ensure CORS allows the web app origin.
4. Deploy. Startup throws explicitly if `STORAGE_PROVIDER` is unset or provider-specific vars are missing — no silent degradation.

No data migration. Existing Azure data stays in place. MinIO deployments start with an empty bucket.

**Rollback**: Revert the PR. There is no persisted state owned by the new code path — the only deploy-side change is the env vars, which existing deployments do not need to consume on rollback (the old plugin reads only the Azure vars).

## Open Questions

None at design time. All decisions above are resolved.
