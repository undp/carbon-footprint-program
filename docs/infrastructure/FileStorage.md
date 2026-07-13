# File Storage

The API persists every uploaded file (badge images, carbon-inventory line files, submission attachments, the active Terms & Conditions PDF, etc.) in an object store. Two backends are supported and selected at runtime — country deployments pick one without forking code.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│ Frontend (apps/web)                                              │
│  • Uses uploadFile({ url, method, headers, body })               │
│  • Reads `uploadMethod` and `uploadHeaders` from the API         │
│    response — never hard-codes Azure-specific values             │
└──────────────────────────────────────────────────────────────────┘
                            │ HTTP
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│ API (apps/api)                                                   │
│  • Features depend ONLY on fastify.storage: StorageAdapter       │
│  • storagePlugin builds the adapter at startup from              │
│    buildStorageConfig() (config/environment.ts)                  │
└──────────────────────────────────────────────────────────────────┘
                │                              │
   @repo/storage: createStorageAdapter(config: StorageConfig)
                │                              │
   AzureBlobAdapter                     MinioAdapter
   (@azure/storage-blob)                (@aws-sdk/client-s3)
                │                              │
                ▼                              ▼
   Azure Blob Storage                MinIO / S3-compatible
   (user-delegation SAS)             (pre-signed URLs)
```

The adapter lives in the shared **`@repo/storage`** package (`packages/storage/`). The
`StorageAdapter` interface (`packages/storage/src/types.ts`) defines the contract every
adapter must satisfy:

- `generateReadUrl`, `createReadUrlSigner`, `generateWriteUrl`
- `headObject`, `streamObject`, `putObject`, `deleteObject`, `copyObject`
- `healthCheck`

Adapters live in `packages/storage/src/adapters/`. The package selects one via
`createStorageAdapter(config)`, where `config` is a typed `StorageConfig` (a
discriminated union on `provider`) injected by the caller — the package never reads
`process.env` itself. Helpers:

- `storageConfigFromEnv(env)` — builds a validated `StorageConfig` from an env record.
- `@repo/storage/testing` — test-only adapter factories (`createAzureBlobTestAdapter`,
  `createMinioTestAdapter`) used by the integration suite; not part of the production API.

> **Convention — adapter only.** Application code (API, seed scripts, web) must access
> object storage **exclusively** through `@repo/storage`. The storage SDKs
> (`@azure/storage-blob`, `@azure/identity`, `@aws-sdk/client-s3`,
> `@aws-sdk/s3-request-presigner`) are dependencies of `packages/storage` **only** — do
> not add them to `apps/api`, `apps/web`, or `tools/seed`, and never import them directly.
> The API consumes the adapter via `fastify.storage`; the seed scripts build it via
> `createStorageAdapter(storageConfigFromEnv(process.env))`.

## Choosing a provider

Set `STORAGE_PROVIDER` to one of:

| Value                | Backend                                                                  | When to use                                                                                           |
| -------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `azure_blob_storage` | Azure Blob Storage with managed-identity auth (`DefaultAzureCredential`) | Deployments running on Azure App Service / AKS / VMs with an attached managed identity.               |
| `minio`              | MinIO or any S3-compatible object store                                  | Self-hosted deployments and pilots that run their own object storage on the country's infrastructure. |

`STORAGE_PROVIDER` is **required** — startup throws if it is missing or invalid. There is no "storage disabled" fallback.

## Azure setup

Required env vars when `STORAGE_PROVIDER=azure_blob_storage`:

- `AZURE_STORAGE_ACCOUNT_NAME` — storage account name (e.g. `stj7k8m9n0p1`).
- `AZURE_STORAGE_CONTAINER_NAME` — blob container name. Defaults to `files`.

Optional — explicit Service Principal (all three or none):

- `AZURE_STORAGE_TENANT_ID` — Entra tenant id.
- `AZURE_STORAGE_CLIENT_ID` — Service Principal / app client id.
- `AZURE_STORAGE_CLIENT_SECRET` — Service Principal client secret.

Authentication resolves as follows:

- **All three Service Principal vars set** → the adapter uses an explicit `ClientSecretCredential` (handy for local / docker-compose without a managed identity).
- **Otherwise** → `DefaultAzureCredential`, which resolves managed identity in Azure or falls back to `az login` locally.

Either way, no account keys are stored on the API server.

> **Required RBAC role.** The signed-in identity (Service Principal, managed identity, or `az login` user) needs **Storage Blob Data Contributor** on the storage account — the adapter issues **user-delegation SAS** URLs, which require this data-plane role. Without it, uploads/downloads fail with **403 at call time**. Note the startup health check only _logs a warning_ if it can't reach storage, so a missing role is easy to miss until the first real upload.

The legacy Bicep templates already provision the storage account, container, and managed-identity role assignments — no manual configuration is needed in production.

## MinIO setup

Required env vars when `STORAGE_PROVIDER=minio`:

- `MINIO_ENDPOINT` — full endpoint URL (e.g. `http://minio:9000` inside docker-compose, `http://localhost:9000` on the host).
- `MINIO_ACCESS_KEY` — S3 access key id / MinIO root user.
- `MINIO_SECRET_KEY` — S3 secret access key / MinIO root password.

