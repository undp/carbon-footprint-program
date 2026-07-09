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
 * Returns the Azure credential to use against Blob Storage. Internal to the
 * package — only the Azure adapter consumes it; nothing outside `@repo/storage`
 * should construct Azure credentials directly.
 *
 * When `tenantId`, `clientId`, and `clientSecret` are all provided, an explicit
 * `ClientSecretCredential` is built so the storage Service Principal can live in
 * a different tenant than the one used for JWKS auth. This is the local /
 * docker-compose path.
 *
 * Otherwise falls back to `DefaultAzureCredential`, which picks up Managed
 * Identity when running on Azure infrastructure — the production path.
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
