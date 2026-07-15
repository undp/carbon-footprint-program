import { describe, expect, it } from "vitest";
import { StorageProvider, type StorageAdapter } from "@repo/storage";
import { preflightStorage } from "./preflightStorage.js";

/**
 * Minimal `StorageAdapter` stub for the preflight, which only ever calls
 * `healthCheck`. Every other method rejects if touched, asserting the preflight
 * performs no I/O beyond the connectivity probe. A zero-arg function returning
 * `Promise<never>` is assignable to each method's signature (fewer parameters,
 * bottom return type), so no `any` or type assertions are needed.
 */
function makeFakeAdapter(
  healthCheck: StorageAdapter["healthCheck"]
): StorageAdapter {
  const notCalled = (): Promise<never> =>
    Promise.reject(
      new Error("storage method should not be called during preflight")
    );
  return {
    healthCheck,
    generateReadUrl: notCalled,
    createReadUrlSigner: notCalled,
    generateWriteUrl: notCalled,
    headObject: notCalled,
    streamObject: notCalled,
    putObject: notCalled,
    deleteObject: notCalled,
    copyObject: notCalled,
  };
}

// Enough for `storageConfigFromEnv` to resolve a valid MinIO config, so the
// tests exercise the reachability branch rather than the config branch.
const VALID_MINIO_ENV: Record<string, string | undefined> = {
  STORAGE_PROVIDER: StorageProvider.MINIO,
  MINIO_ENDPOINT: "http://localhost:9000",
  MINIO_ACCESS_KEY: "test-access-key",
  MINIO_SECRET_KEY: "test-secret-key",
};

describe("preflightStorage", () => {
  it("throws a configuration error when object storage is not configured", async () => {
    await expect(preflightStorage({})).rejects.toThrow(
      /required for the base seed .* is not configured/
    );
  });

  it("throws an unreachable error when the health check returns false", async () => {
    const adapter = makeFakeAdapter(() => Promise.resolve(false));
    await expect(
      preflightStorage(VALID_MINIO_ENV, {
        buildAdapter: () => Promise.resolve(adapter),
      })
    ).rejects.toThrow(/configured but not reachable/);
  });

  it("throws an unreachable error when the health check throws", async () => {
    const adapter = makeFakeAdapter(() =>
      Promise.reject(new Error("ECONNREFUSED"))
    );
    await expect(
      preflightStorage(VALID_MINIO_ENV, {
        buildAdapter: () => Promise.resolve(adapter),
      })
    ).rejects.toThrow(/configured but not reachable/);
  });

  it("returns the ready adapter when object storage is healthy", async () => {
    const adapter = makeFakeAdapter(() => Promise.resolve(true));
    await expect(
      preflightStorage(VALID_MINIO_ENV, {
        buildAdapter: () => Promise.resolve(adapter),
      })
    ).resolves.toBe(adapter);
  });
});
