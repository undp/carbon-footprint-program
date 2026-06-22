import type { FastifyRequest } from "fastify";
import type { AuthProvider, AuthResult } from "../AuthProvider.js";
import {
  FORCED_USER_IDP_ID_WHEN_NO_PROVIDER,
  FORCED_USER_EMAIL_WHEN_NO_PROVIDER,
} from "../../config/environment.js";

/**
 * ForcedUserProvider: Development/Test forced user provider.
 *
 * This provider is used when authentication is disabled (AUTH_PROVIDER is 'none')
 * but a specific user identity is needed for local development or testing.
 *
 * When both FORCED_USER_IDP_ID_WHEN_NO_PROVIDER and
 * FORCED_USER_EMAIL_WHEN_NO_PROVIDER are set, a fake user is returned whose
 * idpUserId and email are derived from those env vars. Otherwise,
 * authentication fails.
 */
export class ForcedUserProvider implements AuthProvider {
  readonly type = "forced-user" as const;

  /**
   * Authenticate using forced environment variables.
   */
  authenticate(_request: FastifyRequest): Promise<AuthResult> {
    if (
      FORCED_USER_IDP_ID_WHEN_NO_PROVIDER &&
      FORCED_USER_EMAIL_WHEN_NO_PROVIDER
    ) {
      return Promise.resolve({
        user: {
          idpUserId: FORCED_USER_IDP_ID_WHEN_NO_PROVIDER,
          email: FORCED_USER_EMAIL_WHEN_NO_PROVIDER,
          idpName: "N/D",
        },
      });
    }

    return Promise.resolve({
      user: null,
      error:
        "FORCED_USER_IDP_ID_WHEN_NO_PROVIDER or FORCED_USER_EMAIL_WHEN_NO_PROVIDER were not set",
    });
  }
}
