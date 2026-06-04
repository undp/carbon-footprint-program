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
│  • storagePlugin selects the adapter at startup via              │
│    STORAGE_PROVIDER                                              │
└──────────────────────────────────────────────────────────────────┘
                │                              │
   AzureBlobAdapter                     MinioAdapter
   (@azure/storage-blob)                (@aws-sdk/client-s3)
                │                              │
                ▼                              ▼
   Azure Blob Storage                MinIO / S3-compatible
   (user-delegation SAS)             (pre-signed URLs)
```

The `StorageAdapter` interface (`apps/api/src/services/storage/types.ts`) defines the contract every adapter must satisfy:

- `generateReadUrl`, `createReadUrlSigner`, `generateWriteUrl`
- `headObject`, `streamObject`, `deleteObject`, `copyObject`, `moveObject`
- `healthCheck`

Adapters live in `apps/api/src/services/storage/adapters/`.

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

Authentication uses `DefaultAzureCredential`, which resolves managed identity in Azure or falls back to `az login` locally. No account keys are stored on the API server.

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

## Env var reference

| Variable                       | Provider | Required    | Default     | Notes                           |
| ------------------------------ | -------- | ----------- | ----------- | ------------------------------- |
| `STORAGE_PROVIDER`             | both     | yes         | —           | `azure_blob_storage` or `minio` |
| `AZURE_STORAGE_ACCOUNT_NAME`   | Azure    | yes (Azure) | —           | Storage account name            |
| `AZURE_STORAGE_CONTAINER_NAME` | Azure    | no          | `files`     | Container name                  |
| `MINIO_ENDPOINT`               | MinIO    | yes (MinIO) | —           | Endpoint URL                    |
| `MINIO_ACCESS_KEY`             | MinIO    | yes (MinIO) | —           | S3 access key id                |
| `MINIO_SECRET_KEY`             | MinIO    | yes (MinIO) | —           | S3 secret access key            |
| `MINIO_BUCKET`                 | MinIO    | no          | `files`     | Bucket name                     |
| `MINIO_REGION`                 | MinIO    | no          | `us-east-1` | S3 client region                |
| `MINIO_FORCE_PATH_STYLE`       | MinIO    | no          | `true`      | Path-style URLs                 |

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

The setup is in `apps/api/test/setup/testcontainers.ts`:

- Azure path uses `AzuriteContainer` (`@testcontainers/azurite`).
- MinIO path uses `GenericContainer("minio/minio")` and bootstraps the bucket with `CreateBucketCommand`.

CI runs the API test suite once per provider via `strategy.matrix.storage_provider`. Both must pass for a PR to merge.

## Operational notes

- **Presigned URL expiry**: defaults to 15 minutes (`SAS_URL_EXPIRY_MINUTES` in `apps/api/src/config/constants.ts`). Tune there if your country deployment needs a different default.
- **Copy semantics**: `storage.copyObject` returns only after the copy is complete in the backend. Azure polls via `beginCopyFromURL`; S3 returns synchronously from `CopyObjectCommand`. Callers can rely on the awaited promise.
- **Deletes are idempotent**: `storage.deleteObject` succeeds when the path does not exist (no thrown errors, no 404 handling needed at callsites).
- **Path-style URLs**: required by MinIO out of the box. Override `MINIO_FORCE_PATH_STYLE=false` only if your S3-compatible store explicitly needs virtual-hosted-style URLs.
- **Health check**: the storage plugin runs `storage.healthCheck()` in the background after startup and logs a warning if the bucket/container is unreachable. The API stays up — the request that needs storage will surface the underlying error at call time.
