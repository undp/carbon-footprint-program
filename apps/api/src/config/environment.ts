import { AUTH_PROVIDER_VALUES, type AuthProviderType } from "../auth/types.js";
import { storageConfigFromEnv, type StorageConfig } from "@repo/storage";

// Default value for development only - should never reach production
export const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

export const IS_PROD = process.env.NODE_ENV?.toLowerCase() === "production";

export const LOG_LEVEL = process.env.LOG_LEVEL ?? (IS_PROD ? "info" : "debug");

export const HOST = process.env.API_HOST ?? (IS_PROD ? "0.0.0.0" : "localhost");
export const PORT = parseInt(process.env.API_PORT ?? "8080", 10);

export const DATABASE_URL = process.env.DATABASE_URL;

// ============================================================================
// JWKS Configuration (generic OIDC)
// ============================================================================
// The API is a generic OIDC access-token validator: it reads these values
// straight from the environment. It does NOT derive them from any
// provider-specific settings. The per-provider format knowledge (e.g. how to
// build an Entra issuer / JWKS URL from a tenant id) lives in the env templates
// (.envrc.azure.example) and the Azure deploy (infra/modules/appService.bicep),
// not in the application code — so one generic build runs against any OIDC issuer.

/** JWKS endpoint the API fetches signing keys from (must be reachable from the API). */
export const JWKS_URI = process.env.JWKS_URI;

/** Expected token issuer (`iss`). When empty, issuer validation is disabled. */
export const JWKS_ISSUER = process.env.JWKS_ISSUER;

/** Expected token audience (`aud`). When empty, audience validation is disabled. */
export const JWKS_AUDIENCE = process.env.JWKS_AUDIENCE;

/**
 * Required scope enforced on access tokens (read from the `scp`/`scope` claim).
 * JWKS_SKIP_SCOPE_CHECK=true → no enforcement; otherwise the JWKS_REQUIRED_SCOPE
 * override, defaulting to "access_as_user". The JWKS_URI / JWKS_ISSUER /
 * JWKS_AUDIENCE values above are consumed as-is by jwksConfig.ts.
 */
const skipScopeCheck =
  process.env.JWKS_SKIP_SCOPE_CHECK?.toLowerCase() === "true";
export const JWKS_REQUIRED_SCOPE: string | undefined = skipScopeCheck
  ? undefined
  : (process.env.JWKS_REQUIRED_SCOPE ?? "access_as_user");

// ============================================================================
// Authentication Provider Configuration
// ============================================================================
// AUTH_PROVIDER: "jwks" | "forced-user" | "none"
// - jwks: Validate OIDC access tokens via JWKS (Entra, Keycloak, any OIDC issuer)
// - forced-user: Use a specific user (recommended for local dev)
// - none: No authentication (default when AUTH_PROVIDER is not set)

export const AUTH_PROVIDER: AuthProviderType = (() => {
  const rawAuthProvider = process.env.AUTH_PROVIDER;
  if (!rawAuthProvider) return "none";

  if (!AUTH_PROVIDER_VALUES.some((value) => value === rawAuthProvider)) {
    throw new Error(
      `Invalid AUTH_PROVIDER value: ${rawAuthProvider}. Allowed values are ${AUTH_PROVIDER_VALUES.join(", ")}.`
    );
  }
  return rawAuthProvider as AuthProviderType;
})();

export const FORCED_USER_EMAIL = process.env.FORCED_USER_EMAIL;

export const FORCED_USER_IDP_ID = process.env.FORCED_USER_IDP_ID;

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
 * Resolves the fully-typed object-storage configuration injected into
 * `createStorageAdapter`. Delegates to the shared `@repo/storage` parser so the
 * API and the seed scripts validate the same variables identically. Throws when
 * `STORAGE_PROVIDER` or a required provider-specific variable is missing.
 */
export function buildStorageConfig(): StorageConfig {
  return storageConfigFromEnv(process.env);
}
