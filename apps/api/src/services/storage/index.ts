import { StorageProvider } from "@/config/constants.js";
import type { StorageAdapter } from "./types.js";

export * from "./types.js";

/**
 * Constructs the concrete `StorageAdapter` implementation selected by `provider`.
 *
 * Adapters are imported lazily so a deployment that only uses one provider does
 * not pay the cost of loading the other backend's SDK.
 */
export async function createStorageAdapter(
  provider: StorageProvider
): Promise<StorageAdapter> {
  switch (provider) {
    case StorageProvider.AZURE_BLOB_STORAGE: {
      const { createAzureBlobAdapter } =
        await import("./adapters/azureBlobAdapter.js");
      return createAzureBlobAdapter();
    }
    case StorageProvider.MINIO: {
      const { createMinioAdapter } = await import("./adapters/minioAdapter.js");
      return createMinioAdapter();
    }
    default: {
      const exhaustiveCheck: never = provider;
      throw new Error(
        `Unsupported STORAGE_PROVIDER: ${String(exhaustiveCheck)}`
      );
    }
  }
}
