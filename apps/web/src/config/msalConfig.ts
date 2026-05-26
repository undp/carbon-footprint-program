import { Configuration } from "@azure/msal-browser";
import {
  AZURE_FRONT_CLIENT_ID,
  AZURE_AUTHORITY,
  FRONT_BASE_URL,
  AZURE_API_CLIENT_ID,
} from "./environment";

/**
 * MSAL Configuration for Azure Entra ID
 * Supports both external (CIAM) and organizational tenants.
 * The authority URL (VITE_AZURE_AUTH_AUTHORITY) determines the tenant type.
 */
export const msalConfig: Configuration = {
  auth: {
    clientId: AZURE_FRONT_CLIENT_ID,
    authority: AZURE_AUTHORITY,
    redirectUri: `${FRONT_BASE_URL}/app/home`,
    postLogoutRedirectUri: FRONT_BASE_URL,
  },
  cache: {
    cacheLocation: "localStorage", // "sessionStorage" or "localStorage"
  },
};

/**
 * Scopes for login/authentication flow
 * These are requested when user signs in
 */
export const loginRequest = {
  scopes: ["openid", "profile", "email", "offline_access"],
};

/**
 * Scopes for API access tokens
 * Use this when calling your backend API
 *
 * For both external (CIAM) and organizational tenants:
 * - Use the default scopes if your API doesn't require custom scopes
 * - Add custom API scopes here if you've exposed an API in Azure
 *   Format: "api://<client-id>/<scope-name>"
 */
export const apiTokenRequest = {
  scopes: [
    // Add your custom API scopes here if needed:
    `api://${AZURE_API_CLIENT_ID}/access_as_user`,
  ],
};
