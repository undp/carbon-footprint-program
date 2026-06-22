/**
 * Object storage backends selectable at runtime via the `STORAGE_PROVIDER`
 * environment variable. The concrete adapter is built by `createStorageAdapter`.
 */
export enum StorageProvider {
  AZURE_BLOB_STORAGE = "azure_blob_storage",
  MINIO = "minio",
}
