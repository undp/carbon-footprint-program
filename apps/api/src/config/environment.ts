// Default value for development only - should never reach production
export const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

export const IS_PROD = process.env.NODE_ENV?.toLowerCase() === "production";

export const LOG_LEVEL = process.env.LOG_LEVEL ?? (IS_PROD ? "info" : "debug");

export const HOST = process.env.API_HOST ?? (IS_PROD ? "0.0.0.0" : "localhost");
export const PORT = parseInt(process.env.API_PORT ?? "8080", 10);

export const DATABASE_URL = process.env.DATABASE_URL;

// ============================================================================
// JWKS Configuration (Generic)
// ============================================================================
// These are the generic JWKS settings used for token validation.
// They can be set directly via environment variables, or computed from
// provider-specific variables (e.g., Azure AD).

/**
 * JWKS URI for fetching public keys.
 * Can be set directly or computed from AZURE_AD_TENANT_ID.
 */
export const JWKS_URI = process.env.JWKS_URI;

/**
 * Expected token issuer (iss claim).
 * Can be set directly or computed from AZURE_AD_TENANT_ID.
 */
export const JWKS_ISSUER = process.env.JWKS_ISSUER;

/**
 * Expected token audience (aud claim).
 * Usually your application's client ID.
 */
export const JWKS_AUDIENCE = process.env.JWKS_AUDIENCE;

// ============================================================================
// Azure AD / Entra External ID Configuration
// ============================================================================
// Azure-specific configuration that computes JWKS values.
// If JWKS_* variables are not set, these will be used as defaults.

/**
 * Azure AD Tenant ID (Directory ID).
 *
 * For Azure Entra External ID (CIAM):
 * - This is your External ID tenant subdomain (e.g., "mycompany" from mycompany.ciamlogin.com)
 * - Found in Azure Portal > Microsoft Entra External ID > Overview > "Tenant subdomain"
 * - Format: lowercase alphanumeric string (not a GUID)
 * - Example: "mycompany" (not "mycompany.ciamlogin.com")
 *
 * For traditional Azure AD:
 * - This is your Directory (tenant) ID GUID
 * - Found in Azure Portal > Microsoft Entra ID > Overview > "Tenant ID"
 * - Format: UUID (e.g., "12345678-1234-1234-1234-123456789abc")
 */
export const AZURE_AD_TENANT_ID = process.env.AZURE_AD_TENANT_ID;

/**
 * Azure AD Application (Client) ID.
 *
 * This is your registered application's unique identifier:
 * - Found in Azure Portal > Microsoft Entra ID > App registrations > [Your App] > Overview > "Application (client) ID"
 * - Format: UUID (e.g., "87654321-4321-4321-4321-abcdef123456")
 * - This value is used as the expected audience (aud) claim in JWT tokens
 * - Required for token validation to ensure tokens are issued for your application
 *
 * Note: This is the same for both Azure Entra External ID and traditional Azure AD.
 */
export const AZURE_AD_CLIENT_ID = process.env.AZURE_AD_CLIENT_ID;

// Computed Azure AD values for Azure Entra External ID (CIAM)
// CIAM uses ciamlogin.com instead of login.microsoftonline.com
const AZURE_AD_ISSUER = AZURE_AD_TENANT_ID
  ? `https://${AZURE_AD_TENANT_ID}.ciamlogin.com/${AZURE_AD_TENANT_ID}/v2.0`
  : undefined;
const AZURE_AD_JWKS_URI = AZURE_AD_TENANT_ID
  ? `https://${AZURE_AD_TENANT_ID}.ciamlogin.com/${AZURE_AD_TENANT_ID}/discovery/v2.0/keys`
  : undefined;

// ============================================================================
// Resolved JWKS Configuration
// ============================================================================
// Final values used by the auth system. Prefers explicit JWKS_* variables,
// falls back to Azure AD computed values.

/**
 * Resolved JWKS URI - used by auth providers.
 * Priority: JWKS_URI > Azure AD computed value
 */
export const RESOLVED_JWKS_URI = JWKS_URI || AZURE_AD_JWKS_URI;

/**
 * Resolved issuer - used for token validation.
 * Priority: JWKS_ISSUER > Azure AD computed value
 */
export const RESOLVED_JWKS_ISSUER = JWKS_ISSUER || AZURE_AD_ISSUER;

/**
 * Resolved audience - used for token validation.
 * Priority: JWKS_AUDIENCE > AZURE_AD_CLIENT_ID
 */
export const RESOLVED_JWKS_AUDIENCE = JWKS_AUDIENCE || AZURE_AD_CLIENT_ID;

// ============================================================================
// Authentication Provider Configuration
// ============================================================================
// AUTH_PROVIDER: "jwks" | "easy-auth" | "none"
// - jwks: Use MSAL tokens with JWKS validation
// - easy-auth: Use Azure App Service Easy Auth headers
// - none: Disable authentication (default for local dev)
export const AUTH_PROVIDER = (process.env.AUTH_PROVIDER || "none") as
  | "jwks"
  | "easy-auth"
  | "none";
