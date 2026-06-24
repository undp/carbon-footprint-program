import type { FastifyRequest } from "fastify";
import type { AuthProvider, AuthResult } from "../AuthProvider.js";
import {
  FORCED_USER_IDP_ID,
  FORCED_USER_EMAIL,
} from "../../config/environment.js";

/**
 * ForcedUserProvider: Development/Test forced user provider.
 *
 * This provider is used when AUTH_PROVIDER is 'forced-user' and a specific user
 * identity is needed for local development or testing without an IdP.
 *
 * When both FORCED_USER_IDP_ID and
 * FORCED_USER_EMAIL are set, a fake user is returned whose
 * idpUserId and email are derived from those env vars. Otherwise,
 * authentication fails.
 */
export class ForcedUserProvider implements AuthProvider {
  readonly type = "forced-user" as const;

  /**
   * Authenticate using forced environment variables.
   */
  authenticate(_request: FastifyRequest): Promise<AuthResult> {
    if (FORCED_USER_IDP_ID && FORCED_USER_EMAIL) {
      return Promise.resolve({
        user: {
          idpUserId: FORCED_USER_IDP_ID,
          email: FORCED_USER_EMAIL,
          idpName: "N/D",
        },
      });
    }

    return Promise.resolve({
      user: null,
      error: "FORCED_USER_IDP_ID or FORCED_USER_EMAIL were not set",
    });
  }
}
