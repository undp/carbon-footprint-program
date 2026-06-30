import { AuthProviderType } from "../auth/types.js";
import {
  storageConfigFromEnv,
  StorageProvider,
  type StorageConfig,
} from "@repo/storage";

// Default value for development only - should never reach production
export const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

export const IS_PROD = process.env.NODE_ENV?.toLowerCase() === "production";

export const LOG_LEVEL = process.env.LOG_LEVEL ?? (IS_PROD ? "info" : "debug");

export const HOST = process.env.API_HOST ?? (IS_PROD ? "0.0.0.0" : "localhost");
export const PORT = parseInt(process.env.API_PORT ?? "8080", 10);

export const DATABASE_URL = process.env.DATABASE_URL;

// ============================================================================
// JWKS Configuration (Generic)
// ============================================================================
// These are the generic JWKS settings used for token validation.
// They can be set directly via environment variables, or computed from
// provider-specific variables (e.g., Azure AD).

/**
 * JWKS URI for fetching public keys.
 * Can be set directly or computed from Azure tenant configuration.
 */
export const JWKS_URI = process.env.JWKS_URI;

/**
 * Expected token issuer (iss claim).
 * Can be set directly or computed from Azure tenant configuration.
 */
export const JWKS_ISSUER = process.env.JWKS_ISSUER;

/**
 * Expected token audience (aud claim).
 * Usually your application's client ID.
 */
export const JWKS_AUDIENCE = process.env.JWKS_AUDIENCE;

/**
 * Override for the required scope claim (scp) in the token.
 * Defaults to "access_as_user" when not set.
 */
export const JWKS_REQUIRED_SCOPE = process.env.JWKS_REQUIRED_SCOPE;

/**
 * When set to "true", disables the scope (scp) check entirely.
 * Use this only when your IdP does not emit scp claims.
 */
export const JWKS_SKIP_SCOPE_CHECK =
  process.env.JWKS_SKIP_SCOPE_CHECK?.toLowerCase() === "true";

// ============================================================================
// Azure Entra ID Configuration
// ============================================================================
// Azure-specific configuration that computes JWKS values.
// If JWKS_* variables are not set, these will be used as defaults.
//
// Supports two tenant types via AZURE_TENANT_TYPE:
// - "external" (default): Azure Entra External ID (CIAM) — uses ciamlogin.com
// - "organizational": Regular Azure Entra ID (Azure AD) — uses login.microsoftonline.com

/**
 * Azure tenant type.
 *
 * - "external": Azure Entra External ID (CIAM) for B2C scenarios.
 *   Uses ciamlogin.com authority and JWKS endpoints.
 * - "organizational": Regular Azure Entra ID (Azure AD) for B2B/enterprise.
 *   Uses login.microsoftonline.com authority and JWKS endpoints.
 *
 * Defaults to "external" for backward compatibility.
 */
export type AzureTenantType = "external" | "organizational";
export const AZURE_TENANT_TYPE: AzureTenantType = (() => {
  const raw = process.env.AZURE_TENANT_TYPE;
  if (!raw) return "external";
  const valid: AzureTenantType[] = ["external", "organizational"];
  if (!valid.includes(raw as AzureTenantType)) {
    throw new Error(
      `Invalid AZURE_TENANT_TYPE value: "${raw}". Allowed values are: ${valid.join(", ")}.`
    );
  }
  return raw as AzureTenantType;
})();

/**
 * Azure Tenant ID (Directory ID).
 *
 * For Azure Entra External ID (CIAM) — AZURE_TENANT_TYPE="external":
 * - This is your tenant ID GUID
 * - Found in Azure Portal > Microsoft Entra External ID > Overview > "Tenant ID"
 * - Format: UUID (e.g., "929aea96-b57c-43ad-8ee3-ee272a160970")
 *
 * For Azure Entra ID (organizational) — AZURE_TENANT_TYPE="organizational":
 * - This is your Directory (tenant) ID GUID
 * - Found in Azure Portal > Microsoft Entra ID > Overview > "Tenant ID"
 * - Format: UUID (e.g., "12345678-1234-1234-1234-123456789abc")
 */
export const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;

