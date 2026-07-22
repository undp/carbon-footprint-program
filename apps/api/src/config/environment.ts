import { AUTH_PROVIDER_VALUES, type AuthProviderType } from "../auth/types.js";
import {
  storageConfigFromEnv,
  StorageProvider,
  type StorageConfig,
} from "@repo/storage";

// ============================================================================
// Load Shedding (@fastify/under-pressure) — defaults
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
const parseNumericEnv = (raw: string | undefined, fallback: number): number => {
  if (raw === undefined) return fallback;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return fallback;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : fallback;
};

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

// LLM_PROVIDER: "mock" | "azure-openai"
// - mock: Deterministic eco template provider for local dev and tests.
// - azure-openai: Production Azure OpenAI client (managed identity).
export type LlmProviderType = "mock" | "azure-openai";

/**
 * Fully-resolved scalar configuration derived from an environment record. Every
 * module-level export below is one field of this object; keeping the parsing in
 * one pure function makes the defaults, coercions, and fail-closed guards
 * table-testable with synthetic env inputs, with no module-reset gymnastics.
 */
export interface ApiEnv {
  JWT_SECRET: string;
  IS_PROD: boolean;
  LOG_LEVEL: string;
  HOST: string;
  PORT: number;
  ALLOWED_ORIGIN: string | undefined;
  DATABASE_URL: string | undefined;
  MAX_EVENT_LOOP_DELAY_MS: number;
  MAX_EVENT_LOOP_UTILIZATION: number;
  JWKS_URI: string | undefined;
  JWKS_ISSUER: string | undefined;
  JWKS_AUDIENCE: string | undefined;
  JWKS_REQUIRED_SCOPE: string | undefined;
  AUTH_PROVIDER: AuthProviderType;
  FORCED_USER_EMAIL: string | undefined;
  FORCED_USER_IDP_ID: string | undefined;
  LOCAL_BYPASS_REQUIRED_FIELDS: boolean;
  APP_VERSION: string;
  CHATBOT_ENABLED: boolean;
  LLM_PROVIDER: LlmProviderType;
  COOKIE_SECRET: string;
  AZURE_OPENAI_ENDPOINT: string | undefined;
  AZURE_OPENAI_DEPLOYMENT_NAME: string | undefined;
}

/**
 * Parse and validate the API's scalar configuration from an env record. Pure:
 * it reads only `source`, never the global `process.env`, so the same logic
 * that runs at boot (via `parseEnv(process.env)` below) can be unit-tested
 * against synthetic environments. The fail-closed guards throw exactly as
 * before — they run here because this is called at module load — so import-time
 * boot behaviour is unchanged.
 *
 * Evaluation order is significant: when multiple guards would fire, the first
 * one thrown must match the pre-refactor behaviour, so the sequence below
 * mirrors the original top-to-bottom module.
 */
