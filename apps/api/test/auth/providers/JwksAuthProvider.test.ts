import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyRequest } from "fastify";
import { JwksAuthProvider } from "@/auth/providers/JwksAuthProvider.js";

// Pure unit tests for the JWKS auth provider. The provider delegates the crypto
// (signature, issuer, audience, expiry) to @fastify/jwt via `request.jwtVerify`;
// what it OWNS — and what these tests exercise — is: mapping a verified payload
// to the normalized identity, enforcing the required scope, requiring the
// sub/oid + email claims, and mapping any verification failure to a safe result.
// A fake request stubs `jwtVerify` so no live IdP or key set is needed. The
// framework-thrown reject cases (expired / wrong issuer / …) are represented as
// the errors @fastify/jwt would throw; the provider's contract is to catch them
// and surface `{ user: null, error }` without leaking.

type Payload = Record<string, unknown>;

/** A request whose `jwtVerify` resolves/rejects on demand; logger is a no-op. */
const makeRequest = (jwtVerify: () => Promise<unknown>): FastifyRequest => {
  const log = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  return { log, jwtVerify } as unknown as FastifyRequest;
};

const verifiesTo = (payload: Payload) => () => Promise.resolve(payload);
// Rejects with an arbitrary value — including non-Errors — to mirror what
// @fastify/jwt can throw and to exercise the provider's non-Error fallback.
const failsWith = (error: unknown) => () =>
  // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- intentionally rejecting with a non-Error to test the provider's fallback path
  Promise.reject(error);

// The test env leaves JWKS_REQUIRED_SCOPE at its default ("access_as_user"), so
// the provider imported here enforces scope. The disabled-scope path is covered
// separately below via a re-import with JWKS_SKIP_SCOPE_CHECK=true.
const REQUIRED_SCOPE = "access_as_user";

describe("JwksAuthProvider — successful authentication", () => {
  const provider = new JwksAuthProvider();

  it("maps a verified token to the normalized identity", async () => {
    const result = await provider.authenticate(
      makeRequest(
        verifiesTo({
          sub: "sub-1",
          email: "user@example.com",
          scp: `openid ${REQUIRED_SCOPE}`,
        })
      )
    );

    expect(result).toEqual({
      user: { idpUserId: "sub-1", email: "user@example.com", idpName: "jwks" },
    });
  });

  it("prefers the `oid` claim over `sub` for the idp user id", async () => {
    const result = await provider.authenticate(
      makeRequest(
        verifiesTo({
          sub: "sub-1",
          oid: "oid-9",
          email: "user@example.com",
          scp: REQUIRED_SCOPE,
        })
      )
    );

    expect(result.user?.idpUserId).toBe("oid-9");
  });

  it("falls back to preferred_username when email is absent", async () => {
    const result = await provider.authenticate(
      makeRequest(
        verifiesTo({
          sub: "sub-1",
          preferred_username: "pref@example.com",
          scp: REQUIRED_SCOPE,
        })
      )
    );

    expect(result.user?.email).toBe("pref@example.com");
  });

  it("accepts the scope delivered under the standard `scope` claim", async () => {
    const result = await provider.authenticate(
      makeRequest(
        verifiesTo({
          sub: "sub-1",
          email: "user@example.com",
          scope: `profile ${REQUIRED_SCOPE}`,
        })
      )
    );

    expect(result.user?.idpUserId).toBe("sub-1");
  });
});

describe("JwksAuthProvider — rejected by the provider's own checks", () => {
  const provider = new JwksAuthProvider();

  it("rejects a token whose scopes lack the required scope", async () => {
    const result = await provider.authenticate(
      makeRequest(
        verifiesTo({
          sub: "sub-1",
          email: "user@example.com",
          scp: "openid profile",
        })
      )
    );

    expect(result.user).toBeNull();
    expect(result.error).toContain(`missing required scope "${REQUIRED_SCOPE}"`);
    // The offending scopes are echoed to aid debugging.
    expect(result.error).toContain("openid profile");
  });

  it("rejects a token carrying no scope claim at all", async () => {
    const result = await provider.authenticate(
      makeRequest(verifiesTo({ sub: "sub-1", email: "user@example.com" }))
    );

    expect(result.user).toBeNull();
    expect(result.error).toContain(`missing required scope "${REQUIRED_SCOPE}"`);
    expect(result.error).toContain("(none)");
  });

  it("rejects a token missing both `sub` and `oid`", async () => {
    const result = await provider.authenticate(
      makeRequest(
        verifiesTo({ email: "user@example.com", scp: REQUIRED_SCOPE })
      )
    );

    expect(result.user).toBeNull();
    expect(result.error).toBe("Token payload missing 'sub' or 'oid' claim");
  });

  it("rejects a token with no email or preferred_username", async () => {
    const result = await provider.authenticate(
      makeRequest(verifiesTo({ sub: "sub-1", scp: REQUIRED_SCOPE }))
    );

    expect(result.user).toBeNull();
    expect(result.error).toContain("missing email claim");
  });
});

describe("JwksAuthProvider — verification failures from @fastify/jwt", () => {
  const provider = new JwksAuthProvider();

  it.each([
    ["expired token", "Authorization token expired"],
    ["wrong issuer", "The iss claim value is not allowed."],
    ["wrong audience", "The aud claim value is not allowed."],
    ["unknown kid", "No signing keys found in JWKS"],
    ["malformed token", "The token is malformed."],
  ])(
    "surfaces the verifier's failure reason for a %s",
    async (_scenario, message) => {
      const result = await provider.authenticate(
        makeRequest(failsWith(new Error(message)))
      );

      expect(result).toEqual({ user: null, error: message });
    }
  );

  it("uses a generic reason when the thrown value is not an Error", async () => {
    const result = await provider.authenticate(
      makeRequest(failsWith("not-an-error"))
    );

    expect(result).toEqual({ user: null, error: "JWT verification failed" });
  });
});

describe("JwksAuthProvider — scope enforcement disabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("skips scope enforcement when JWKS_SKIP_SCOPE_CHECK=true", async () => {
    vi.stubEnv("JWKS_SKIP_SCOPE_CHECK", "true");
    vi.resetModules();

    // Re-import so the provider binds to a freshly-parsed environment where
    // JWKS_REQUIRED_SCOPE is undefined.
    const { JwksAuthProvider: FreshProvider } = await import(
      "@/auth/providers/JwksAuthProvider.js"
    );
    const provider = new FreshProvider();

    // No scope claim at all — accepted because enforcement is off.
    const result = await provider.authenticate(
      makeRequest(verifiesTo({ sub: "sub-1", email: "user@example.com" }))
    );

    expect(result).toEqual({
      user: { idpUserId: "sub-1", email: "user@example.com", idpName: "jwks" },
    });
  });
});