/**
 * Azure tenant subdomain.
 *
 * Only required for AZURE_TENANT_TYPE="external" (CIAM).
 * - Found in Azure Portal > Microsoft Entra External ID > Overview > "Tenant subdomain"
 * - Format: lowercase alphanumeric string (e.g., "mycompany" from mycompany.ciamlogin.com)
 *
 * Not used for AZURE_TENANT_TYPE="organizational".
 */
export const AZURE_TENANT_SUBDOMAIN = process.env.AZURE_TENANT_SUBDOMAIN;

/**
 * Azure AD Application (Client) ID.
 *
 * This is your registered application's unique identifier:
 * - Found in Azure Portal > Microsoft Entra ID > App registrations > [Your App] > Overview > "Application (client) ID"
 * - Format: UUID (e.g., "87654321-4321-4321-4321-abcdef123456")
 * - This value is used as the expected audience (aud) claim in JWT tokens
 * - Required for token validation to ensure tokens are issued for your application
 *
 * Note: This is the same for both external and organizational tenant types.
 */
export const AZURE_API_CLIENT_ID = process.env.AZURE_API_CLIENT_ID;

// Computed Azure Entra values based on tenant type
// Only v2.0 tokens are accepted. For organizational tenants, the app registration
// manifest must have accessTokenAcceptedVersion set to 2.
const AZURE_AD_ISSUERS: string[] = (() => {
  if (AZURE_TENANT_TYPE === "external" && AZURE_TENANT_ID) {
    return [`https://${AZURE_TENANT_ID}.ciamlogin.com/${AZURE_TENANT_ID}/v2.0`];
  }
  if (AZURE_TENANT_TYPE === "organizational" && AZURE_TENANT_ID) {
    return [`https://login.microsoftonline.com/${AZURE_TENANT_ID}/v2.0`];
  }
  return [];
})();

const AZURE_AD_JWKS_URI = (() => {
  if (AZURE_TENANT_TYPE === "external" && AZURE_TENANT_ID) {
    if (!AZURE_TENANT_SUBDOMAIN && !JWKS_URI) {
      throw new Error(
        "AZURE_TENANT_TYPE is 'external' and AZURE_TENANT_ID is set, but AZURE_TENANT_SUBDOMAIN is missing. " +
          "Either set AZURE_TENANT_SUBDOMAIN (required to compute the CIAM JWKS endpoint) or set JWKS_URI explicitly."
      );
    }
    if (AZURE_TENANT_SUBDOMAIN) {
      // CIAM uses subdomain.ciamlogin.com for JWKS endpoint
      return `https://${AZURE_TENANT_SUBDOMAIN}.ciamlogin.com/${AZURE_TENANT_ID}/discovery/v2.0/keys`;
    }
    return undefined;
  }
  if (AZURE_TENANT_TYPE === "organizational" && AZURE_TENANT_ID) {
    return `https://login.microsoftonline.com/${AZURE_TENANT_ID}/discovery/v2.0/keys`;
  }
  return undefined;
})();

// ============================================================================
// Resolved JWKS Configuration
// ============================================================================
// Final values used by the auth system. Prefers explicit JWKS_* variables,
// falls back to Azure AD computed values.

/**
 * Resolved JWKS URI - used by auth providers.
 * Priority: JWKS_URI > Azure AD computed value
 */
export const RESOLVED_JWKS_URI = JWKS_URI || AZURE_AD_JWKS_URI;

/**
 * Resolved allowed issuers - used for token validation.
 * Priority: JWKS_ISSUER (single value) > Azure AD computed values
 */
export const RESOLVED_JWKS_ISSUERS: string[] = JWKS_ISSUER
  ? [JWKS_ISSUER]
  : AZURE_AD_ISSUERS;

/**
 * Resolved audience - used for token validation.
 * Priority: JWKS_AUDIENCE > computed from AZURE_API_CLIENT_ID
 *
 * With v2.0 tokens enforced, the aud claim is the bare client ID GUID
 * for both organizational and external (CIAM) tenants.
 */
export const RESOLVED_JWKS_AUDIENCE = JWKS_AUDIENCE || AZURE_API_CLIENT_ID;

/**
 * Resolved required scope - used for token validation.
 * Priority:
 *  1. JWKS_SKIP_SCOPE_CHECK=true → undefined (no scope enforcement)
 *  2. JWKS_REQUIRED_SCOPE → use the explicit override value
 *  3. Default → "access_as_user"
 */
