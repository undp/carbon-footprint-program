import { afterEach, describe, expect, it, vi } from "vitest";
import { StorageProvider } from "@repo/storage";
import {
  MAX_EVENT_LOOP_DELAY_MS,
  MAX_EVENT_LOOP_UTILIZATION,
  buildStorageConfig,
  parseEnv,
} from "@/config/environment.js";

// `parseEnv(source)` is the pure config parser the module derives every exported
// constant from. Testing it directly with synthetic env records lets us hit
// every default, coercion, enum check, and fail-closed cross-field guard —
// including the production-only ones that can never run in the test process —
// without re-importing the module per case. The existing under-pressure tests
// below still exercise the module-level derivation end to end.

/** Merge overrides onto an empty (all-defaults, non-throwing) source. */
const parse = (overrides: Record<string, string | undefined> = {}) =>
  parseEnv({ ...overrides });

// A syntactically valid browser origin used to satisfy the production-only
// ALLOWED_ORIGIN CORS guard in tests whose focus is some OTHER prod behaviour.
const PROD_ORIGIN = "https://app.example.cl";

describe("parseEnv — defaults (empty environment)", () => {
  const env = parse();

  it("applies the development defaults for every field", () => {
    expect(env).toEqual({
      JWT_SECRET: "super-secret-key",
      IS_PROD: false,
      LOG_LEVEL: "debug",
      HOST: "localhost",
      PORT: 8080,
      ALLOWED_ORIGIN: undefined,
      DATABASE_URL: undefined,
      MAX_EVENT_LOOP_DELAY_MS: 300,
      MAX_EVENT_LOOP_UTILIZATION: 0.9,
      JWKS_URI: undefined,
      JWKS_ISSUER: undefined,
      JWKS_AUDIENCE: undefined,
      JWKS_REQUIRED_SCOPE: "access_as_user",
      AUTH_PROVIDER: "none",
      FORCED_USER_EMAIL: undefined,
      FORCED_USER_IDP_ID: undefined,
      LOCAL_BYPASS_REQUIRED_FIELDS: false,
      APP_VERSION: "unknown",
      CHATBOT_ENABLED: false,
      LLM_PROVIDER: "mock",
      COOKIE_SECRET: "dev-only-cookie-secret-change-me",
      AZURE_OPENAI_ENDPOINT: undefined,
      AZURE_OPENAI_DEPLOYMENT_NAME: undefined,
    });
  });
});

describe("parseEnv — production defaults", () => {
  it("shifts LOG_LEVEL and HOST defaults when NODE_ENV=production", () => {
    const env = parse({ NODE_ENV: "production", ALLOWED_ORIGIN: PROD_ORIGIN });
    expect(env.IS_PROD).toBe(true);
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.HOST).toBe("0.0.0.0");
  });

  it("detects production case-insensitively", () => {
    expect(
      parse({ NODE_ENV: "Production", ALLOWED_ORIGIN: PROD_ORIGIN }).IS_PROD
    ).toBe(true);
    expect(
      parse({ NODE_ENV: "PRODUCTION", ALLOWED_ORIGIN: PROD_ORIGIN }).IS_PROD
    ).toBe(true);
    expect(parse({ NODE_ENV: "prod" }).IS_PROD).toBe(false);
  });
});

