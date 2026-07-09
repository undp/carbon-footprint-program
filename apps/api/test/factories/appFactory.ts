import { createApp } from "@/app.js";
import prismaPlugin from "@/plugins/app/prisma.js";
import { StorageProvider, type StorageAdapter } from "@repo/storage";
import {
  createAzureBlobTestAdapter,
  createMinioTestAdapter,
} from "@repo/storage/testing";
import type { TestStorageDescriptor } from "../setup/testStorage.js";
import { getPerFileDatabaseUrl } from "../setup/perFileDatabase.js";
import type { FastifyInstance } from "fastify";

interface CreateTestAppOptions {
  storageDescriptor?: TestStorageDescriptor | null;
  /**
   * Opt-in public relay base for the MinIO leg. When set, the overridden
   * storage adapter rewrites presigned URLs to this origin (mirrors the API
   * relay base, `API_ORIGIN` + `/api/storage`), so relay tests can drive
   * `/api/storage/*`. Left unset by every other test, which keeps asserting the
   * internal-endpoint URL.
   */
  storagePublicBaseUrl?: string;
}

async function buildTestAdapter(
  descriptor: TestStorageDescriptor,
  publicBaseUrl?: string
): Promise<StorageAdapter> {
  switch (descriptor.provider) {
    case StorageProvider.AZURE_BLOB_STORAGE: {
      return createAzureBlobTestAdapter({
        connectionString: descriptor.connectionString,
        containerName: descriptor.containerName,
      });
    }
    case StorageProvider.MINIO: {
      return createMinioTestAdapter({
        endpoint: descriptor.endpoint,
        accessKey: descriptor.accessKey,
        secretKey: descriptor.secretKey,
        region: descriptor.region,
        bucket: descriptor.bucket,
        publicBaseUrl,
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
  const app = await createApp(false, { skipUnderPressure: true });
  app.log.level = "debug";

  // Prefer this file's private database (created in perFileDatabase.ts setup)
  // so parallel files never collide. Falls back to the passed URL (the shared
  // template) if per-file isolation isn't active — keeps the 148 existing
  // `createTestApp(inject("databaseUrl"), …)` call sites working unchanged.
  const effectiveDatabaseUrl = getPerFileDatabaseUrl() ?? databaseUrl;

  await app.register(prismaPlugin, { databaseUrl: effectiveDatabaseUrl });

  // Must call ready() BEFORE overriding the storage adapter.
  // storagePlugin runs during ready() and would overwrite any earlier assignment.
  await app.ready();

  if (options?.storageDescriptor) {
    app.storage = await buildTestAdapter(
      options.storageDescriptor,
      options.storagePublicBaseUrl
    );
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
