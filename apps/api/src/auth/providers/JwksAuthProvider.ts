/**
 * @fileoverview JWKS Auth Provider
 *
 * Authenticates requests using JWT tokens validated against a JWKS endpoint.
 * Supports any OAuth 2.0 / OpenID Connect provider that exposes JWKS.
 *
 * Uses the @fastify/jwt plugin (configured via jwksConfig.ts) for token
 * validation and types from auth/types.ts for payload typing.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7517 - JSON Web Key (JWK) spec
 */

import type { FastifyRequest } from "fastify";
import type { AuthProvider, AuthResult } from "../AuthProvider.js";
import type { AuthUser, OidcTokenPayload } from "../types.js";
import { JWKS_REQUIRED_SCOPE } from "@/config/environment.js";

/**
 * JWKS-based authentication provider.
 *
 * Validates JWT tokens using the @fastify/jwt plugin which is configured
 * to use a JWKS endpoint for key retrieval.
 *
 * Flow:
 * 1. Calls request.jwtVerify() (provided by @fastify/jwt plugin)
 * 2. Plugin validates token signature using JWKS, issuer, and audience
 * 3. Payload becomes available as request.user (typed as OidcTokenPayload)
 * 4. Maps payload to normalized AuthUser interface
 */
export class JwksAuthProvider implements AuthProvider {
  readonly type = "jwks" as const;

  /**
   * Authenticate using JWT token from Authorization header.
   * Relies on @fastify/jwt plugin for token validation.
   */
  async authenticate(request: FastifyRequest): Promise<AuthResult> {
    // Note: `request.jwtVerify()` validates token expiry (`exp`) and will
    // throw an error (TokenExpiredError) for expired tokens. We log and map
    // those errors here so callers get a clear failure reason.
    request.log.debug("JwksAuthProvider: authenticate called");
    try {
      // Verify the token cryptographically against the JWKS provider
      // This validates: signature, issuer, audience, and expiration.
      // The verified payload is returned by the plugin and must be used
      // so forged or tampered tokens are rejected.
      const payload = await request.jwtVerify<OidcTokenPayload>();

      request.log.debug(
        { sub: payload.sub, oid: payload.oid },
        "JwksAuthProvider: token verified"
      );

      // Enforce required scope (e.g. "access_as_user"). The granted scopes live
      // under different claim names depending on the issuer: Azure/Entra uses its
      // own `scp` claim, while standard OIDC providers (e.g. Keycloak, per
      // RFC 9068) use `scope`. Only one is ever present, so consolidate to it.
      if (JWKS_REQUIRED_SCOPE) {
        const consolidatedPayloadScope = payload.scp ?? payload.scope;
        const scopes = consolidatedPayloadScope?.split(" ") ?? [];
        if (!scopes.includes(JWKS_REQUIRED_SCOPE)) {
          const tokenScopes = consolidatedPayloadScope ?? "(none)";
          throw new Error(
            `Token missing required scope "${JWKS_REQUIRED_SCOPE}". ` +
              `Token scopes: "${tokenScopes}".`
          );
        }
      }

      if (!payload.sub && !payload.oid) {
        throw new Error("Token payload missing 'sub' or 'oid' claim");
      }

      // Extract user email from standard OIDC claims
      const email = payload.email ?? payload.preferred_username;
      if (!email) {
        throw new Error(
          "Token payload missing email claim ('email' or 'preferred_username')"
        );
      }

      // Determine idp user id (prefer `oid`, fallback to `sub`)
      const idpUserId = payload.oid ?? payload.sub;

      // Map OidcTokenPayload to normalized AuthUser
      const user: AuthUser = {
        idpUserId,
        email: email,
        idpName: this.type,
      };

      request.log.info(
        { idpUserId },
        "JwksAuthProvider: authentication succeeded"
      );

      return { user };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "JWT verification failed";
      return { user: null, error: message };
    }
  }
}
