import {
  createStorageAdapter,
  storageConfigFromEnv,
  type StorageAdapter,
  type StorageConfig,
} from "@repo/storage";

/**
 * Test seam for {@link preflightStorage}. Production callers omit it and get the
 * real `@repo/storage` factory; unit tests inject a fake adapter so the
 * preflight can be exercised without a live storage backend.
 */
export interface PreflightStorageDeps {
  buildAdapter?: (config: StorageConfig) => Promise<StorageAdapter>;
}

/**
 * Fail-fast object-storage preflight for the `base` seed. Object storage holds
 * the badge SVGs and the terms & conditions PDF, so a base seed cannot complete
 * without a reachable backend.
 *
 * Runs BEFORE any database write so a misconfiguration leaves the database
 * untouched: the `country`-count gate in `seed.ts` stays un-tripped, so once
 * storage is fixed a re-run seeds cleanly (rather than being a permanent no-op
 * on top of a half-seeded database).
 *
 * Returns a ready adapter to reuse for the badge + terms & conditions uploads.
 * Throws a loud, specific error when storage is missing or unreachable.
 */
export async function preflightStorage(
  env: Record<string, string | undefined>,
  deps: PreflightStorageDeps = {}
): Promise<StorageAdapter> {
  const buildAdapter = deps.buildAdapter ?? createStorageAdapter;

  let config: StorageConfig;
  try {
    config = storageConfigFromEnv(env);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Object storage is required for the base seed (badges + terms & conditions) ` +
        `but is not configured: ${reason} Set STORAGE_PROVIDER and its variables, then re-run.`
    );
  }

  const adapter = await buildAdapter(config);

  let reachable: boolean;
  try {
    reachable = await adapter.healthCheck();
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Object storage is configured but not reachable (provider=${config.provider}): ` +
        `the badge/terms & conditions uploads would fail. Verify connectivity/credentials, ` +
        `then re-run. (${reason})`
    );
  }

  if (!reachable) {
    throw new Error(
      `Object storage is configured but not reachable (provider=${config.provider}): ` +
        `the badge/terms & conditions uploads would fail. Verify connectivity/credentials, then re-run.`
    );
  }

  return adapter;
}
