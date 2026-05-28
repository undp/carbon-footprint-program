import {
  ClientSecretCredential,
  DefaultAzureCredential,
  type TokenCredential,
} from "@azure/identity";

/**
 * Returns the Azure credential to use against Blob Storage.
 *
 * When the three `AZURE_STORAGE_*` env vars are set together, an explicit
 * `ClientSecretCredential` is built so the SP can live in a different tenant
 * than the one used for JWKS auth (`AZURE_TENANT_ID`). This is the local /
 * docker-compose path.
 *
 * Otherwise falls back to `DefaultAzureCredential`, which picks up Managed
 * Identity when running on Azure infrastructure — the production path.
 */
export function getStorageCredential(): TokenCredential {
  const tenantId = process.env.AZURE_STORAGE_TENANT_ID;
  const clientId = process.env.AZURE_STORAGE_CLIENT_ID;
  const clientSecret = process.env.AZURE_STORAGE_CLIENT_SECRET;

  if (tenantId && clientId && clientSecret) {
    return new ClientSecretCredential(tenantId, clientId, clientSecret);
  }

  return new DefaultAzureCredential();
}
