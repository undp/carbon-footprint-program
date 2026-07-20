# @repo/storage

Backend-agnostic object storage layer for Huella Latam. It defines a single `StorageAdapter` interface with two concrete implementations — Azure Blob Storage and MinIO/S3-compatible — selected at runtime via the `STORAGE_PROVIDER` environment variable. Application code (`apps/api`, `tools/seed`) depends only on the `StorageAdapter` interface and never imports a storage SDK directly.

## Exports

Main entry (`src/index.ts`):

- `StorageProvider` — enum of supported backends (`AZURE_BLOB_STORAGE`, `MINIO`).
- `createStorageAdapter(config)` — async factory that lazily imports and constructs the adapter matching `config.provider` (so a deployment using only one provider doesn't pay the cost of loading the other backend's SDK).
- `storageConfigFromEnv(env)` — builds a validated, discriminated-union `StorageConfig` from an environment record; a pure function that never reads `process.env` itself.
- `StorageAdapter` interface — `generateReadUrl`, `createReadUrlSigner`, `generateWriteUrl`, `headObject`, `streamObject`, `putObject`, `deleteObject`, `copyObject`, `healthCheck`.
- `ObjectNotFoundError`, plus supporting types (`ObjectMetadata`, `ObjectStream`, `ReadOptions`, `ReadUrlResult`, `WriteUrlResult`, `UploadHttpMethod`, ...).

Secondary entry `@repo/storage/testing` (`src/testing.ts`) — test-only helpers (`createAzureBlobTestAdapter`, `createMinioTestAdapter`) that build a `StorageAdapter` against a running testcontainer (Azurite / MinIO), so `apps/api` integration tests never import a storage SDK directly either.

## Submodules

- `adapters/azureBlobAdapter.ts`, `adapters/minioAdapter.ts` — the two concrete `StorageAdapter` implementations.
- `provider.ts` — the `StorageProvider` enum.
- `config.ts` — `StorageConfig`/`AzureStorageConfig`/`MinioStorageConfig` types and `storageConfigFromEnv`.
- `types.ts` — the `StorageAdapter` contract and shared result/option types.
- `internal/getStorageCredential.ts` — resolves the Azure credential to use (explicit `ClientSecretCredential` for local/docker-compose, `DefaultAzureCredential`/Managed Identity in production); internal to the package.
- `createStorageAdapter.ts` — the runtime adapter factory.
- `testing.ts` — testcontainer-backed adapter builders (see above).

## Usage

```ts
import { createStorageAdapter, storageConfigFromEnv } from "@repo/storage";

const adapter = await createStorageAdapter(storageConfigFromEnv(process.env));
```
