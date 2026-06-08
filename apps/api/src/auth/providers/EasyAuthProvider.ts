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
import { treeifyError, z } from "zod";

const EasyAuthClaimSchema = z.object({
  typ: z.string(),
  val: z.string(),
});

const EasyAuthPrincipalSchema = z.object({
  auth_typ: z.string(),
  claims: z.array(EasyAuthClaimSchema),
  name_typ: z.string(),
  role_typ: z.string(),
});

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
    request.log.debug("EasyAuthProvider: authenticate called");
    try {
      const principalHeader = request.headers["x-ms-client-principal"];

      if (!principalHeader || typeof principalHeader !== "string") {
        request.log.warn(
          "EasyAuthProvider: missing X-MS-CLIENT-PRINCIPAL header"
        );
        return Promise.resolve({
          user: null,
          error: "Missing X-MS-CLIENT-PRINCIPAL header",
        });
      }

      // Decode the base64-encoded principal
      const decoded = Buffer.from(principalHeader, "base64").toString("utf-8");

      // Parse JSON safely
      let principalObj: unknown;
      try {
        principalObj = JSON.parse(decoded);
      } catch (err) {
        request.log.warn(
          { err },
          "EasyAuthProvider: invalid JSON in X-MS-CLIENT-PRINCIPAL header"
        );
        return Promise.resolve({
          user: null,
          error: "Invalid X-MS-CLIENT-PRINCIPAL JSON",
        });
      }

      // Validate the decoded principal structure with Zod
      const parsed = EasyAuthPrincipalSchema.safeParse(principalObj);
      if (!parsed.success) {
        request.log.warn(
          { issues: treeifyError(parsed.error) },
          "EasyAuthProvider: principal validation failed"
        );
        return Promise.resolve({
          user: null,
          error: "Invalid Easy Auth principal structure",
        });
      }

      const principal = parsed.data;

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
        claimsMap["email"] ??
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

      request.log.info(
        { idpUserId: userOid },
        "EasyAuthProvider: authentication succeeded"
      );

      return Promise.resolve({ user });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Easy Auth parsing failed";
      request.log.error(
        { err: message },
        "EasyAuthProvider: authentication error"
      );
      return Promise.resolve({ user: null, error: message });
    }
  }
}