export const RESOLVED_JWKS_REQUIRED_SCOPE: string | undefined =
  JWKS_SKIP_SCOPE_CHECK ? undefined : (JWKS_REQUIRED_SCOPE ?? "access_as_user");

// ============================================================================
// Authentication Provider Configuration
// ============================================================================
// AUTH_PROVIDER: "jwks" | "easy-auth" | "forced-user" | "none"
// - jwks: Use MSAL tokens with JWKS validation
// - easy-auth: Use Azure App Service Easy Auth headers
// - forced-user: Use a specific user (recommended for local dev)
// - none: No authentication (default when AUTH_PROVIDER is not set)

export const AUTH_PROVIDER: AuthProviderType = (() => {
  const rawAuthProvider = process.env.AUTH_PROVIDER;
  if (!rawAuthProvider) return "none";

  const validValues = ["jwks", "easy-auth", "forced-user", "none"];
  if (!validValues.includes(rawAuthProvider)) {
    throw new Error(
      `Invalid AUTH_PROVIDER value: ${rawAuthProvider}. Allowed values are ${validValues.join(", ")}.`
    );
  }
  return rawAuthProvider as AuthProviderType;
})();

export const FORCED_USER_EMAIL_WHEN_NO_PROVIDER =
  process.env.FORCED_USER_EMAIL_WHEN_NO_PROVIDER;

export const FORCED_USER_IDP_ID_WHEN_NO_PROVIDER =
  process.env.FORCED_USER_IDP_ID_WHEN_NO_PROVIDER;

export const LOCAL_BYPASS_REQUIRED_FIELDS =
  process.env.LOCAL_BYPASS_REQUIRED_FIELDS === "true";

export const APP_VERSION = process.env.APP_VERSION || "unknown";

// ============================================================================
// Object Storage Configuration
// ============================================================================
// STORAGE_PROVIDER selects which object storage backend the API uses, and the
// provider-specific variables (AZURE_STORAGE_* / MINIO_*) are read and validated
// by the shared `@repo/storage` parser below — there is no per-variable const
// here, so the package stays the single source of truth for parsing and defaults.

/**
 * Public mount path of the storage relay (`storageRelayPlugin`). Shared between
 * the presigned-URL rewrite below and the relay route itself so the two can
 * never drift — change it here and both the rewrite target and the mount follow.
 */
export const STORAGE_RELAY_PREFIX = "/api/storage";

/**
 * Resolves the fully-typed object-storage configuration injected into
 * `createStorageAdapter`. Delegates to the shared `@repo/storage` parser for the
 * provider credentials, then — when the MinIO storage relay is enabled
 * (`MINIO_REVERSE_PROXY_ACTIVE=true`) — composes the public relay base from
 * `API_BASE_URL` + `STORAGE_RELAY_PREFIX` and injects it, so presigned URLs are
 * rewritten to the API and MinIO stays internal.
 *
 * Throws at boot when `STORAGE_PROVIDER` or a required provider-specific
 * variable is missing, or when the relay is enabled on a non-MinIO provider or
 * without a valid `API_BASE_URL` — misconfiguration fails fast, never silently.
 */
export function buildStorageConfig(): StorageConfig {
  const config = storageConfigFromEnv(process.env);

  const relayActive =
    process.env.MINIO_REVERSE_PROXY_ACTIVE?.toLowerCase() === "true";
  if (!relayActive) return config;

  if (config.provider !== StorageProvider.MINIO) {
    throw new Error(
      "MINIO_REVERSE_PROXY_ACTIVE=true is only valid with STORAGE_PROVIDER=minio " +
        "(Azure serves SAS URLs directly over HTTPS — no relay)."
    );
  }
  const apiBaseUrl = process.env.API_BASE_URL?.replace(/\/+$/, "");
  if (!apiBaseUrl) {
    throw new Error(
      "MINIO_REVERSE_PROXY_ACTIVE=true requires API_BASE_URL — the API's public " +
        "origin, e.g. https://api.example.cl."
    );
  }
  if (!URL.canParse(apiBaseUrl)) {
    throw new Error(`API_BASE_URL is not a valid URL: "${apiBaseUrl}".`);
  }
  config.minio.publicBaseUrl = `${apiBaseUrl}${STORAGE_RELAY_PREFIX}`;
  return config;
}