Optional:

- `MINIO_BUCKET` — defaults to `files`.
- `MINIO_REGION` — defaults to `us-east-1` (MinIO ignores this but the AWS SDK requires it).
- `MINIO_FORCE_PATH_STYLE` — defaults to `true`. Set to `false` only for S3-compatible deployments that require virtual-hosted-style URLs.
- `MINIO_RELAY_ENABLED` — defaults to `false`. Opt-in storage relay (see [Storage relay](#storage-relay-keeping-minio-internal)). When `true`, presigned URLs are rewritten to `<API_ORIGIN>/api/storage` and the API proxies them, so MinIO stays internal. Requires `API_ORIGIN`.

### Local dev with docker-compose

MinIO lives in its own opt-in file, `docker-compose.minio.yml` (it is only needed
when `STORAGE_PROVIDER=minio`, so it is kept out of the main `docker-compose.yml`).
It defines two helper services:

```yaml
minio: # serves the API and the web console
minio-init: # one-shot bucket bootstrap via `mc mb --ignore-existing`
```

Run it one of two ways:

```bash
# 1. Full stack in containers — the API reaches MinIO at http://minio:9000:
docker compose -f docker-compose.yml -f docker-compose.minio.yml up

# 2. MinIO only, with the API/web running on the host via `pnpm dev`
#    (set MINIO_ENDPOINT=http://localhost:9000):
docker compose -f docker-compose.minio.yml up
```

Open the console at `http://localhost:9001` (default credentials `minioadmin` / `minioadmin`).

### Browser uploads & CORS

Presigned PUT uploads happen directly from the browser. MinIO must allow the web app's origin. The compose service sets `MINIO_API_CORS_ALLOW_ORIGIN` (defaults to `*` for dev). For production-hardened MinIO deployments, restrict this to the actual web origin.

### Storage relay (keeping MinIO internal)

By default the browser talks to MinIO directly via presigned URLs, which means MinIO must be reachable from the browser (a public HTTPS endpoint) and must allow the web origin via CORS. When that is not acceptable — e.g. MinIO sits on an internal network that must not be exposed — set `MINIO_RELAY_ENABLED=true` (and `API_ORIGIN`) to enable the **storage relay**, in which the API acts as a transparent reverse proxy for MinIO's presigned URLs:

- Set `MINIO_RELAY_ENABLED=true` and `API_ORIGIN` to the API's public origin (scheme + host, no path — e.g. `https://api.example.cl`). The API derives the relay base by appending its own `/api/storage` route; you never spell the path out, so it can't drift from the route. With the relay enabled but `API_ORIGIN` missing the API aborts at boot.
- The presigned URL is still **signed against the internal `MINIO_ENDPOINT`**, then its origin is rewritten to `<API_ORIGIN>/api/storage` (e.g. `https://api.example.cl/api/storage`). The signature (path + query) is preserved verbatim.
- The browser hits `<API_ORIGIN>/api/storage/<bucket>/<key>?X-Amz-...` (an API route), and the API forwards the request **unchanged** to the internal endpoint. Because the forward preserves the signed host/path/query, MinIO revalidates the original signature — there is **no re-signing**.
- The relay streams uploads (`PUT`), downloads (`GET`), and range requests, and is served by `storageRelayPlugin` at `/api/storage/*`. MinIO never needs a public URL or CORS config; CORS is handled by the API.

The relay is MinIO-only (Azure serves SAS URLs directly over HTTPS; enabling it with `STORAGE_PROVIDER=azure_blob_storage` aborts at boot). Leave `MINIO_RELAY_ENABLED` unset/`false` to keep the browser-direct behaviour described above. All file bytes flow through the API process, so size the API for the expected transfer volume.

## Env var reference

| Variable                       | Provider | Required    | Default     | Notes                                                   |
| ------------------------------ | -------- | ----------- | ----------- | ------------------------------------------------------- |
| `STORAGE_PROVIDER`             | both     | yes         | —           | `azure_blob_storage` or `minio`                         |
| `AZURE_STORAGE_ACCOUNT_NAME`   | Azure    | yes (Azure) | —           | Storage account name                                    |
| `AZURE_STORAGE_CONTAINER_NAME` | Azure    | no          | `files`     | Container name                                          |
| `AZURE_STORAGE_TENANT_ID`      | Azure    | no          | —           | Service Principal; all three → `ClientSecretCredential` |
| `AZURE_STORAGE_CLIENT_ID`      | Azure    | no          | —           | Service Principal; all three → `ClientSecretCredential` |
| `AZURE_STORAGE_CLIENT_SECRET`  | Azure    | no          | —           | Service Principal; all three → `ClientSecretCredential` |
| `MINIO_ENDPOINT`               | MinIO    | yes (MinIO) | —           | Endpoint URL                                            |
| `MINIO_ACCESS_KEY`             | MinIO    | yes (MinIO) | —           | S3 access key id                                        |
| `MINIO_SECRET_KEY`             | MinIO    | yes (MinIO) | —           | S3 secret access key                                    |
| `MINIO_BUCKET`                 | MinIO    | no          | `files`     | Bucket name                                             |
| `MINIO_REGION`                 | MinIO    | no          | `us-east-1` | S3 client region                                        |
| `MINIO_FORCE_PATH_STYLE`       | MinIO    | no          | `true`      | Path-style URLs                                         |
| `MINIO_RELAY_ENABLED`          | MinIO    | no          | `false`     | Enable the storage relay (keeps MinIO internal)         |
| `API_ORIGIN`                   | MinIO    | if relay    | —           | API public origin; relay appends `/api/storage`         |

## Switching storage providers

`file.blob_path` in the database is a **provider-agnostic key** — it names the object but not the backend. The bytes themselves live only in the backend the file was originally uploaded to. So changing `STORAGE_PROVIDER` **after data exists** (e.g. `minio` → `azure_blob_storage`) leaves every previously-stored asset — badge images, carbon-inventory line files, submission attachments, the Terms & Conditions PDF — pointing at a key that does not exist in the new backend. The result is broken links: reads 404/403 at call time.

If you must switch after data has been written, pick one of:

1. **Reset + reseed** — `pnpm db:restore` drops and reseeds the database, which reuploads the seed assets to the now-current provider. Simplest when you can afford to lose non-seed data.
2. **Copy the objects between backends, preserving keys** — mirror every object from the old backend to the new one under the identical key, so the existing `file.blob_path` values keep resolving.
3. **Repoint the DB `file.blob_path` values** — rewrite the stored keys to point at objects that already exist in the new backend.

> **Caveat.** An asset can end up with **no valid object in either backend** — e.g. a badge type that has no counterpart object in the target. Repointing (option 3) can't fix that, because there is no existing key to point at; that asset needs an actual **upload** to the current provider.

## Upload protocol

The frontend never assumes how to upload — every request-upload endpoint returns the method and headers the client must use:

```json
{
  "uuid": "…",
  "uploadUrl": "https://…",
  "uploadMethod": "PUT",
  "uploadHeaders": { "x-ms-blob-type": "BlockBlob" },
  "expiresAt": "2026-05-28T14:00:00Z"
}
```

`uploadHeaders` is `{ "x-ms-blob-type": "BlockBlob" }` when the active provider is Azure, and `{}` when it is MinIO.

`apps/web/src/api/lib/uploadFile.ts` is the shared helper:

```ts
import { uploadFile } from "@/api/lib/uploadFile";

await uploadFile({
  url: uploadUrl,
  method: uploadMethod,
  headers: uploadHeaders,
  body: file,
});
```

All upload hooks in `apps/web/src/api/query/**` use this helper. Do not introduce new hard-coded methods or Azure-specific headers anywhere in the frontend.

## Testing

Integration tests run against a real object-storage testcontainer matching `STORAGE_PROVIDER`:

```bash
STORAGE_PROVIDER=azure_blob_storage pnpm test --filter=api -- files/ --coverage=false
STORAGE_PROVIDER=minio              pnpm test --filter=api -- files/ --coverage=false
```

The setup is in `apps/api/test/setup/testStorage.ts` (storage container) and `testDatabase.ts` (Postgres container), wired together by `globalSetup.ts`:

- Azure path uses `AzuriteContainer` (`@testcontainers/azurite`).
- MinIO path uses `GenericContainer("minio/minio")`.

Neither path creates the bucket/container up front — `createAzureBlobTestAdapter`/`createMinioTestAdapter` (`@repo/storage/testing`) create it lazily and idempotently the first time a test app is built against the descriptor.

CI partitions this into three legs instead of running the full suite twice: `Test (base)` (`pnpm test:base`) runs everything **except** the storage manifest, while `Test (storage-azure)` (`pnpm test:storage-azure`) and `Test (storage-minio)` (`pnpm test:storage-minio`) run **only** the manifest against each provider. All three must pass for a PR to merge. See [Storage test manifest](../development/ci-cd.md#storage-test-manifest) for how that manifest is kept honest.

## Operational notes

- **Presigned URL expiry**: defaults to 15 minutes (`PRESIGNED_URL_EXPIRY_MINUTES` in `apps/api/src/config/constants.ts`). Tune there if your country deployment needs a different default.
- **Copy semantics**: `storage.copyObject` returns only after the copy is complete in the backend. Azure polls via `beginCopyFromURL`; S3 returns synchronously from `CopyObjectCommand`. Callers can rely on the awaited promise.
- **Deletes are idempotent**: `storage.deleteObject` succeeds when the path does not exist (no thrown errors, no 404 handling needed at callsites).
- **Path-style URLs**: required by MinIO out of the box. Override `MINIO_FORCE_PATH_STYLE=false` only if your S3-compatible store explicitly needs virtual-hosted-style URLs.
- **Health check**: the storage plugin runs `storage.healthCheck()` in the background after startup and logs a warning if the bucket/container is unreachable. The API stays up — the request that needs storage will surface the underlying error at call time.
