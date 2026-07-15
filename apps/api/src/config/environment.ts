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
// Load Shedding (@fastify/under-pressure)
// ============================================================================
// @fastify/under-pressure returns 503 when the process is overloaded. The two
// event-loop thresholds are env-configurable so an environment or CI runner
// under unusual load can tune them without a code change (surfaced during #276,
// where serialized test load tripped the defaults). The defaults preserve the
// platform's production behaviour; the heap/RSS limits stay hardcoded in
// plugins/external/under-pressure.ts.

/** Default event-loop delay ceiling (ms) before load shedding kicks in. */
const DEFAULT_MAX_EVENT_LOOP_DELAY_MS = 300;

/** Default event-loop utilization ceiling (0–1) before load shedding kicks in. */
const DEFAULT_MAX_EVENT_LOOP_UTILIZATION = 0.9;

/**
 * Parse a numeric env var, falling back to `fallback` when the value is unset,
 * empty/whitespace, or not a finite number. Guarding against NaN matters here:
 * a malformed override must never silently disable load shedding by producing
 * `NaN` thresholds.
 */
export const parseNumericEnv = (
  raw: string | undefined,
  fallback: number
): number => {
  if (raw === undefined) return fallback;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return fallback;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** Event-loop delay (ms) above which the API sheds load with a 503. */
export const MAX_EVENT_LOOP_DELAY_MS = parseNumericEnv(
  process.env.MAX_EVENT_LOOP_DELAY_MS,
  DEFAULT_MAX_EVENT_LOOP_DELAY_MS
);

/** Event-loop utilization (0–1) above which the API sheds load with a 503. */
export const MAX_EVENT_LOOP_UTILIZATION = parseNumericEnv(
  process.env.MAX_EVENT_LOOP_UTILIZATION,
  DEFAULT_MAX_EVENT_LOOP_UTILIZATION
);

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
// Chatbot Configuration
// ============================================================================

/**
 * Master switch for the optional AI chatbot feature. The chatbot depends on a
 * cloud LLM (Azure OpenAI), so per the DPG optionality principle it must be
 * fully disableable: a deployment can run the whole platform with no AI and no
 * cloud dependency. Default OFF (opt-in) — a do-nothing deployment ships
 * without AI and needs none of the LLM/Azure/cookie config below.
 *
 * When false: the chatbot routes are not registered (endpoints 404), the
 * frontend widget is hidden (VITE_CHATBOT_ENABLED), and the provider/Azure/
 * cookie boot guards below are skipped.
 */
export const CHATBOT_ENABLED: boolean =
  (process.env.CHATBOT_ENABLED ?? "false").toLowerCase() === "true";

// LLM_PROVIDER: "mock" | "azure-openai"
// - mock: Deterministic eco template provider for local dev and tests.
// - azure-openai: Production Azure OpenAI client (managed identity).
// `mock` is rejected at boot when the chatbot is enabled in production, to
// prevent the mock from leaking into user traffic.
export type LlmProviderType = "mock" | "azure-openai";

export const LLM_PROVIDER: LlmProviderType = (() => {
  const raw = process.env.LLM_PROVIDER ?? "mock";
  const valid: LlmProviderType[] = ["mock", "azure-openai"];
  if (!valid.includes(raw as LlmProviderType)) {
    throw new Error(
      `Invalid LLM_PROVIDER value: "${raw}". Allowed values are: ${valid.join(", ")}.`
    );
  }
  if (raw === "mock" && IS_PROD && CHATBOT_ENABLED) {
    throw new Error(
      'LLM_PROVIDER="mock" is not allowed when NODE_ENV=production and ' +
        'CHATBOT_ENABLED=true. Set LLM_PROVIDER="azure-openai" and provision ' +
        "the Azure OpenAI infra, or set CHATBOT_ENABLED=false to disable the " +
        "chatbot."
    );
  }
  return raw as LlmProviderType;
})();

/**
 * Trim env input and treat empty / whitespace-only strings as unset. Used by
 * the chatbot config block so a value like `"   "` cannot bypass the
 * required-field guards below.
 */
const trimEnv = (value: string | undefined): string | undefined => {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

/**
 * Secret used by @fastify/cookie to sign the `chatbot_session_id` cookie.
 * Required in production. Local fallback is a documented dev literal.
 */
export const COOKIE_SECRET: string = (() => {
  const raw = trimEnv(process.env.COOKIE_SECRET);
  if (raw) return raw;
  if (IS_PROD && CHATBOT_ENABLED) {
    throw new Error(
      "COOKIE_SECRET is required when NODE_ENV=production and " +
        "CHATBOT_ENABLED=true. Set it to a sufficiently long random string."
    );
  }
  return "dev-only-cookie-secret-change-me";
})();

/** Azure OpenAI endpoint URL — required when LLM_PROVIDER=azure-openai. */
export const AZURE_OPENAI_ENDPOINT = trimEnv(process.env.AZURE_OPENAI_ENDPOINT);

/** Azure OpenAI deployment name — required when LLM_PROVIDER=azure-openai. */
export const AZURE_OPENAI_DEPLOYMENT_NAME = trimEnv(
  process.env.AZURE_OPENAI_DEPLOYMENT_NAME
);

// Boot-time validation: if the operator selected the Azure provider, both
// endpoint and deployment name MUST be set. Failing fast at boot surfaces
// misconfiguration in CI / health checks instead of in user traffic.
(() => {
  if (!CHATBOT_ENABLED) return;
  if (LLM_PROVIDER !== "azure-openai") return;
  const missing: string[] = [];
  if (!AZURE_OPENAI_ENDPOINT) missing.push("AZURE_OPENAI_ENDPOINT");
  if (!AZURE_OPENAI_DEPLOYMENT_NAME)
    missing.push("AZURE_OPENAI_DEPLOYMENT_NAME");
  if (missing.length > 0) {
    throw new Error(
      `LLM_PROVIDER="azure-openai" requires: ${missing.join(", ")}. ` +
        "Set the missing variables or change LLM_PROVIDER."
    );
  }
})();

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
