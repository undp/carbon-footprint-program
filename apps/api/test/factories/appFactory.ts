import { buffer } from "node:stream/consumers";
import { createApp } from "@/app.js";
import prismaPlugin from "@/plugins/app/prisma.js";
import { BlobServiceClient } from "@azure/storage-blob";
import { S3Client } from "@aws-sdk/client-s3";
import { StorageProvider } from "@/config/constants.js";
import { createAzureBlobAdapterFromClient } from "@/services/storage/adapters/azureBlobAdapter.js";
import { createMinioAdapterFromClient } from "@/services/storage/adapters/minioAdapter.js";
import type { StorageAdapter } from "@/services/storage/index.js";
import type { TestStorageDescriptor } from "../setup/testcontainers.js";
import type { FastifyInstance } from "fastify";

interface CreateTestAppOptions {
  storageDescriptor?: TestStorageDescriptor;
}

function buildTestAdapter(
  descriptor: TestStorageDescriptor
): StorageAdapter | null {
  if (descriptor.provider === StorageProvider.AZURE_BLOB_STORAGE) {
    if (!descriptor.azureConnectionString || !descriptor.containerName) {
      return null;
    }
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      descriptor.azureConnectionString
    );
    const adapter = createAzureBlobAdapterFromClient(
      blobServiceClient,
      descriptor.containerName
    );
    // Azurite cannot service a server-side copy-from-URL when the source URL is
    // the host-mapped testcontainer endpoint: Azurite, running inside its
    // container, can't reach `127.0.0.1:<hostPort>` to fetch the blob. Real
    // Azure has no such limitation (the storage service fetches the SAS URL
    // directly). For tests we substitute an equivalent client-side stream copy
    // so copyObject moves real bytes against Azurite.
    adapter.copyObject = async (src: string, dst: string): Promise<void> => {
      if (src === dst) return;
      const { body, mimeType } = await adapter.streamObject(src);
      await adapter.putObject(
        dst,
        await buffer(body),
        mimeType ? { contentType: mimeType } : undefined
      );
    };
    return adapter;
  }
  if (descriptor.provider === StorageProvider.MINIO) {
    if (!descriptor.minioEndpoint || !descriptor.containerName) {
      return null;
    }
    const s3 = new S3Client({
      endpoint: descriptor.minioEndpoint,
      region: descriptor.minioRegion,
      forcePathStyle: true,
      credentials: {
        accessKeyId: descriptor.minioAccessKey,
        secretAccessKey: descriptor.minioSecretKey,
      },
    });
    return createMinioAdapterFromClient(s3, descriptor.containerName);
  }
  return null;
}

export async function createTestApp(
  databaseUrl: string,
  options?: CreateTestAppOptions
): Promise<FastifyInstance> {
  const app = await createApp(false);
  app.log.level = "debug";

  await app.register(prismaPlugin, { databaseUrl });

  // Must call ready() BEFORE overriding the storage adapter.
  // storagePlugin runs during ready() and would overwrite any earlier assignment.
  await app.ready();

  if (options?.storageDescriptor) {
    const adapter = buildTestAdapter(options.storageDescriptor);
    if (adapter) {
      app.storage = adapter;
      // eslint-disable-next-line no-console
      console.log(
        `[createTestApp] Storage adapter configured (provider=${options.storageDescriptor.provider}, container=${options.storageDescriptor.containerName})`
      );
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        "[createTestApp] Storage descriptor present but missing fields — leaving the boot-time adapter in place."
      );
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      "[createTestApp] No storage descriptor provided — storage-dependent assertions will fail unless the boot adapter is configured."
    );
  }

  return app;
}
