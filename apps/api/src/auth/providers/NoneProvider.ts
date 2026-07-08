/**
 * @fileoverview No-Auth Provider
 *
 * Used when AUTH_PROVIDER is unset / "none": authentication always fails, so any
 * route requiring auth resolves no user. For local development that needs a fake
 * identity, use ForcedUserProvider instead.
 */

import type { FastifyRequest } from "fastify";
import type { AuthProvider, AuthResult } from "../AuthProvider.js";

/**
 * NoneProvider: Development/No-Auth authentication provider.
 *
 * This provider is used when authentication is disabled (AUTH_PROVIDER is 'none').
 * It allows bypassing authentication for local development or testing.
 *
 * It always makes the authentication fail.
 */
export class NoneProvider implements AuthProvider {
  readonly type = "none" as const;

  /**
   * Always fails — no auth provider configured.
   */
  authenticate(_request: FastifyRequest): Promise<AuthResult> {
    return Promise.resolve({
      user: null,
      error: "AUTH_PROVIDER was not set",
    });
  }
}
