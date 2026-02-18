/**
 * @fileoverview Azure Easy Auth Provider
 *
 * Authenticates requests using Azure App Service Easy Auth (EasyAuth).
 * When Easy Auth is enabled on Azure App Service, authenticated requests
 * include the X-MS-CLIENT-PRINCIPAL header with base64-encoded user info.
 *
 * @see https://learn.microsoft.com/en-us/azure/app-service/configure-authentication-user-identities
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
 *
 * Note: This does NOT implement Azure Easy Auth. For Easy Auth, use the appropriate provider.
 */
export class NoneProvider implements AuthProvider {
  readonly type = "none" as const;

  /**
   * Authenticate using Easy Auth headers.
   */
  authenticate(_request: FastifyRequest): Promise<AuthResult> {
    return Promise.resolve({
      user: null,
      error: "AUTH_PROVIDER was not set",
    });
  }
}
