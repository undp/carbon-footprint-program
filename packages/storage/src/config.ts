import { StorageProvider } from "./provider.js";

/** Default presigned-URL validity when a caller does not override it. */
export const DEFAULT_PRESIGNED_URL_EXPIRY_MINUTES = 15;

/** Settings the Azure Blob adapter needs to construct its client. */
export interface AzureStorageConfig {
  accountName: string;
  containerName: string;
  /**
   * Optional explicit Service Principal. When all three are set, an explicit
   * `ClientSecretCredential` is used (local / docker-compose path). Otherwise
   * the adapter falls back to `DefaultAzureCredential` (Managed Identity).
   */
  tenantId?: string | undefined;
  clientId?: string | undefined;
  clientSecret?: string | undefined;
}

/** Settings the MinIO / S3-compatible adapter needs to construct its client. */
export interface MinioStorageConfig {
  endpoint: string;
  /**
   * Static S3 access key. Optional: when both `accessKey` and `secretKey` are
   * set, the adapter signs with them (MinIO, on-prem S3, an explicit AWS IAM
   * key, or Google Cloud Storage's HMAC interoperability keys). When both are
   * absent, the adapter omits explicit credentials so the AWS SDK v3 default
   * credential chain (ECS/EKS task role, EC2 instance profile, env vars, SSO,
   * …) supplies them — the keyless best-practice path on AWS. Enforced
   * both-or-neither by `storageConfigFromEnv`.
   */
  accessKey?: string | undefined;
  /** Static S3 secret key. Optional, both-or-neither with `accessKey`. */
  secretKey?: string | undefined;
  bucket: string;
  region: string;
  forcePathStyle: boolean;
  /**
   * Optional public relay base. When set, every presigned URL the
   * adapter returns has its origin (and any base path) rewritten to this value,
   * keeping the signed path + query intact, so the browser talks to the API
   * relay instead of the internal endpoint. Composed and injected by the API
   * layer (from `API_ORIGIN` + the relay route prefix) when
   * `MINIO_RELAY_ENABLED=true`; it is not read from env here. Unset →
   * URLs keep `endpoint`, unchanged. Example: "https://api.example.cl/api/storage".
   */
  publicBaseUrl?: string | undefined;
}

/**
 * Fully-resolved storage configuration injected into `createStorageAdapter`.
 * A discriminated union on `provider` so the type system guarantees the
 * matching provider settings are present.
 */
export type StorageConfig =
  | {
      provider: StorageProvider.AZURE_BLOB_STORAGE;
      azure: AzureStorageConfig;
      presignedUrlExpiryMinutes?: number;
    }
  | {
      provider: StorageProvider.MINIO;
      minio: MinioStorageConfig;
      presignedUrlExpiryMinutes?: number;
    };

/**
 * Builds a validated `StorageConfig` from an environment record. The record is
 * passed in by the caller (the API's config layer, the seed scripts) — this
 * function never touches the global `process.env`, keeping the package pure
 * and unit-testable. Throws when `STORAGE_PROVIDER` or a required
 * provider-specific variable is missing.
 */
export function storageConfigFromEnv(
  env: Record<string, string | undefined>
): StorageConfig {
  const raw = env.STORAGE_PROVIDER;
  const allowed = Object.values(StorageProvider);
  if (!raw) {
    throw new Error(
      `STORAGE_PROVIDER is required. Allowed values are: ${allowed.join(", ")}.`
    );
  }
  if (!allowed.includes(raw as StorageProvider)) {
    throw new Error(
      `Invalid STORAGE_PROVIDER value: "${raw}". Allowed values are: ${allowed.join(", ")}.`
    );
  }
  const provider = raw as StorageProvider;

  if (provider === StorageProvider.AZURE_BLOB_STORAGE) {
    const accountName = env.AZURE_STORAGE_ACCOUNT_NAME;
    if (!accountName) {
      throw new Error(
        "STORAGE_PROVIDER=azure_blob_storage but AZURE_STORAGE_ACCOUNT_NAME is missing"
      );
    }
    return {
      provider,
      azure: {
        accountName,
        // `||` (not `??`) so the empty-string placeholder also defaults.
        containerName: env.AZURE_STORAGE_CONTAINER_NAME || "files",
        tenantId: env.AZURE_STORAGE_TENANT_ID,
        clientId: env.AZURE_STORAGE_CLIENT_ID,
        clientSecret: env.AZURE_STORAGE_CLIENT_SECRET,
      },
    };
  }

  const endpoint = env.MINIO_ENDPOINT;
  if (!endpoint) {
    throw new Error("STORAGE_PROVIDER=minio but MINIO_ENDPOINT is missing");
  }
  // `|| undefined` so an empty-string placeholder (docker-compose passes
  // `${MINIO_ACCESS_KEY:-}` → "" when the host var is unset) is treated as
  // absent, not as a real (empty) credential.
  const accessKey = env.MINIO_ACCESS_KEY || undefined;
  const secretKey = env.MINIO_SECRET_KEY || undefined;
  // Both-or-neither. The static keys are optional so AWS deployments can run
  // keyless (an ECS/EKS task role or EC2 instance profile supplies credentials
  // via the SDK default chain), but a half-configured pair is a
  // misconfiguration we refuse rather than silently drop one credential.
  // (Google Cloud Storage's S3 interoperability has no keyless mode — it only
  // authenticates with HMAC keys, so GCS deployments must set both.)
  if ((accessKey === undefined) !== (secretKey === undefined)) {
    throw new Error(
      "STORAGE_PROVIDER=minio requires MINIO_ACCESS_KEY and MINIO_SECRET_KEY " +
        "together, or neither. Set both for static credentials (MinIO, on-prem " +
        "S3, or Google Cloud Storage HMAC keys), or leave both unset on AWS to " +
        "use the default credential chain (ECS/EKS task role, instance profile, …)."
    );
  }
  return {
    provider,
    minio: {
      endpoint,
      accessKey,
      secretKey,
      // `||` (not `??`) so the empty-string placeholder also defaults.
      bucket: env.MINIO_BUCKET || "files",
      region: env.MINIO_REGION || "us-east-1",
      forcePathStyle: env.MINIO_FORCE_PATH_STYLE?.toLowerCase() !== "false",
      // `publicBaseUrl` is intentionally NOT read here — the storage relay is an
      // API concern (the `/api/storage` mount lives in apps/api). The API layer
      // composes and injects it; this shared parser stays routing-agnostic.
    },
  };
}
