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

// ============================================================================
// Proxy Trust (Fastify `trustProxy`)
// ============================================================================
// Whether the API trusts `X-Forwarded-For` / `X-Forwarded-Proto` to resolve
// `request.ip`. This has to be per-deployment because the correct answer is a
// property of the topology, not of the software: the API may sit directly on a
// socket, behind Azure App Service's front-end, behind Front Door, or behind an
// operator's own nginx (see docs/security/hardening.md, "Deployment topology").
//
// It matters because `request.ip` is the rate limiter's bucket key
// (plugins/external/rate-limit.ts). Left off behind a proxy, every caller
// resolves to the SAME proxy address and the 100 req/min limit becomes one
// shared bucket instead of a per-client one — so a single heavy caller can
// exhaust the budget for everyone. Turned on while the API is directly
// internet-facing, the opposite failure appears: a caller forges the header and
// mints itself a fresh bucket per request, evading the limit entirely.
//
// Effective default is `false`, preserving the previous hardcoded behaviour, so
// upgrading without setting the variable changes nothing.

/**
 * Upper bound on a hop count. Real proxy chains are one or two deep (App
 * Service alone; App Service behind Front Door), so ten is already generous.
 *
 * The bound exists because a hop count larger than the actual chain is not
 * merely wrong, it is `true` by another name: proxy-addr walks the whole
 * `X-Forwarded-For` chain and returns the leftmost entry, which is entirely
 * caller-controlled. Without a ceiling, `TRUST_PROXY=10000` — a plausible typo
 * for `TRUST_PROXY=1` — silently hands every caller the ability to choose its
 * own rate-limit key.
 */
const MAX_TRUST_PROXY_HOPS = 10;

/** proxy-addr's named ranges, accepted verbatim by Fastify's `trustProxy`. */
const TRUST_PROXY_NAMED_RANGES = ["loopback", "linklocal", "uniquelocal"];

/**
 * Shape-check one entry of an allowlist: an IP, a CIDR block, or a named range.
 *
 * This exists because the library's own failure is unhelpful and inconsistent.
 * Most malformed values throw from `proxyAddr.compile()` inside the `Fastify()`
 * constructor with a message that never mentions `TRUST_PROXY` — an operator
 * sees `invalid IP address: not-an-ip` and no pointer to the setting or the
 * docs. And the failure is not even uniform: `10.0.0/8` is accepted leniently
 * (as `10.0.0.0/8`), so the library cannot be relied on to catch a typo.
 *
 * Deliberately permissive about the address grammar and strict about ranges.
 * The lenient short forms proxy-addr accepts stay accepted — rejecting a value
 * that works today would break a running deployment for tidiness — while the
 * numeric bounds that are unambiguously wrong (`999.999.999.999`, a `/99` IPv4
 * prefix) are rejected here so they fail with a message that names the variable.
 * proxy-addr remains the final authority; this is a pre-flight, not a parser.
 */
const isValidTrustProxyEntry = (entry: string): boolean => {
  if (TRUST_PROXY_NAMED_RANGES.includes(entry.toLowerCase())) return true;

  const [address, prefix, ...extra] = entry.split("/");
  if (extra.length > 0) return false;
  if (prefix !== undefined && !/^\d{1,3}$/.test(prefix)) return false;

  // Any colon means IPv6 (including the IPv4-mapped `::ffff:1.2.3.4` form),
  // whose grammar is too varied to re-implement — check the character set and
  // the prefix bound, and leave exact validity to the library.
  if (address.includes(":")) {
    if (!/^[0-9a-fA-F.:]+$/.test(address)) return false;
    return prefix === undefined || Number(prefix) <= 128;
  }

  // IPv4. Fewer than four octets is proxy-addr's accepted short form.
  const octets = address.split(".");
  if (octets.length > 4) return false;
  if (!octets.every((o) => /^\d{1,3}$/.test(o) && Number(o) <= 255)) {
    return false;
  }
  return prefix === undefined || Number(prefix) <= 32;
};

/**
 * Parse `TRUST_PROXY` into the shape Fastify's `trustProxy` option accepts.
 *
 * - unset / empty → `undefined`, meaning **not configured**. The caller applies
 *   `false`; the distinction exists only so the boot warning can tell an
 *   operator who never considered this from one who decided against it.
 * - `"false"` → `false` (trust nothing) — a deliberate choice, not a default
 * - `"true"` → `true` (trust the whole `X-Forwarded-For` chain)
 * - a bare integer 0…{@link MAX_TRUST_PROXY_HOPS} → that many proxy hops
 * - anything else → a comma-separated IP/CIDR allowlist, or one of Fastify's
 *   named ranges (`loopback`, `linklocal`, `uniquelocal`), shape-checked per
 *   entry and then passed through verbatim (Fastify splits and trims it itself)
 *
 * Prefer an allowlist or a hop count over `true` in production: `true` trusts
 * whatever the caller put in the header when no proxy overwrote it.
 *
 * @throws if the value is not one of the shapes above. This fails the boot
 * rather than falling back, because every silent fallback here is a security
 * posture the operator did not choose: falling back to `false` would restore
 * the shared rate-limit bucket, and clamping a hop count to the maximum would
 * trust more hops than were asked for.
 */
