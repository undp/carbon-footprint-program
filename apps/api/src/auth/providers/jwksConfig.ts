/**
 * @fileoverview JWKS Configuration for Token Validation
 *
 * Provides generic JWKS-based token validation configuration.
 * Supports any OAuth 2.0 / OpenID Connect provider that exposes a JWKS endpoint.
 *
 * Configured entirely via environment variables (JWKS_URI, JWKS_ISSUER,
 * JWKS_AUDIENCE) — works with any OIDC issuer (Entra, Keycloak, …). The
 * provider-specific URL formats are produced by the env templates / deploy, not here.
 *
 * This configuration is used by:
 * - The jwt.ts plugin to configure @fastify/jwt
 * - JwksAuthProvider to validate tokens via request.jwtVerify()
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7517 - JSON Web Key (JWK) spec
 */

import type { FastifyJWTOptions } from "@fastify/jwt";
import { JwksClient } from "jwks-rsa";
import {
  JWT_SECRET,
  JWKS_URI,
  JWKS_ISSUER,
  JWKS_AUDIENCE,
} from "@/config/environment.js";

/**
 * Minimal structural view of the jwks-rsa client the key resolver depends on.
 * Declared here (rather than using `JwksClient` directly) so tests can inject a
 * fake key source — a locally-generated key set — without a live JWKS endpoint.
 * The real {@link JwksClient} satisfies this shape.
 */
export interface SigningKeySource {
  getSigningKey(kid?: string): Promise<{ getPublicKey(): string }>;
  getSigningKeys(): Promise<Array<{ getPublicKey(): string }>>;
}

/**
 * Get a signing key from a JWKS client. Pure over its `client` argument (the
 * remote is passed in, never captured from module scope) so every branch —
 * unconfigured client, explicit `kid`, no `kid`, and the empty-key-set error —
 * is unit-testable with an injected fake source.
 *
 * @param client - JWKS key source, or null when JWKS is not configured
 * @param kid - Key ID from JWT header (optional for some providers)
 * @returns Public key for token verification
 * @throws Error if JWKS client not configured or no keys found
 */
export async function getSigningKey(
  client: SigningKeySource | null,
  kid?: string
): Promise<string> {
  if (!client) {
    throw new Error("JWKS client not configured - check JWKS_URI");
  }

  // If kid is provided, get the specific key
  if (kid) {
    const key = await client.getSigningKey(kid);
    return key.getPublicKey();
  }

  // If no kid, get all keys and use the first signing key
  // This is common with some providers like Azure Entra External ID
  const keys = await client.getSigningKeys();
  if (!keys || keys.length === 0) {
    throw new Error("No signing keys found in JWKS");
  }
  return keys[0].getPublicKey();
}

/** Resolved inputs the @fastify/jwt config is built from. */
export interface JwtConfigParams {
  /** JWKS endpoint. When falsy, the static-secret fallback is used. */
  jwksUri: string | undefined;
  /** Expected issuer (`iss`). When falsy, issuer validation is disabled. */
  jwksIssuer: string | undefined;
  /** Expected audience (`aud`). When falsy, audience validation is disabled. */
  jwksAudience: string | undefined;
  /** Static HMAC secret used only in the (dev) fallback branch. */
  jwtSecret: string;
  /** Key source used by the dynamic secret resolver in the JWKS branch. */
  client: SigningKeySource | null;
}

/**
 * Build the @fastify/jwt options from already-resolved config values. Pure over
 * its inputs (no env reads, no network) so both the JWKS branch — dynamic key
 * resolution + issuer/audience enforcement — and the static-secret fallback are
 * unit-testable. The module-level {@link jwtConfig} below wires the real env and
 * client into it, so the production path is unchanged.
 *
 * When JWKS is configured (via `jwksUri`):
 * - Uses dynamic secret resolution via JWKS
 * - Validates issuer and audience if configured
 *
 * When not configured:
 * - Falls back to the static `jwtSecret` for development
 */
export function buildJwtConfig({
  jwksUri,
  jwksIssuer,
  jwksAudience,
  jwtSecret,
  client,
}: JwtConfigParams): FastifyJWTOptions {
  if (!jwksUri) {
    // Fallback to static secret for development
    return { secret: jwtSecret };
  }

  return {
    // Decode with complete: true so the secret callback receives the full
    // decoded token (including header.kid) instead of just the payload.
    decode: { complete: true },
    // Use dynamic secret resolution via JWKS
    secret: async (_request: unknown, token: unknown) => {
      const decodedToken = token as { header?: { kid?: string } };
      const kid = decodedToken.header?.kid;
      return getSigningKey(client, kid);
    },
    verify: {
      // Verify the token issuer if configured
      allowedIss: jwksIssuer ? [jwksIssuer] : undefined,
      // Verify the token audience if configured
      allowedAud: jwksAudience ? [jwksAudience] : undefined,
    },
  };
}

/**
 * JWKS client for token validation.
 * Caches keys for performance.
 */
const jwksClient = JWKS_URI
  ? new JwksClient({
      jwksUri: JWKS_URI,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000, // 10 minutes
    })
  : null;

// Warn at startup if JWKS is configured but issuer validation will be skipped
if (JWKS_URI && !JWKS_ISSUER) {
  // eslint-disable-next-line no-console
  console.warn(
    `[auth] WARNING: JWKS URI is configured (${JWKS_URI}) but no issuer is set. ` +
      "Issuer validation is DISABLED — tokens from any issuer will be accepted. " +
      "Set JWKS_ISSUER to enable issuer validation."
  );
}

export const jwtConfig: FastifyJWTOptions = buildJwtConfig({
  jwksUri: JWKS_URI,
  jwksIssuer: JWKS_ISSUER,
  jwksAudience: JWKS_AUDIENCE,
  jwtSecret: JWT_SECRET,
  client: jwksClient,
});
