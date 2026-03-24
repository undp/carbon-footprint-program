const {
  VITE_API_BASE_URL,
  VITE_AZURE_FRONT_CLIENT_ID,
  VITE_AZURE_AUTH_AUTHORITY,
  VITE_FRONT_BASE_URL,
  VITE_AZURE_API_CLIENT_ID,
  VITE_IS_DEMO_APP,
  VITE_APP_VERSION,
  VITE_AUTH_BYPASS,
} = import.meta.env;

export const IS_DEVELOPMENT = import.meta.env.DEV;

/** When true, skips Azure MSAL auth. Only active in dev mode — ignored in production. */
export const AUTH_BYPASS = IS_DEVELOPMENT && VITE_AUTH_BYPASS === "true";

export const IS_DEMO = VITE_IS_DEMO_APP === "true";

export const API_BASE_URL = VITE_API_BASE_URL!;

// Azure External ID Configuration
export const AZURE_FRONT_CLIENT_ID = VITE_AZURE_FRONT_CLIENT_ID!;
export const AZURE_AUTHORITY = VITE_AZURE_AUTH_AUTHORITY!;
export const FRONT_BASE_URL = VITE_FRONT_BASE_URL!;
export const AZURE_API_CLIENT_ID = VITE_AZURE_API_CLIENT_ID!;

export const APP_VERSION = (VITE_APP_VERSION as string) || "dev";
