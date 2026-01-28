import type { FastifyRequest } from "fastify";
import type { AuthProvider, AuthResult } from "../AuthProvider.js";
import { FORCED_USER_EMAIL_WHEN_NO_PROVIDER } from "../../config/environment.js";

/**
 * ForcedUserProvider: Development/Test forced user provider.
 *
 * This provider is used when authentication is disabled (AUTH_PROVIDER is 'none')
 * but a specific user identity is needed for local development or testing.
 *
 * If FORCED_USER_EMAIL_WHEN_NO_PROVIDER is set, it returns a fake user with that email as both id and email.
 * Otherwise, authentication fails.
 *
 * Note: This provider is NOT related to Azure Easy Auth. For Easy Auth, use EasyAuthProvider.
 */
export class ForcedUserProvider implements AuthProvider {
  readonly type = "forced-user" as const;

  /**
   * Authenticate using Easy Auth headers.
   */
  authenticate(_request: FastifyRequest): Promise<AuthResult> {
    const result = FORCED_USER_EMAIL_WHEN_NO_PROVIDER
      ? {
          success: true,
          user: {
            idpUserId: FORCED_USER_EMAIL_WHEN_NO_PROVIDER,
            email: FORCED_USER_EMAIL_WHEN_NO_PROVIDER,
            idpName: "N/D",
          },
        }
      : {
          success: false,
          error: "FORCED_USER_EMAIL_WHEN_NO_PROVIDER was not set",
        };

    return new Promise((resolve) => {
      resolve(result);
    });
  }
}
