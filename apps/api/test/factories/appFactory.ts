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
  const app = await createApp(false);
  app.log.level = "silent";

  await app.register(prismaPlugin, { databaseUrl });

  if (options?.storageConnectionString && options?.storageContainerName) {
    // Override the undefined blob storage decorators set by blobStoragePlugin
    // (blobStoragePlugin sets them to undefined when env vars are missing).
    // Since the decorator properties are writable, we can assign the Azurite clients directly.
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
  }

  await app.ready();

  return app;
}
