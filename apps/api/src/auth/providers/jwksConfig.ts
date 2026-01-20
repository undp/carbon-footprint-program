/**
 * @fileoverview JWKS Configuration for Token Validation
 *
 * Provides generic JWKS-based token validation configuration.
 * Supports any OAuth 2.0 / OpenID Connect provider that exposes a JWKS endpoint.
 *
 * Currently configured providers (via environment variables):
 * - Azure AD / Entra External ID (default if AZURE_EXTERNAL_TENANT_ID is set)
 * - Any custom OIDC provider (via JWKS_URI, JWKS_ISSUER, JWKS_AUDIENCE)
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
  RESOLVED_JWKS_URI,
  RESOLVED_JWKS_ISSUER,
  RESOLVED_JWKS_AUDIENCE,
} from "@/config/environment.js";

/**
 * JWKS client for token validation.
 * Caches keys for performance.
 */
const jwksClient = RESOLVED_JWKS_URI
  ? new JwksClient({
      jwksUri: RESOLVED_JWKS_URI,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000, // 10 minutes
    })
  : null;

/**
 * Get signing key from JWKS endpoint.
 *
 * @param kid - Key ID from JWT header (optional for some providers)
 * @returns Public key for token verification
 * @throws Error if JWKS client not configured or no keys found
 */
async function getSigningKey(kid?: string): Promise<string> {
  if (!jwksClient) {
    throw new Error(
      "JWKS client not configured - check JWKS_URI or AZURE_EXTERNAL_TENANT_ID"
    );
  }

  // If kid is provided, get the specific key
  if (kid) {
    const key = await jwksClient.getSigningKey(kid);
    return key.getPublicKey();
  }

  // If no kid, get all keys and use the first signing key
  // This is common with some providers like Azure Entra External ID
  const keys = await jwksClient.getSigningKeys();
  if (!keys || keys.length === 0) {
    throw new Error("No signing keys found in JWKS");
  }
  return keys[0].getPublicKey();
}

/**
 * Check if JWKS authentication is configured.
 */
export function isJwksConfigured(): boolean {
  return !!RESOLVED_JWKS_URI;
}

/**
 * Get the configured JWKS URI.
 */
export function getJwksUri(): string | undefined {
  return RESOLVED_JWKS_URI;
}

/**
 * FastifyJWT configuration for JWKS validation.
 *
 * When JWKS is configured (via JWKS_URI or AZURE_EXTERNAL_TENANT_ID):
 * - Uses dynamic secret resolution via JWKS
 * - Validates issuer and audience if configured
 *
 * When not configured:
 * - Falls back to static JWT_SECRET for development
 */
export const jwtConfig: FastifyJWTOptions = RESOLVED_JWKS_URI
  ? {
      // Use dynamic secret resolution via JWKS
      secret: async (_request: unknown, token: unknown) => {
        const decodedToken = token as { header: { kid?: string } };
        const kid = decodedToken.header?.kid;
        return getSigningKey(kid);
      },
      verify: {
        // Verify the token issuer if configured
        allowedIss: RESOLVED_JWKS_ISSUER ? [RESOLVED_JWKS_ISSUER] : undefined,
        // Verify the token audience if configured
        allowedAud: RESOLVED_JWKS_AUDIENCE
          ? [RESOLVED_JWKS_AUDIENCE]
          : undefined,
      },
    }
  : {
      // Fallback to static secret for development
      secret: JWT_SECRET,
    };
