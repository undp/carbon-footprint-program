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
  accessKey: string;
  secretKey: string;
  bucket: string;
  region: string;
  forcePathStyle: boolean;
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
  const accessKey = env.MINIO_ACCESS_KEY;
  const secretKey = env.MINIO_SECRET_KEY;
  if (!endpoint || !accessKey || !secretKey) {
    throw new Error(
      "STORAGE_PROVIDER=minio but MINIO_ENDPOINT, MINIO_ACCESS_KEY, or MINIO_SECRET_KEY is missing"
    );
  }
  return {
    provider,
    minio: {
      endpoint,
      accessKey,
      secretKey,
      bucket: env.MINIO_BUCKET ?? "files",
      region: env.MINIO_REGION ?? "us-east-1",
      forcePathStyle: env.MINIO_FORCE_PATH_STYLE?.toLowerCase() !== "false",
    },
  };
}