describe("parseEnv — scalar coercion and overrides", () => {
  it("uses explicit overrides over defaults", () => {
    const env = parse({
      JWT_SECRET: "real-secret",
      LOG_LEVEL: "warn",
      API_HOST: "127.0.0.1",
      API_PORT: "3000",
      DATABASE_URL: "postgres://db",
      APP_VERSION: "1.4.2",
    });
    expect(env.JWT_SECRET).toBe("real-secret");
    expect(env.LOG_LEVEL).toBe("warn");
    expect(env.HOST).toBe("127.0.0.1");
    expect(env.PORT).toBe(3000);
    expect(env.DATABASE_URL).toBe("postgres://db");
    expect(env.APP_VERSION).toBe("1.4.2");
  });

  it("parses the load-shedding thresholds and falls back on malformed values", () => {
    expect(
      parse({ MAX_EVENT_LOOP_DELAY_MS: "500" }).MAX_EVENT_LOOP_DELAY_MS
    ).toBe(500);
    expect(
      parse({ MAX_EVENT_LOOP_UTILIZATION: "0.75" }).MAX_EVENT_LOOP_UTILIZATION
    ).toBe(0.75);
    // Non-numeric, whitespace, and non-finite all fall back to the default.
    expect(
      parse({ MAX_EVENT_LOOP_DELAY_MS: "fast" }).MAX_EVENT_LOOP_DELAY_MS
    ).toBe(300);
    expect(
      parse({ MAX_EVENT_LOOP_DELAY_MS: "   " }).MAX_EVENT_LOOP_DELAY_MS
    ).toBe(300);
    expect(
      parse({ MAX_EVENT_LOOP_UTILIZATION: "Infinity" })
        .MAX_EVENT_LOOP_UTILIZATION
    ).toBe(0.9);
  });

  it("treats boolean flags with a strict/loose contract as documented", () => {
    // LOCAL_BYPASS_REQUIRED_FIELDS is strict: only the exact string "true".
    expect(
      parse({ LOCAL_BYPASS_REQUIRED_FIELDS: "true" })
        .LOCAL_BYPASS_REQUIRED_FIELDS
    ).toBe(true);
    expect(
      parse({ LOCAL_BYPASS_REQUIRED_FIELDS: "TRUE" })
        .LOCAL_BYPASS_REQUIRED_FIELDS
    ).toBe(false);
    // CHATBOT_ENABLED is case-insensitive.
    expect(parse({ CHATBOT_ENABLED: "TRUE" }).CHATBOT_ENABLED).toBe(true);
    expect(parse({ CHATBOT_ENABLED: "false" }).CHATBOT_ENABLED).toBe(false);
  });

  it("honours the JWKS scope override and skip flag", () => {
    expect(parse({ JWKS_REQUIRED_SCOPE: "api.read" }).JWKS_REQUIRED_SCOPE).toBe(
      "api.read"
    );
    expect(
      parse({ JWKS_SKIP_SCOPE_CHECK: "true" }).JWKS_REQUIRED_SCOPE
    ).toBeUndefined();
    // Skip flag wins over an explicit scope override.
    expect(
      parse({ JWKS_SKIP_SCOPE_CHECK: "TRUE", JWKS_REQUIRED_SCOPE: "api.read" })
        .JWKS_REQUIRED_SCOPE
    ).toBeUndefined();
  });
});

describe("parseEnv — enum validation", () => {
  it.each(["jwks", "forced-user", "none"])(
    "accepts the valid AUTH_PROVIDER %s",
    (value) => {
      expect(parse({ AUTH_PROVIDER: value }).AUTH_PROVIDER).toBe(value);
    }
  );

  it("rejects an unknown AUTH_PROVIDER", () => {
    expect(() => parse({ AUTH_PROVIDER: "bogus" })).toThrow(
      /Invalid AUTH_PROVIDER value: bogus/
    );
  });

  it("rejects an unknown LLM_PROVIDER", () => {
    expect(() => parse({ LLM_PROVIDER: "gpt-5" })).toThrow(
      /Invalid LLM_PROVIDER value: "gpt-5"/
    );
  });
});

describe("parseEnv — fail-closed production guards for AUTH_PROVIDER=jwks", () => {
  it("does NOT enforce the JWKS guards outside production", () => {
    // Dev with jwks and nothing else set must parse cleanly.
    const env = parse({ AUTH_PROVIDER: "jwks" });
    expect(env.AUTH_PROVIDER).toBe("jwks");
    expect(env.JWKS_URI).toBeUndefined();
  });

  it("refuses to boot in prod when JWKS_URI is missing", () => {
    expect(() =>
      parse({ NODE_ENV: "production", AUTH_PROVIDER: "jwks" })
    ).toThrow(/requires JWKS_URI in production/);
  });

  it("refuses to boot in prod when issuer or audience is missing", () => {
    expect(() =>
      parse({
        NODE_ENV: "production",
        AUTH_PROVIDER: "jwks",
        JWKS_URI: "https://issuer/jwks",
      })
    ).toThrow(/requires JWKS_ISSUER and JWKS_AUDIENCE in production/);

    expect(() =>
      parse({
        NODE_ENV: "production",
        AUTH_PROVIDER: "jwks",
        JWKS_URI: "https://issuer/jwks",
        JWKS_ISSUER: "https://issuer/",
      })
    ).toThrow(/requires JWKS_ISSUER and JWKS_AUDIENCE in production/);
  });

  it("boots in prod when the full jwks binding is provided", () => {
    const env = parse({
      NODE_ENV: "production",
      ALLOWED_ORIGIN: PROD_ORIGIN,
      AUTH_PROVIDER: "jwks",
      JWKS_URI: "https://issuer/jwks",
      JWKS_ISSUER: "https://issuer/",
      JWKS_AUDIENCE: "api://app",
    });
    expect(env.AUTH_PROVIDER).toBe("jwks");
    expect(env.JWKS_ISSUER).toBe("https://issuer/");
    expect(env.JWKS_AUDIENCE).toBe("api://app");
  });
});

