import {
  ClientSecretCredential,
  DefaultAzureCredential,
  type TokenCredential,
} from "@azure/identity";

export interface StorageCredentialOptions {
  tenantId?: string | undefined;
  clientId?: string | undefined;
  clientSecret?: string | undefined;
}

/**
 * Returns the Azure credential to use against Blob Storage.
 *
 * When `tenantId`, `clientId`, and `clientSecret` are all provided, an explicit
 * `ClientSecretCredential` is built so the storage Service Principal can live in
 * a different tenant than the one used for JWKS auth (`AZURE_TENANT_ID`). This is
 * the local / docker-compose path.
 *
 * Otherwise falls back to `DefaultAzureCredential`, which picks up Managed
 * Identity when running on Azure infrastructure — the production path.
 *
 * The helper itself never reads `process.env`: callers source these values from
 * their own environment layer (the API validates them in `config/environment.ts`;
 * the seed scripts read `process.env` directly), which keeps this function pure
 * and unit-testable.
 */
export function getStorageCredential({
  tenantId,
  clientId,
  clientSecret,
}: StorageCredentialOptions = {}): TokenCredential {
  if (tenantId && clientId && clientSecret) {
    return new ClientSecretCredential(tenantId, clientId, clientSecret);
  }

  return new DefaultAzureCredential();
}
