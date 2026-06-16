import { vi, type Mock } from "vitest";
import { HttpUploadMethod } from "@repo/types";
import type {
  StorageAdapter,
  ObjectMetadata,
  ReadUrlSigner,
  SasUrlResult,
  WriteUrlResult,
} from "@repo/storage";

const FUTURE_EXPIRY = new Date("2099-12-31T23:59:59.000Z");
const MOCK_URL = "https://mock.storage.local/test/file?sig=mock";

/**
 * `StorageAdapter` with every method as a `vi.fn()`, so tests can assert calls
 * or override behaviour via `adapter.headObject.mockResolvedValueOnce(...)`.
 * Mirrors `StorageAdapter` automatically — no per-method boilerplate to keep in sync.
 */
export type MockStorageAdapter = {
  [K in keyof StorageAdapter]: Mock<StorageAdapter[K]>;
};

/**
 * Builds a fully-stubbed `StorageAdapter` for unit tests that don't need a
 * real backend. Returned methods carry canned defaults but are `vi.fn()`
 * instances, so tests can override individual methods via
 * `adapter.headObject.mockResolvedValueOnce(...)`.
 *
 * Use by overriding the storage adapter after `createTestApp`:
 *
 * ```ts
 * const mockStorage = createMockStorageAdapter();
 * app.storage = mockStorage;
 * ```
 */
export function createMockStorageAdapter(): MockStorageAdapter {
  const cannedReadResult: SasUrlResult = {
    url: MOCK_URL,
    expiresAt: FUTURE_EXPIRY,
  };
  const cannedWriteResult: WriteUrlResult = {
    url: MOCK_URL,
    method: HttpUploadMethod.PUT,
    headers: {},
    expiresAt: FUTURE_EXPIRY,
  };
  const cannedMetadata: ObjectMetadata = {
    sizeBytes: 0,
    mimeType: "application/octet-stream",
  };

  const generateReadUrl = vi.fn(() => Promise.resolve(cannedReadResult));
  const signer: ReadUrlSigner = () => Promise.resolve(cannedReadResult);

  return {
    generateReadUrl,
    createReadUrlSigner: vi.fn(() => Promise.resolve(signer)),
    generateWriteUrl: vi.fn(() => Promise.resolve(cannedWriteResult)),
    headObject: vi.fn(() => Promise.resolve(cannedMetadata)),
    streamObject: vi.fn(() =>
      Promise.reject(
        new Error(
          "createMockStorageAdapter: streamObject not stubbed by default — override per test"
        )
      )
    ),
    deleteObject: vi.fn(() => Promise.resolve()),
    putObject: vi.fn(() => Promise.resolve()),
    copyObject: vi.fn(() => Promise.resolve()),
    healthCheck: vi.fn(() => Promise.resolve(true)),
  };
}
