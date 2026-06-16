import { buffer } from "node:stream/consumers";
import { createApp } from "@/app.js";
import prismaPlugin from "@/plugins/app/prisma.js";
import { StorageProvider, type StorageAdapter } from "@repo/storage";
import {
  createAzureBlobTestAdapter,
  createMinioTestAdapter,
} from "@repo/storage/testing";
import type { TestStorageDescriptor } from "../setup/testcontainers.js";
import type { FastifyInstance } from "fastify";

interface CreateTestAppOptions {
  storageDescriptor?: TestStorageDescriptor | null;
}

async function buildTestAdapter(
  descriptor: TestStorageDescriptor
): Promise<StorageAdapter> {
  switch (descriptor.provider) {
    case StorageProvider.AZURE_BLOB_STORAGE: {
      const adapter = await createAzureBlobTestAdapter({
        connectionString: descriptor.connectionString,
        containerName: descriptor.containerName,
      });
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
    case StorageProvider.MINIO: {
      return createMinioTestAdapter({
        endpoint: descriptor.endpoint,
        accessKey: descriptor.accessKey,
        secretKey: descriptor.secretKey,
        region: descriptor.region,
        bucket: descriptor.bucket,
      });
    }
    default: {
      const exhaustiveCheck: never = descriptor;
      throw new Error(
        `Unsupported test storage descriptor: ${JSON.stringify(exhaustiveCheck)}`
      );
    }
  }
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
    app.storage = await buildTestAdapter(options.storageDescriptor);
    // eslint-disable-next-line no-console
    console.log(
      `[createTestApp] Storage adapter configured (provider=${options.storageDescriptor.provider})`
    );
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      "[createTestApp] No storage descriptor provided — storage-dependent assertions will fail unless the boot adapter is configured."
    );
  }

  return app;
}