describe("parseEnv — fail-closed production CORS guard (ALLOWED_ORIGIN)", () => {
  it("does NOT enforce the guard outside production", () => {
    // Dev without ALLOWED_ORIGIN must parse cleanly, leaving the field unset.
    const env = parse();
    expect(env.ALLOWED_ORIGIN).toBeUndefined();
  });

  it("refuses to boot in prod when ALLOWED_ORIGIN is missing", () => {
    expect(() => parse({ NODE_ENV: "production" })).toThrow(
      /ALLOWED_ORIGIN is required when NODE_ENV=production/
    );
  });

  it("treats a whitespace-only ALLOWED_ORIGIN as unset in prod", () => {
    expect(() =>
      parse({ NODE_ENV: "production", ALLOWED_ORIGIN: "   " })
    ).toThrow(/ALLOWED_ORIGIN is required when NODE_ENV=production/);
  });

  it("boots in prod when a valid ALLOWED_ORIGIN is provided", () => {
    const env = parse({
      NODE_ENV: "production",
      ALLOWED_ORIGIN: "https://app.example.cl",
    });
    expect(env.ALLOWED_ORIGIN).toBe("https://app.example.cl");
  });
});

describe("parseEnv — chatbot cross-field guards", () => {
  it("rejects the mock LLM provider in production when the chatbot is enabled", () => {
    expect(() =>
      parse({
        NODE_ENV: "production",
        CHATBOT_ENABLED: "true",
        LLM_PROVIDER: "mock",
      })
    ).toThrow(/"mock" is not allowed when NODE_ENV=production/);
  });

  it("allows the mock provider in production when the chatbot is disabled", () => {
    const env = parse({
      NODE_ENV: "production",
      ALLOWED_ORIGIN: PROD_ORIGIN,
      LLM_PROVIDER: "mock",
    });
    expect(env.LLM_PROVIDER).toBe("mock");
    expect(env.CHATBOT_ENABLED).toBe(false);
  });

  it("requires COOKIE_SECRET in production when the chatbot is enabled", () => {
    expect(() =>
      parse({
        NODE_ENV: "production",
        CHATBOT_ENABLED: "true",
        LLM_PROVIDER: "azure-openai",
      })
    ).toThrow(/COOKIE_SECRET is required/);

    // Whitespace-only is treated as unset.
    expect(() =>
      parse({
        NODE_ENV: "production",
        CHATBOT_ENABLED: "true",
        LLM_PROVIDER: "azure-openai",
        COOKIE_SECRET: "   ",
      })
    ).toThrow(/COOKIE_SECRET is required/);
  });

  it.each([
    [
      "both missing",
      {},
      /requires: AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT_NAME/,
    ],
    [
      "deployment missing",
      { AZURE_OPENAI_ENDPOINT: "https://oai.example.com" },
      /requires: AZURE_OPENAI_DEPLOYMENT_NAME/,
    ],
    [
      "endpoint missing",
      { AZURE_OPENAI_DEPLOYMENT_NAME: "gpt4o" },
      /requires: AZURE_OPENAI_ENDPOINT/,
    ],
    [
      "endpoint whitespace-only",
      {
        AZURE_OPENAI_ENDPOINT: "   ",
        AZURE_OPENAI_DEPLOYMENT_NAME: "gpt4o",
      },
      /requires: AZURE_OPENAI_ENDPOINT/,
    ],
  ])(
    "requires Azure endpoint + deployment when azure-openai is selected (%s)",
    (_name, azureVars, pattern) => {
      expect(() =>
        parse({
          CHATBOT_ENABLED: "true",
          LLM_PROVIDER: "azure-openai",
          ...azureVars,
        })
      ).toThrow(pattern);
    }
  );

  it("skips the Azure guard when the chatbot is disabled", () => {
    // azure-openai selected but chatbot off → no required-field enforcement.
    const env = parse({ LLM_PROVIDER: "azure-openai" });
    expect(env.LLM_PROVIDER).toBe("azure-openai");
    expect(env.AZURE_OPENAI_ENDPOINT).toBeUndefined();
  });

  it("accepts a fully-valid production chatbot configuration", () => {
    const env = parse({
      NODE_ENV: "production",
      ALLOWED_ORIGIN: PROD_ORIGIN,
      CHATBOT_ENABLED: "true",
      LLM_PROVIDER: "azure-openai",
      COOKIE_SECRET: "a-sufficiently-long-random-secret",
      AZURE_OPENAI_ENDPOINT: "https://oai.example.com",
      AZURE_OPENAI_DEPLOYMENT_NAME: "gpt4o",
    });
    expect(env.CHATBOT_ENABLED).toBe(true);
    expect(env.LLM_PROVIDER).toBe("azure-openai");
    expect(env.COOKIE_SECRET).toBe("a-sufficiently-long-random-secret");
    expect(env.AZURE_OPENAI_ENDPOINT).toBe("https://oai.example.com");
    expect(env.AZURE_OPENAI_DEPLOYMENT_NAME).toBe("gpt4o");
  });
});

