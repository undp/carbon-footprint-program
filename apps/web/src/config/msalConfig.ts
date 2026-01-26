import { Configuration } from "@azure/msal-browser";
import {
  AZURE_FRONT_CLIENT_ID,
  AZURE_AUTHORITY,
  AZURE_REDIRECT_URI,
  AZURE_API_CLIENT_ID,
} from "./environment";

/**
 * MSAL Configuration for Azure Entra External ID
 * Supports Email OTP authentication
 */
export const msalConfig: Configuration = {
  auth: {
    clientId: AZURE_FRONT_CLIENT_ID,
    authority: AZURE_AUTHORITY,
    redirectUri: `${AZURE_REDIRECT_URI}/app/home`,
    postLogoutRedirectUri: `${window.location.origin}/auth/sign-in`,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: "localStorage", // "sessionStorage" or "localStorage"
    storeAuthStateInCookie: false, // Set to true for IE 11 or Edge
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
 * For Azure Entra External ID with OTP:
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
