import { StorageProvider } from "./provider.js";
import type { StorageConfig } from "./config.js";
import type { StorageAdapter } from "./types.js";

/**
 * Constructs the concrete `StorageAdapter` selected by `config.provider`.
 *
 * Adapters are imported lazily so a deployment that only uses one provider does
 * not pay the cost of loading the other backend's SDK.
 */
export async function createStorageAdapter(
  config: StorageConfig
): Promise<StorageAdapter> {
  switch (config.provider) {
    case StorageProvider.AZURE_BLOB_STORAGE: {
      const { createAzureBlobAdapter } =
        await import("./adapters/azureBlobAdapter.js");
      return createAzureBlobAdapter(
        config.azure,
        config.presignedUrlExpiryMinutes
      );
    }
    case StorageProvider.MINIO: {
      const { createMinioAdapter } = await import("./adapters/minioAdapter.js");
      return createMinioAdapter(config.minio, config.presignedUrlExpiryMinutes);
    }
    default: {
      const exhaustiveCheck: never = config;
      throw new Error(
        `Unsupported storage provider: ${JSON.stringify(exhaustiveCheck)}`
      );
    }
  }
}
