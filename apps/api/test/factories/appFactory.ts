import { createApp } from "@/app.js";
import prismaPlugin from "@/plugins/app/prisma.js";
import { BlobServiceClient } from "@azure/storage-blob";
import type { FastifyInstance } from "fastify";

interface CreateTestAppOptions {
  storageConnectionString?: string;
  storageContainerName?: string;
}

export async function createTestApp(
  databaseUrl: string,
  options?: CreateTestAppOptions
): Promise<FastifyInstance> {
  const app = await createApp(false, { skipUnderPressure: true });
  app.log.level = "debug";

  await app.register(prismaPlugin, { databaseUrl });

  // Must call ready() BEFORE overriding blob storage decorators.
  // blobStoragePlugin runs during ready() and would overwrite any assignment
  // made beforehand, leaving app.blobStorage as undefined.
  await app.ready();

  if (options?.storageConnectionString && options?.storageContainerName) {
    // Override the undefined blob storage decorators set by blobStoragePlugin
    // (blobStoragePlugin sets them to undefined when env vars are missing).
    // Since the decorator properties are writable, we can assign the Azurite clients directly.
    try {
      const blobServiceClient = BlobServiceClient.fromConnectionString(
        options.storageConnectionString
      );
      const containerClient = blobServiceClient.getContainerClient(
        options.storageContainerName
      );

      app.blobServiceClient = blobServiceClient;
      app.blobStorage = containerClient;
      app.storageAccountName = blobServiceClient.accountName;
      app.storageContainerName = options.storageContainerName;

      // eslint-disable-next-line no-console
      console.log(
        `[createTestApp] Blob storage configured: account="${blobServiceClient.accountName}" container="${options.storageContainerName}"`
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        "[createTestApp] Failed to configure blob storage — storage-dependent assertions will fail.",
        error
      );
      throw error;
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      "[createTestApp] No storage credentials provided — app.blobStorage will be undefined."
    );
  }

  return app;
}