const parseTrustProxy = (
  raw: string | undefined
): boolean | number | string | undefined => {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;

  const lowered = trimmed.toLowerCase();
  if (lowered === "true") return true;
  if (lowered === "false") return false;

  if (/^\d+$/.test(trimmed)) {
    const hops = Number(trimmed);
    // A long enough digit string overflows to Infinity, and anything past
    // Number.MAX_SAFE_INTEGER stops round-tripping — neither is a hop count.
    if (
      !Number.isSafeInteger(hops) ||
      hops < 0 ||
      hops > MAX_TRUST_PROXY_HOPS
    ) {
      throw new Error(
        `Invalid TRUST_PROXY hop count: "${trimmed}". Expected a whole number ` +
          `between 0 and ${MAX_TRUST_PROXY_HOPS}. Refusing to start: a hop ` +
          `count larger than the real proxy chain makes every X-Forwarded-For ` +
          `entry trusted, which lets a caller choose its own rate-limit key. ` +
          `Use 1 for Azure App Service, 2 behind Front Door, or an IP/CIDR ` +
          `allowlist.`
      );
    }
    return hops;
  }

  const entries = trimmed.split(",").map((entry) => entry.trim());
  if (entries.some((entry) => !isValidTrustProxyEntry(entry))) {
    throw new Error(
      `Invalid TRUST_PROXY value: "${trimmed}". Expected false, true, a hop ` +
        `count between 0 and ${MAX_TRUST_PROXY_HOPS}, a named range ` +
        `(${TRUST_PROXY_NAMED_RANGES.join(", ")}), or a comma-separated list ` +
        `of IP addresses / CIDR blocks such as "10.0.0.0/8,192.168.0.0/16". ` +
        `Refusing to start: proxy trust decides whose X-Forwarded-For may set ` +
        `request.ip, which is the rate limiter's bucket key. See ` +
        `docs/security/hardening.md, "Proxy Trust".`
    );
  }

  return trimmed;
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
  /**
   * Static HMAC secret for the non-JWKS `@fastify/jwt` branch. Undefined is
   * allowed: it is only security-relevant when AUTH_PROVIDER=jwks has no
   * JWKS_URI, which `parseEnv` rejects outright. Empty / whitespace-only input
   * is normalised to undefined, so "set but blank" is never a usable secret.
   */
  JWT_SECRET: string | undefined;
  IS_PROD: boolean;
  LOG_LEVEL: string;
  HOST: string;
  PORT: number;
  ALLOWED_ORIGIN: string | undefined;
  DATABASE_URL: string | undefined;
  /**
   * Fastify's `trustProxy`: which `X-Forwarded-*` senders may set `request.ip`.
   * The union Fastify accepts — `false` (trust nothing), `true` (trust the
   * chain), a hop count, or an IP/CIDR/named-range string.
   *
   * `undefined` means **not configured**, which is distinct from an explicit
   * `false` even though both end up trusting nothing. Only the unconfigured
   * case warns at boot: an operator who wrote `TRUST_PROXY=false` has already
   * made the decision the warning exists to prompt.
   */
  TRUST_PROXY: boolean | number | string | undefined;
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
  // There is deliberately NO hardcoded fallback. A checked-in default HMAC
  // secret is a published credential — anyone could mint tokens the
  // static-secret branch would accept — so the value must come from the
  // environment. `.envrc.template` and `.env.dockercompose.example` ship a
  // dummy so the documented setup path always sets one explicitly. When it is
  // absent AND it would actually guard authentication, the guard below refuses
  // to boot; see jwksConfig.buildJwtConfig for the non-authenticating case.
  //
  // trimEnv, not a raw read: "" and "   " must mean *unset* everywhere. Compose
  // injects an empty string for an absent variable (`JWT_SECRET=${JWT_SECRET}`
  // in docker-compose.yml), and an empty string that reads as "configured"
  // would (a) reach @fastify/jwt, whose `assert(options.secret)` kills boot
  // with an opaque "missing secret", and (b) slip past the guard below — while
  // `"   "` would slip past it and then be accepted as a real verification key.
  const JWT_SECRET = trimEnv(source.JWT_SECRET);

  const IS_PROD = source.NODE_ENV?.toLowerCase() === "production";

  const LOG_LEVEL = source.LOG_LEVEL ?? (IS_PROD ? "info" : "debug");

  const HOST = source.API_HOST ?? (IS_PROD ? "0.0.0.0" : "localhost");
  const PORT = parseInt(source.API_PORT ?? "8080", 10);

  const DATABASE_URL = source.DATABASE_URL;

  /** Which `X-Forwarded-*` senders may set `request.ip`. See parseTrustProxy. */
  const TRUST_PROXY = parseTrustProxy(source.TRUST_PROXY);

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
  // Without JWKS_URI the @fastify/jwt config falls back to the static HMAC
  // JWT_SECRET, which is a far weaker posture than provider-signed keys — a
  // single shared string instead of a rotating asymmetric key set. Refuse to
  // boot rather than serve auth open.
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

  // Fail closed on the one configuration where the static HMAC secret actually
  // authenticates callers: AUTH_PROVIDER=jwks with no JWKS_URI. There is no
  // built-in default any more, so an unset JWT_SECRET here would mean either a
  // crash deep in @fastify/jwt or — worse, if a default were ever reintroduced
  // — a publicly known verification key. Demand it explicitly instead. Thanks
  // to trimEnv above, a blank value counts as unset and trips this too, rather
  // than becoming a whitespace verification key. The non-jwks providers
  // (`none`, `forced-user`) never verify a token, so they do not need one;
  // buildJwtConfig substitutes a per-boot ephemeral value there.
  if (AUTH_PROVIDER === "jwks" && !JWKS_URI && !JWT_SECRET) {
    throw new Error(
      "AUTH_PROVIDER=jwks without JWKS_URI requires JWT_SECRET. Refusing to " +
        "start: token verification would fall back to a static HMAC secret that " +
        "is not configured. Set JWKS_URI to verify against the identity " +
        "provider (recommended), or set JWT_SECRET for local development — " +
        "`.envrc.template` ships a dummy value for exactly this case."
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
    TRUST_PROXY,
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
export const TRUST_PROXY = env.TRUST_PROXY;
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
