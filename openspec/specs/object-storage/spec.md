# object-storage Specification

## Purpose

TBD - created by archiving change add-storage-adapter-minio. Update Purpose after archive.

## Requirements

### Requirement: Storage provider is selected at startup via configuration

The system SHALL select exactly one object storage backend per process via the `STORAGE_PROVIDER` environment variable, validated at startup before the API begins serving requests.

#### Scenario: Valid provider value boots the API

- **WHEN** the API process starts with `STORAGE_PROVIDER=azure_blob_storage` or `STORAGE_PROVIDER=minio` and all provider-specific variables present
- **THEN** the API initializes successfully and a single `StorageAdapter` is decorated onto Fastify as `fastify.storage`

#### Scenario: Missing provider aborts startup

- **WHEN** the API process starts without `STORAGE_PROVIDER` set
- **THEN** startup throws with a message identifying the missing variable and the API does not begin serving traffic

#### Scenario: Invalid provider aborts startup

- **WHEN** the API process starts with `STORAGE_PROVIDER` set to a value not in the supported set
- **THEN** startup throws with a message listing the accepted values

#### Scenario: Provider chosen but provider-specific configuration is incomplete

- **WHEN** the API process starts with `STORAGE_PROVIDER=minio` and any of `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, or `MINIO_SECRET_KEY` is missing
- **THEN** startup throws with a message identifying the missing MinIO variables
- **AND** symmetrically, when `STORAGE_PROVIDER=azure_blob_storage` and `AZURE_STORAGE_ACCOUNT_NAME` is missing, startup throws with a message identifying the missing Azure variable

### Requirement: Storage adapter exposes a backend-agnostic contract

The system SHALL expose all object-storage operations through a single `StorageAdapter` interface, and feature code SHALL depend only on that interface — not on any backend SDK directly.

#### Scenario: Adapter provides the canonical operation set

- **WHEN** any feature handler or service needs to interact with object storage
- **THEN** it accesses `fastify.storage` and calls one of: `generateReadUrl`, `createReadUrlSigner`, `generateWriteUrl`, `headObject`, `streamObject`, `putObject`, `deleteObject`, `copyObject`, `healthCheck`
- **AND** no code outside the `@repo/storage` package (`packages/storage/`) imports from `@azure/storage-blob`, `@aws-sdk/client-s3`, or `@aws-sdk/s3-request-presigner` directly

### Requirement: Read URL generation supports batched signing

The system SHALL allow callers that need to sign many object paths in one operation to amortize provider-side setup cost across the batch.

#### Scenario: Batched signing across N paths uses a single setup call on Azure

- **WHEN** a caller invokes `createReadUrlSigner()` and then calls the returned signer N times
- **THEN** the Azure adapter fetches a single user-delegation key and reuses it to sign all N URLs
- **AND** the MinIO adapter returns a closure that signs locally per call, with no remote round-trip

### Requirement: Write URL response declares the upload protocol

The system SHALL return, alongside every presigned write URL it issues to a client, the HTTP method and headers the client must use to perform the upload.

#### Scenario: Upload-request endpoint returns method and headers

- **WHEN** a client calls a request-upload endpoint (e.g. `POST /files/requestUpload`)
- **THEN** the response includes `uploadUrl`, `uploadMethod` (member of `HttpUploadMethod`), `uploadHeaders` (string → string map), `expiresAt`, and the resource identifier (e.g. `uuid`)

#### Scenario: Azure write URL declares the BlockBlob header

- **WHEN** the active provider is `azure_blob_storage` and a write URL is generated
- **THEN** `uploadMethod` is `PUT` and `uploadHeaders` includes `{"x-ms-blob-type": "BlockBlob"}`

#### Scenario: MinIO write URL declares no extra headers

- **WHEN** the active provider is `minio` and a write URL is generated
- **THEN** `uploadMethod` is `PUT` and `uploadHeaders` is empty (or contains only headers the S3 presigner requires)

#### Scenario: Frontend consumes the declared method and headers

- **WHEN** the frontend performs the upload
- **THEN** it issues the request using `uploadMethod` as the HTTP method and `uploadHeaders` as the request headers
- **AND** it does not hard-code provider-specific values such as `x-ms-blob-type`

### Requirement: Head and delete operations are predictable across providers

The system SHALL surface object-presence and deletion operations with consistent error and idempotency semantics regardless of provider.

#### Scenario: Head of a missing object throws a domain error

- **WHEN** a caller invokes `storage.headObject(path)` on a path that does not exist
- **THEN** the call throws `ObjectNotFoundError`
- **AND** higher-level helpers (e.g. file-record persistence) translate this into their own domain error (e.g. `FileNotFoundError`) without leaking SDK-specific error types

#### Scenario: Delete of a missing object succeeds

- **WHEN** a caller invokes `storage.deleteObject(path)` on a path that does not exist
- **THEN** the call returns successfully (idempotent semantics) — no error is thrown

### Requirement: Copy operations complete synchronously from the caller's perspective

The system SHALL ensure that `copyObject` only returns after the operation has completed in the backend. The interface deliberately omits a move primitive — the only consumer pattern is copy-then-cleanup (`linkFilesToSubmission` + `cleanupSourceObjects`), so a `moveObject` would have no callers (YAGNI).

#### Scenario: Copy returns after backend confirms completion

- **WHEN** a caller awaits `storage.copyObject(src, dst)`
- **THEN** by the time the promise resolves, the destination object exists and is readable
- **AND** on Azure the adapter polls the asynchronous copy until done; on MinIO/S3 the adapter awaits the synchronous copy command directly

### Requirement: Read URL options propagate response content-type and disposition

The system SHALL honor caller-supplied `contentType` and `contentDisposition` hints when generating a read URL, so that downloads are served with the correct browser behavior regardless of provider.

#### Scenario: Azure encodes overrides into the SAS query

- **WHEN** a caller invokes `generateReadUrl(path, { contentType, contentDisposition })` with the Azure adapter active
- **THEN** the returned URL carries the overrides as SAS query parameters
- **AND** the response from the storage backend uses those values

#### Scenario: MinIO encodes overrides as S3 response-header parameters

- **WHEN** a caller invokes `generateReadUrl(path, { contentType, contentDisposition })` with the MinIO adapter active
- **THEN** the returned URL includes `response-content-type` and `response-content-disposition` query parameters (signed via `GetObjectCommand`'s `ResponseContentType` / `ResponseContentDisposition`)
- **AND** the response from MinIO uses those values

### Requirement: Adapter exposes a health check

The system SHALL provide a `healthCheck()` method on every adapter that verifies the configured bucket/container is reachable.

#### Scenario: Healthy bucket logs at info level

- **WHEN** the storage plugin runs its background health check after startup
- **AND** the configured bucket/container exists and is reachable
- **THEN** the plugin logs at info level and the adapter remains decorated on Fastify

#### Scenario: Missing bucket logs a warning but does not abort

- **WHEN** the storage plugin runs its background health check after startup
- **AND** the configured bucket/container is missing or unreachable
- **THEN** the plugin logs a warning identifying the bucket/container
- **AND** the API continues to serve requests (operations against the missing bucket will fail at call time)

### Requirement: Storage backend is testable in isolation per provider

The system SHALL allow the API test suite to run against either provider, selected via the same `STORAGE_PROVIDER` environment variable, using a real object-storage backend (no SDK mocks for the storage layer).

#### Scenario: Test suite runs against Azurite

- **WHEN** the test suite runs with `STORAGE_PROVIDER=azure_blob_storage`
- **THEN** the test setup starts an Azurite testcontainer, provisions a container, and constructs the Azure adapter against it

#### Scenario: Test suite runs against MinIO

- **WHEN** the test suite runs with `STORAGE_PROVIDER=minio`
- **THEN** the test setup starts a MinIO testcontainer via `GenericContainer("minio/minio")`, creates the bucket, and constructs the MinIO adapter against it

#### Scenario: CI validates both providers per pull request

- **WHEN** a pull request triggers CI
- **THEN** the `test` job runs once per value of the `storage_provider` matrix dimension (`azure_blob_storage`, `minio`)
- **AND** both runs must pass for the PR to be mergeable
