/**
 * @fileoverview Authentication Types
 *
 * Defines the core types for the authentication system.
 * These types are provider-agnostic and can be used with any auth provider.
 */

/**
 * Standard OIDC Token Payload
 *
 * Represents common claims found in OAuth 2.0 / OpenID Connect tokens.
 * This is a generic type that works with most identity providers including:
 * - Azure AD / Entra ID
 * - Auth0
 * - Okta
 * - Keycloak
 * - Google
 *
 * @see https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
 */
export interface OidcTokenPayload {
  /** Subject - unique user identifier */
  sub: string;
  /** User's email address */
  email?: string;
  /** User's preferred username (often the email) */
  preferred_username?: string;
  /** Token version (Azure AD: must be "2.0") */
  ver?: string;
  /**
   * Granted scopes (space-delimited). Azure/Entra emits scopes under its own
   * `scp` claim — a Microsoft convention that predates the JWT access-token
   * standard. Consolidated with `scope` in JwksAuthProvider.
   */
  scp?: string;
  /**
   * Granted scopes (space-delimited). Standard OIDC providers (e.g. Keycloak,
   * per RFC 9068) emit scopes under the `scope` claim. Consolidated with `scp`
   * in JwksAuthProvider — only one of the two is ever present per issuer.
   */
  scope?: string;
  /** User's display name */
  name?: string;
  /** User's given/first name */
  given_name?: string;
  /** User's family/last name */
  family_name?: string;
  /** Audience - your app's client ID */
  aud: string | string[];
  /** Issuer - identity provider URL */
  iss: string;
  /** Issued at timestamp */
  iat: number;
  /** Expiration timestamp */
  exp: number;
  /** Not before timestamp */
  nbf?: number;
  /** Azure AD specific: Object ID */
  oid?: string;
  /** Azure AD specific: Tenant ID */
  tid?: string;
  /** Additional claims */
  [key: string]: unknown;
}

/**
 * Authenticated user information extracted from any auth provider.
 * This is the normalized user object available on `request.authUser`.
 */
export interface AuthUser {
  /** Unique user identifier (sub claim or provider-specific ID) */
  idpUserId: string;
  /** User's email address */
  email: string;
  /** Identity provider name/identifier */
  idpName: string;
}

/**
 * Supported authentication provider types.
 */
export type AuthProviderType = "jwks" | "easy-auth" | "forced-user" | "none";