export function parseEnv(source: Record<string, string | undefined>): ApiEnv {
  // Default value for development only - should never reach production
  const JWT_SECRET = source.JWT_SECRET || "super-secret-key";

  const IS_PROD = source.NODE_ENV?.toLowerCase() === "production";

  const LOG_LEVEL = source.LOG_LEVEL ?? (IS_PROD ? "info" : "debug");

  const HOST = source.API_HOST ?? (IS_PROD ? "0.0.0.0" : "localhost");
  const PORT = parseInt(source.API_PORT ?? "8080", 10);

  const DATABASE_URL = source.DATABASE_URL;

  /** Event-loop delay (ms) above which the API sheds load with a 503. */
  const MAX_EVENT_LOOP_DELAY_MS = parseNumericEnv(
    source.MAX_EVENT_LOOP_DELAY_MS,
    DEFAULT_MAX_EVENT_LOOP_DELAY_MS
  );

  /** Event-loop utilization (0–1) above which the API sheds load with a 503. */
  const MAX_EVENT_LOOP_UTILIZATION = parseNumericEnv(
    source.MAX_EVENT_LOOP_UTILIZATION,
    DEFAULT_MAX_EVENT_LOOP_UTILIZATION
  );

  // ==========================================================================
  // JWKS Configuration (generic OIDC)
  // ==========================================================================
  // The API is a generic OIDC access-token validator: it reads these values
  // straight from the environment. The per-provider format knowledge (e.g. how
  // to build an Entra issuer / JWKS URL from a tenant id) lives in the env
  // templates and the Azure deploy, not here — so one generic build runs
  // against any OIDC issuer.

  /** JWKS endpoint the API fetches signing keys from. */
  const JWKS_URI = source.JWKS_URI;
  /** Expected token issuer (`iss`). When empty, issuer validation is disabled. */
  const JWKS_ISSUER = source.JWKS_ISSUER;
  /** Expected token audience (`aud`). When empty, audience validation is disabled. */
  const JWKS_AUDIENCE = source.JWKS_AUDIENCE;

  // Required scope enforced on access tokens (read from the `scp`/`scope`
  // claim). JWKS_SKIP_SCOPE_CHECK=true → no enforcement; otherwise the
  // JWKS_REQUIRED_SCOPE override, defaulting to "access_as_user".
  const skipScopeCheck = source.JWKS_SKIP_SCOPE_CHECK?.toLowerCase() === "true";
  const JWKS_REQUIRED_SCOPE: string | undefined = skipScopeCheck
    ? undefined
    : (source.JWKS_REQUIRED_SCOPE ?? "access_as_user");

  // ==========================================================================
  // Authentication Provider Configuration
  // ==========================================================================
  // AUTH_PROVIDER: "jwks" | "forced-user" | "none"
  const AUTH_PROVIDER: AuthProviderType = (() => {
    const rawAuthProvider = source.AUTH_PROVIDER;
    if (!rawAuthProvider) return "none";

    if (!AUTH_PROVIDER_VALUES.some((value) => value === rawAuthProvider)) {
      throw new Error(
        `Invalid AUTH_PROVIDER value: ${rawAuthProvider}. Allowed values are ${AUTH_PROVIDER_VALUES.join(", ")}.`
      );
    }
    return rawAuthProvider as AuthProviderType;
  })();

  // Fail closed: in production, AUTH_PROVIDER=jwks MUST have a JWKS endpoint.
  // Without JWKS_URI the @fastify/jwt config silently falls back to the static
  // HMAC JWT_SECRET — whose dev default is public — so forged tokens would pass
  // verification. Refuse to boot rather than serve auth open.
  if (IS_PROD && AUTH_PROVIDER === "jwks" && !JWKS_URI) {
    throw new Error(
      "AUTH_PROVIDER=jwks requires JWKS_URI in production. Refusing to start: " +
        "without it the API would fall back to the static HMAC JWT_SECRET and accept " +
        "forged tokens. Set JWKS_URI (and JWKS_ISSUER / JWKS_AUDIENCE)."
    );
  }

  // Fail closed on the claims that bind a token to THIS app. Without an
  // expected issuer/audience, jwksConfig.ts leaves allowedIss/allowedAud
  // undefined, so any token the JWKS can verify is accepted — including one
  // minted for a DIFFERENT app/tenant on the same IdP. Require both in prod.
  if (IS_PROD && AUTH_PROVIDER === "jwks" && (!JWKS_ISSUER || !JWKS_AUDIENCE)) {
    throw new Error(
      "AUTH_PROVIDER=jwks requires JWKS_ISSUER and JWKS_AUDIENCE in production. " +
        "Refusing to start: without them the API would accept any token the JWKS " +
        "can verify, regardless of which issuer or app it was minted for."
    );
  }

  const FORCED_USER_EMAIL = source.FORCED_USER_EMAIL;
  const FORCED_USER_IDP_ID = source.FORCED_USER_IDP_ID;

  const LOCAL_BYPASS_REQUIRED_FIELDS =
    source.LOCAL_BYPASS_REQUIRED_FIELDS === "true";

  const APP_VERSION = source.APP_VERSION || "unknown";

  // ==========================================================================
  // Chatbot Configuration
  // ==========================================================================
  // Master switch for the optional AI chatbot feature. Default OFF (opt-in) —
  // a deployment can run the whole platform with no AI and no cloud dependency.
  const CHATBOT_ENABLED: boolean =
    (source.CHATBOT_ENABLED ?? "false").toLowerCase() === "true";

  // `mock` is rejected at boot when the chatbot is enabled in production, to
  // prevent the mock from leaking into user traffic.
  const LLM_PROVIDER: LlmProviderType = (() => {
    const raw = source.LLM_PROVIDER ?? "mock";
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

  // Secret used by @fastify/cookie to sign the `chatbot_session_id` cookie.
  // Required in production. Local fallback is a documented dev literal.
  const COOKIE_SECRET: string = (() => {
    const raw = trimEnv(source.COOKIE_SECRET);
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
  const AZURE_OPENAI_ENDPOINT = trimEnv(source.AZURE_OPENAI_ENDPOINT);
  /** Azure OpenAI deployment name — required when LLM_PROVIDER=azure-openai. */
  const AZURE_OPENAI_DEPLOYMENT_NAME = trimEnv(
    source.AZURE_OPENAI_DEPLOYMENT_NAME
  );

  // Boot-time validation: if the operator selected the Azure provider, both
  // endpoint and deployment name MUST be set. Failing fast at boot surfaces
  // misconfiguration in CI / health checks instead of in user traffic.
  if (CHATBOT_ENABLED && LLM_PROVIDER === "azure-openai") {
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
  }

  // ==========================================================================
  // CORS origin (plugins/external/cors.ts)
  // ==========================================================================
  // Fail closed in production. Without an explicit ALLOWED_ORIGIN the CORS
  // fallback reflects ANY origin (`origin: true`) with credentials disabled —
  // a cross-origin fail-open that must never happen in a deployed environment.
  // Refuse to boot instead, so the misconfiguration surfaces at startup /
  // health check rather than as silently open CORS. trimEnv treats a
  // whitespace-only value as unset so it cannot bypass the guard. The
  // permissive fallback is kept ONLY for local dev and tests (IS_PROD === false).
  // Evaluated last to preserve the pre-refactor order — the guard previously
  // lived at cors.ts module scope, which ran after this module fully loaded.
  const ALLOWED_ORIGIN = trimEnv(source.ALLOWED_ORIGIN);
  if (IS_PROD && !ALLOWED_ORIGIN) {
    throw new Error(
      "ALLOWED_ORIGIN is required when NODE_ENV=production. Refusing to start: " +
        "without it CORS would reflect any origin (origin: true) and accept " +
        "cross-origin requests from anywhere. Set ALLOWED_ORIGIN to the web " +
        "app's exact browser origin (scheme + host + port, no trailing slash)."
    );
  }

  return {
    JWT_SECRET,
    IS_PROD,
    LOG_LEVEL,
    HOST,
    PORT,
    ALLOWED_ORIGIN,
    DATABASE_URL,
    MAX_EVENT_LOOP_DELAY_MS,
    MAX_EVENT_LOOP_UTILIZATION,
    JWKS_URI,
    JWKS_ISSUER,
    JWKS_AUDIENCE,
    JWKS_REQUIRED_SCOPE,
    AUTH_PROVIDER,
    FORCED_USER_EMAIL,
    FORCED_USER_IDP_ID,
    LOCAL_BYPASS_REQUIRED_FIELDS,
    APP_VERSION,
    CHATBOT_ENABLED,
    LLM_PROVIDER,
    COOKIE_SECRET,
    AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_DEPLOYMENT_NAME,
  };
}

// Resolve the configuration once at module load from the real environment. The
// fail-closed guards inside parseEnv therefore still throw at import time, so
// boot behaviour is unchanged; the named re-exports below preserve every
// existing import site verbatim.
const env = parseEnv(process.env);

export const JWT_SECRET = env.JWT_SECRET;
export const IS_PROD = env.IS_PROD;
export const LOG_LEVEL = env.LOG_LEVEL;
export const HOST = env.HOST;
export const PORT = env.PORT;
export const ALLOWED_ORIGIN = env.ALLOWED_ORIGIN;
export const DATABASE_URL = env.DATABASE_URL;
export const MAX_EVENT_LOOP_DELAY_MS = env.MAX_EVENT_LOOP_DELAY_MS;
export const MAX_EVENT_LOOP_UTILIZATION = env.MAX_EVENT_LOOP_UTILIZATION;
export const JWKS_URI = env.JWKS_URI;
export const JWKS_ISSUER = env.JWKS_ISSUER;
export const JWKS_AUDIENCE = env.JWKS_AUDIENCE;
export const JWKS_REQUIRED_SCOPE = env.JWKS_REQUIRED_SCOPE;
export const AUTH_PROVIDER = env.AUTH_PROVIDER;
export const FORCED_USER_EMAIL = env.FORCED_USER_EMAIL;
export const FORCED_USER_IDP_ID = env.FORCED_USER_IDP_ID;
export const LOCAL_BYPASS_REQUIRED_FIELDS = env.LOCAL_BYPASS_REQUIRED_FIELDS;
export const APP_VERSION = env.APP_VERSION;
export const CHATBOT_ENABLED = env.CHATBOT_ENABLED;
export const LLM_PROVIDER = env.LLM_PROVIDER;
export const COOKIE_SECRET = env.COOKIE_SECRET;
export const AZURE_OPENAI_ENDPOINT = env.AZURE_OPENAI_ENDPOINT;
export const AZURE_OPENAI_DEPLOYMENT_NAME = env.AZURE_OPENAI_DEPLOYMENT_NAME;

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
 * The env record defaults to `process.env` (unchanged for production callers)
 * but can be supplied explicitly so the relay branches are unit-testable.
 *
 * Throws at boot when `STORAGE_PROVIDER` or a required provider-specific
 * variable is missing, or when the relay is enabled on a non-MinIO provider or
 * without a valid `API_ORIGIN` — misconfiguration fails fast, never silently.
 */
export function buildStorageConfig(
  source: Record<string, string | undefined> = process.env
): StorageConfig {
  const config = storageConfigFromEnv(source);

  const relayActive = source.MINIO_RELAY_ENABLED?.toLowerCase() === "true";
  if (!relayActive) return config;

  if (config.provider !== StorageProvider.MINIO) {
    throw new Error(
      "MINIO_RELAY_ENABLED=true is only valid with STORAGE_PROVIDER=minio " +
        "(Azure serves SAS URLs directly over HTTPS — no relay)."
    );
  }
  const apiOrigin = source.API_ORIGIN?.replace(/\/+$/, "");
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
