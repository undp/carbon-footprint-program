import { BlobServiceClient } from "@azure/storage-blob";
import { CreateBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { createAzureBlobAdapterFromClient } from "./adapters/azureBlobAdapter.js";
import { createMinioAdapterFromClient } from "./adapters/minioAdapter.js";
import type { StorageAdapter } from "./types.js";

/**
 * Test-only helpers for building a `StorageAdapter` against a running
 * testcontainer. They own all raw storage-SDK construction and bucket/container
 * bootstrap, so application test code (factories, setup) never imports a
 * storage SDK directly. Imported via the `@repo/storage/testing` subpath.
 */

export interface AzureTestStorageOptions {
  connectionString: string;
  containerName: string;
}

/**
 * Builds an Azure adapter from an Azurite connection string, ensuring the
 * container exists first. Idempotent — safe to call once per test app.
 */
export async function createAzureBlobTestAdapter(
  opts: AzureTestStorageOptions
): Promise<StorageAdapter> {
  const client = BlobServiceClient.fromConnectionString(opts.connectionString);
  await client.getContainerClient(opts.containerName).createIfNotExists();
  return createAzureBlobAdapterFromClient(client, opts.containerName);
}

export interface MinioTestStorageOptions {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  region: string;
  bucket: string;
  forcePathStyle?: boolean;
}

/**
 * Builds a MinIO adapter pointed at a testcontainer endpoint, ensuring the
 * bucket exists first. Idempotent — an already-existing bucket is ignored, so
 * it is safe to call once per test app.
 */
export async function createMinioTestAdapter(
  opts: MinioTestStorageOptions
): Promise<StorageAdapter> {
  const s3 = new S3Client({
    endpoint: opts.endpoint,
    region: opts.region,
    forcePathStyle: opts.forcePathStyle ?? true,
    credentials: {
      accessKeyId: opts.accessKey,
      secretAccessKey: opts.secretKey,
    },
  });

  try {
    await s3.send(new CreateBucketCommand({ Bucket: opts.bucket }));
  } catch (err) {
    // Bucket already created by a previous call/container bootstrap — ignore.
    const name = err instanceof Error ? err.name : "";
    if (name !== "BucketAlreadyOwnedByYou" && name !== "BucketAlreadyExists") {
      throw err;
    }
  }

  return createMinioAdapterFromClient(s3, opts.bucket);
}