describe("buildStorageConfig", () => {
  const minioBase = {
    STORAGE_PROVIDER: "minio",
    MINIO_ENDPOINT: "http://minio:9000",
    MINIO_ACCESS_KEY: "ak",
    MINIO_SECRET_KEY: "sk",
  };

  it("propagates the provider parser's error when STORAGE_PROVIDER is missing", () => {
    expect(() => buildStorageConfig({})).toThrow(
      /STORAGE_PROVIDER is required/
    );
  });

  it("returns the base config unchanged when the relay is disabled", () => {
    const config = buildStorageConfig(minioBase);
    expect(config.provider).toBe(StorageProvider.MINIO);
    if (config.provider === StorageProvider.MINIO) {
      expect(config.minio.publicBaseUrl).toBeUndefined();
    }
  });

  it("rejects enabling the relay on a non-MinIO provider", () => {
    expect(() =>
      buildStorageConfig({
        STORAGE_PROVIDER: "azure_blob_storage",
        AZURE_STORAGE_ACCOUNT_NAME: "acct",
        MINIO_RELAY_ENABLED: "true",
      })
    ).toThrow(/only valid with STORAGE_PROVIDER=minio/);
  });

  it("requires API_ORIGIN when the MinIO relay is enabled", () => {
    expect(() =>
      buildStorageConfig({ ...minioBase, MINIO_RELAY_ENABLED: "true" })
    ).toThrow(/requires API_ORIGIN/);
  });

  it("rejects an API_ORIGIN that is not a valid URL", () => {
    expect(() =>
      buildStorageConfig({
        ...minioBase,
        MINIO_RELAY_ENABLED: "true",
        API_ORIGIN: "not a url",
      })
    ).toThrow(/is not a valid URL/);
  });

  it("injects the relay base (trailing slash stripped) when the relay is valid", () => {
    const config = buildStorageConfig({
      ...minioBase,
      MINIO_RELAY_ENABLED: "true",
      API_ORIGIN: "https://api.example.cl/",
    });
    expect(config.provider).toBe(StorageProvider.MINIO);
    if (config.provider === StorageProvider.MINIO) {
      expect(config.minio.publicBaseUrl).toBe(
        "https://api.example.cl/api/storage"
      );
    }
  });
});

// ---------------------------------------------------------------------------
// The @fastify/under-pressure thresholds are also exercised through the module's
// PUBLIC surface (the exported constants), pinning that the module-level
// derivation from parseEnv(process.env) still preserves today's production
// defaults and falls back safely on a malformed override.
// ---------------------------------------------------------------------------

// Stub the env vars, drop the cached module, and re-import so the module-level
// reads in config/environment.ts pick up the stubbed values.
const importWithEnv = async (env: Record<string, string>) => {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  vi.resetModules();
  return import("@/config/environment.js");
};

describe("under-pressure thresholds — defaults", () => {
  it("preserve today's production values when the env vars are unset", () => {
    // The Vitest env sets neither variable, so the statically imported values
    // must equal the hardcoded production defaults.
    expect(MAX_EVENT_LOOP_DELAY_MS).toBe(300);
    expect(MAX_EVENT_LOOP_UTILIZATION).toBe(0.9);
  });
});

describe("under-pressure thresholds — env overrides", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("apply a valid numeric override", async () => {
    const env = await importWithEnv({
      MAX_EVENT_LOOP_DELAY_MS: "500",
      MAX_EVENT_LOOP_UTILIZATION: "0.75",
    });
    expect(env.MAX_EVENT_LOOP_DELAY_MS).toBe(500);
    expect(env.MAX_EVENT_LOOP_UTILIZATION).toBe(0.75);
  });

  it("fall back to the default for a non-numeric value", async () => {
    const env = await importWithEnv({
      MAX_EVENT_LOOP_DELAY_MS: "fast",
      MAX_EVENT_LOOP_UTILIZATION: "high",
    });
    expect(env.MAX_EVENT_LOOP_DELAY_MS).toBe(300);
    expect(env.MAX_EVENT_LOOP_UTILIZATION).toBe(0.9);
  });

  it("fall back to the default for an empty or non-finite value", async () => {
    const env = await importWithEnv({
      MAX_EVENT_LOOP_DELAY_MS: "   ",
      MAX_EVENT_LOOP_UTILIZATION: "Infinity",
    });
    expect(env.MAX_EVENT_LOOP_DELAY_MS).toBe(300);
    expect(env.MAX_EVENT_LOOP_UTILIZATION).toBe(0.9);
  });
});
