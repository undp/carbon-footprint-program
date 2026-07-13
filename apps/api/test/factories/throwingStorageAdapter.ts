import type { StorageAdapter } from "@repo/storage";

const STORAGE_WITHOUT_DESCRIPTOR_MESSAGE = [
  "This test used `app.storage` but no `storageDescriptor` was provided to createTestApp.",
  "The default test app installs a throwing storage adapter so a storage-dependent",
  "test cannot silently pass against a fake backend. If this test needs real object",
  "storage, do BOTH:",
  '  1. pass `storageDescriptor: inject("storageDescriptor")` to createTestApp, and',
  "  2. add its path to STORAGE_TEST_MANIFEST in apps/api/test/setup/storageTestManifest.ts",
  "     (so the storage CI legs run it).",
  "If it does NOT need storage, remove the storage call.",
].join("\n");

/**
 * Every adapter method routes here. It takes no arguments, which is assignable
 * to each `StorageAdapter` method (fewer params is fine) and returns `never`
 * (assignable to every method's `Promise<…>` return), so no `any` is needed.
 */
function throwStorageDisabled(): never {
  throw new Error(STORAGE_WITHOUT_DESCRIPTOR_MESSAGE);
}

/**
 * A `StorageAdapter` whose every method throws. `createTestApp` installs it when
 * no `storageDescriptor` is provided, so storage-agnostic tests fail loudly (with
 * an actionable message) the moment they touch `app.storage`, instead of silently
 * exercising the boot adapter.
 */
export function createThrowingStorageAdapter(): StorageAdapter {
  return {
    generateReadUrl: throwStorageDisabled,
    createReadUrlSigner: throwStorageDisabled,
    generateWriteUrl: throwStorageDisabled,
    headObject: throwStorageDisabled,
    streamObject: throwStorageDisabled,
    putObject: throwStorageDisabled,
    deleteObject: throwStorageDisabled,
    copyObject: throwStorageDisabled,
    healthCheck: throwStorageDisabled,
  };
}
