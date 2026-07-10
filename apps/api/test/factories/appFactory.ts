import { createApp } from "@/app.js";
import prismaPlugin from "@/plugins/app/prisma.js";
import { StorageProvider, type StorageAdapter } from "@repo/storage";
import {
  createAzureBlobTestAdapter,
  createMinioTestAdapter,
} from "@repo/storage/testing";
import { createThrowingStorageAdapter } from "./throwingStorageAdapter.js";
import type { TestStorageDescriptor } from "../setup/testStorage.js";
import { getPerFileDatabaseUrl } from "../setup/perFileDatabase.js";
import type { FastifyInstance } from "fastify";

interface CreateTestAppOptions {
  storageDescriptor?: TestStorageDescriptor | null;
  /**
   * Opt-in public relay base for the storage-minio leg. When set, the overridden
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

  const descriptor = options?.storageDescriptor;

  if (descriptor === null) {
    // The test explicitly requested storage (`storageDescriptor:
    // inject("storageDescriptor")`) but the storage testcontainer failed to
    // start, so globalSetup provided `null`. Fail early with a clear reason
    // instead of a confusing adapter error deeper in the test.
    throw new Error(
      "createTestApp received `storageDescriptor: null` — the storage " +
        "testcontainer failed to start (see the globalSetup warning above). " +
        "This test requires real storage. Ensure Docker is available and the " +
        "storage testcontainer starts successfully."
    );
  }

  if (descriptor === undefined) {
    // No descriptor requested → storage-agnostic test. Replace the boot adapter
    // with one whose every method throws, so any accidental storage access fails
    // loudly (see throwingStorageAdapter for the actionable message).
    app.storage = createThrowingStorageAdapter();
  } else {
    app.storage = await buildTestAdapter(
      descriptor,
      options?.storagePublicBaseUrl
    );
    // eslint-disable-next-line no-console
    console.log(
      `[createTestApp] Storage adapter configured (provider=${descriptor.provider})`
    );
  }

  return app;
}
