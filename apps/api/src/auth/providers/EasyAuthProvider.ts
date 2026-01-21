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
import type { AuthUser } from "../types.js";

/**
 * Structure of a claim in the Easy Auth principal.
 */
interface EasyAuthClaim {
  typ: string;
  val: string;
}

/**
 * Structure of the X-MS-CLIENT-PRINCIPAL header payload.
 */
interface EasyAuthPrincipal {
  auth_typ: string;
  claims: EasyAuthClaim[];
  name_typ: string;
  role_typ: string;
}

/**
 * Azure Easy Auth authentication provider.
 *
 * When Azure App Service Easy Auth is enabled, the platform handles
 * authentication and passes user info via special headers:
 * - X-MS-CLIENT-PRINCIPAL: Base64-encoded JSON with user claims
 * - X-MS-CLIENT-PRINCIPAL-ID: User's unique ID
 * - X-MS-CLIENT-PRINCIPAL-NAME: User's name/email
 */
export class EasyAuthProvider implements AuthProvider {
  readonly type = "easy-auth" as const;

  /**
   * Authenticate using Easy Auth headers.
   */
  authenticate(request: FastifyRequest): Promise<AuthResult> {
    try {
      const principalHeader = request.headers["x-ms-client-principal"];

      if (!principalHeader || typeof principalHeader !== "string") {
        return Promise.resolve({
          success: false,
          error: "User not authenticated via Easy Auth",
        });
      }

      // Decode the base64-encoded principal
      const decoded = Buffer.from(principalHeader, "base64").toString("utf-8");
      const principal = JSON.parse(decoded) as EasyAuthPrincipal;

      // Convert claims array to a map for easier access
      const claimsMap: Record<string, string> = {};
      for (const claim of principal.claims) {
        claimsMap[claim.typ] = claim.val;
      }

      // Extract standard claims
      // Common claim types in Easy Auth:
      // - http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress

      const email =
        claimsMap["preferred_username"] ??
        claimsMap[
          "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
        ] ??
        null;

      const userOid =
        claimsMap[
          "http://schemas.microsoft.com/identity/claims/objectidentifier"
        ] || claimsMap["oid"];

      const user: AuthUser = {
        idpUserId: userOid,
        email,
        idpName: this.type,
      };

      return Promise.resolve({ success: true, user });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Easy Auth parsing failed";
      return Promise.resolve({ success: false, error: message });
    }
  }
}
