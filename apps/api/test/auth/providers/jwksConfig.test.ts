import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildJwtConfig,
  getSigningKey,
  type SigningKeySource,
} from "@/auth/providers/jwksConfig.js";

// Pure unit tests for the JWKS config seam. A fake key source stands in for the
// remote jwks-rsa client, so key resolution and the @fastify/jwt config building
// are exercised without a live IdP. The production wiring (module-level
// `jwtConfig`) feeds the real env + client into these same functions.

/**
 * Fake JWKS key source that returns a fixed PEM per key — no network. Returns
 * the mock fns alongside the source so assertions reference standalone consts
 * (avoids the unbound-method lint on member-access mock references).
 */
const makeSource = (publicKey: string) => {
  const getSigningKey = vi.fn((_kid?: string) =>
    Promise.resolve({ getPublicKey: () => publicKey })
  );
  const getSigningKeys = vi.fn(() =>
    Promise.resolve([{ getPublicKey: () => publicKey }])
  );
  const source: SigningKeySource = { getSigningKey, getSigningKeys };
  return { source, getSigningKey, getSigningKeys };
};

describe("getSigningKey", () => {
  it("throws when the client is not configured (JWKS_URI unset)", async () => {
    await expect(getSigningKey(null, "kid-1")).rejects.toThrow(
      "JWKS client not configured - check JWKS_URI"
    );
  });

  it("fetches the specific key by kid when a kid is provided", async () => {
    const { source, getSigningKey: getKey, getSigningKeys: getKeys } =
      makeSource("PUBLIC-KEY-A");
    const key = await getSigningKey(source, "kid-1");

    expect(key).toBe("PUBLIC-KEY-A");
    expect(getKey).toHaveBeenCalledWith("kid-1");
    expect(getKeys).not.toHaveBeenCalled();
  });

  it("falls back to the first signing key when no kid is provided", async () => {
    const getKeyMock = vi.fn();
    const getKeysMock = vi.fn(() =>
      Promise.resolve([
        { getPublicKey: () => "FIRST-KEY" },
        { getPublicKey: () => "SECOND-KEY" },
      ])
    );
    const source: SigningKeySource = {
      getSigningKey: getKeyMock,
      getSigningKeys: getKeysMock,
    };

    const key = await getSigningKey(source);

    expect(key).toBe("FIRST-KEY");
    expect(getKeysMock).toHaveBeenCalledOnce();
    expect(getKeyMock).not.toHaveBeenCalled();
  });

  it("throws when the JWKS returns an empty key set", async () => {
    const source: SigningKeySource = {
      getSigningKey: vi.fn(),
      getSigningKeys: vi.fn(() => Promise.resolve([])),
    };

    await expect(getSigningKey(source)).rejects.toThrow(
      "No signing keys found in JWKS"
    );
  });
});

describe("buildJwtConfig", () => {
  const base = {
    jwksIssuer: undefined,
    jwksAudience: undefined,
    jwtSecret: "static-dev-secret",
    client: null,
  };

  it("falls back to the static HMAC secret when JWKS_URI is unset", () => {
    const config = buildJwtConfig({ ...base, jwksUri: undefined });

    expect(config).toEqual({ secret: "static-dev-secret" });
    // No dynamic decode / verify options in the fallback branch.
    expect(config.decode).toBeUndefined();
    expect(config.verify).toBeUndefined();
  });

  it("wires issuer + audience validation when both are configured", () => {
    const config = buildJwtConfig({
      ...base,
      jwksUri: "https://issuer.example.com/jwks",
      jwksIssuer: "https://issuer.example.com/",
      jwksAudience: "api://my-app",
      client: makeSource("K").source,
    });

    expect(config.decode).toEqual({ complete: true });
    expect(typeof config.secret).toBe("function");
    expect(config.verify).toEqual({
      allowedIss: ["https://issuer.example.com/"],
      allowedAud: ["api://my-app"],
    });
  });

  it("leaves issuer/audience validation off when they are not configured", () => {
    const config = buildJwtConfig({
      ...base,
      jwksUri: "https://issuer.example.com/jwks",
      client: makeSource("K").source,
    });

    expect(config.verify).toEqual({
      allowedIss: undefined,
      allowedAud: undefined,
    });
  });

  it("resolves the signing key by kid via the injected client (secret callback)", async () => {
    const { source, getSigningKey } = makeSource("PEM-FROM-KID");
    const config = buildJwtConfig({
      ...base,
      jwksUri: "https://issuer.example.com/jwks",
      client: source,
    });

    // The secret is the dynamic resolver; @fastify/jwt calls it with the full
    // decoded token when decode.complete is set.
    const resolve = config.secret as (
      request: unknown,
      token: unknown
    ) => Promise<string>;

    const key = await resolve({}, { header: { kid: "kid-xyz" } });
    expect(key).toBe("PEM-FROM-KID");
    expect(getSigningKey).toHaveBeenCalledWith("kid-xyz");
  });

  it("resolves via getSigningKeys when the token header carries no kid", async () => {
    const { source, getSigningKey, getSigningKeys } = makeSource("PEM-NO-KID");
    const config = buildJwtConfig({
      ...base,
      jwksUri: "https://issuer.example.com/jwks",
      client: source,
    });

    const resolve = config.secret as (
      request: unknown,
      token: unknown
    ) => Promise<string>;

    const key = await resolve({}, { header: {} });
    expect(key).toBe("PEM-NO-KID");
    expect(getSigningKeys).toHaveBeenCalledOnce();
    expect(getSigningKey).not.toHaveBeenCalled();
  });
});

describe("jwksConfig module wiring", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("warns at startup when JWKS_URI is set but no issuer is configured", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubEnv("JWKS_URI", "https://issuer.example.com/jwks");
    vi.resetModules();

    // Re-importing rebuilds the module against the stubbed env; the missing
    // issuer must trigger the "issuer validation is DISABLED" startup warning.
    await import("@/auth/providers/jwksConfig.js");

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Issuer validation is DISABLED")
    );
  });
});
