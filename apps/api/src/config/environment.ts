import { AUTH_PROVIDER_VALUES, type AuthProviderType } from "../auth/types.js";
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

// Fail closed: in production, AUTH_PROVIDER=jwks MUST have a JWKS endpoint.
// Without JWKS_URI the @fastify/jwt config (jwksConfig.ts) silently falls back to
// the static HMAC JWT_SECRET — whose dev default is public — so forged tokens
// would pass verification. Refuse to boot rather than serve auth open. (jwksConfig
// additionally warns when JWKS_URI is set but JWKS_ISSUER is not.)
if (IS_PROD && AUTH_PROVIDER === "jwks" && !JWKS_URI) {
  throw new Error(
    "AUTH_PROVIDER=jwks requires JWKS_URI in production. Refusing to start: " +
      "without it the API would fall back to the static HMAC JWT_SECRET and accept " +
      "forged tokens. Set JWKS_URI (and JWKS_ISSUER / JWKS_AUDIENCE)."
  );
}

// Fail closed on the claims that bind a token to THIS app. Without an expected
// issuer/audience, jwksConfig.ts leaves allowedIss/allowedAud undefined, so any
// token the JWKS can verify is accepted — including one minted for a DIFFERENT
// app/tenant on the same IdP infrastructure. Require both in production jwks.
if (IS_PROD && AUTH_PROVIDER === "jwks" && (!JWKS_ISSUER || !JWKS_AUDIENCE)) {
  throw new Error(
    "AUTH_PROVIDER=jwks requires JWKS_ISSUER and JWKS_AUDIENCE in production. " +
      "Refusing to start: without them the API would accept any token the JWKS " +
      "can verify, regardless of which issuer or app it was minted for."
  );
}

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
 * Public mount path of the storage relay (`storageRelayPlugin`). Shared between
 * the presigned-URL rewrite below and the relay route itself so the two can
 * never drift — change it here and both the rewrite target and the mount follow.
 */
export const STORAGE_RELAY_PREFIX = "/api/storage";

/**
 * Resolves the fully-typed object-storage configuration injected into
 * `createStorageAdapter`. Delegates to the shared `@repo/storage` parser for the
 * provider credentials, then — when the MinIO storage relay is enabled
 * (`MINIO_RELAY_ENABLED=true`) — composes the public relay base from
 * `API_ORIGIN` + `STORAGE_RELAY_PREFIX` and injects it, so presigned URLs are
 * rewritten to the API and MinIO stays internal.
 *
 * Throws at boot when `STORAGE_PROVIDER` or a required provider-specific
 * variable is missing, or when the relay is enabled on a non-MinIO provider or
 * without a valid `API_ORIGIN` — misconfiguration fails fast, never silently.
 */
export function buildStorageConfig(): StorageConfig {
  const config = storageConfigFromEnv(process.env);

  const relayActive = process.env.MINIO_RELAY_ENABLED?.toLowerCase() === "true";
  if (!relayActive) return config;

  if (config.provider !== StorageProvider.MINIO) {
    throw new Error(
      "MINIO_RELAY_ENABLED=true is only valid with STORAGE_PROVIDER=minio " +
        "(Azure serves SAS URLs directly over HTTPS — no relay)."
    );
  }
  const apiOrigin = process.env.API_ORIGIN?.replace(/\/+$/, "");
  if (!apiOrigin) {
    throw new Error(
      "MINIO_RELAY_ENABLED=true requires API_ORIGIN — the API's public " +
        "origin, e.g. https://api.example.cl."
    );
  }
  if (!URL.canParse(apiOrigin)) {
    throw new Error(`API_ORIGIN is not a valid URL: "${apiOrigin}".`);
  }
  config.minio.publicBaseUrl = `${apiOrigin}${STORAGE_RELAY_PREFIX}`;
  return config;
}
