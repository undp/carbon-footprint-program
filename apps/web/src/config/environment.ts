const {
  VITE_API_BASE_URL,
  VITE_OIDC_ISSUER,
  VITE_OIDC_CLIENT_ID,
  VITE_OIDC_SCOPES,
  VITE_OIDC_REDIRECT_URI,
  VITE_OIDC_POST_LOGOUT_REDIRECT_URI,
  VITE_IS_DEMO_APP,
  VITE_APP_VERSION,
} = import.meta.env;

export const IS_DEVELOPMENT = import.meta.env.DEV;

export const LOCAL_BYPASS_REQUIRED_FIELDS =
  import.meta.env.VITE_LOCAL_BYPASS_REQUIRED_FIELDS === "true";

export const IS_DEMO = VITE_IS_DEMO_APP === "true";

export const API_BASE_URL = VITE_API_BASE_URL!;

// Generic OIDC configuration. The identity provider (Keycloak, Entra External
// ID, …) is selected per deployment via VITE_OIDC_ISSUER — no provider-specific
// code. The frontend always uses OIDC, so the issuer, client id and scopes are
// required and baked into the bundle at build time; the guard below fails loud at
// boot if any is missing. The recommended scope set and per-provider notes live in
// the OIDC block of .env*.dockercompose.example / .envrc.template. The redirect
// URIs fall back to the serving origin, so a single build works on whichever host
// serves it (e.g. :5173 dev vs :3000 compose).
const missingOidcEnv = Object.entries({
  VITE_OIDC_ISSUER,
  VITE_OIDC_CLIENT_ID,
  VITE_OIDC_SCOPES,
})
  .filter(([, value]) => !value?.trim())
  .map(([name]) => name);

if (missingOidcEnv.length > 0) {
  throw new Error(
    `Missing required OIDC build config: ${missingOidcEnv.join(", ")}. ` +
      "These VITE_OIDC_* values are required"
  );
}

export const OIDC_ISSUER = VITE_OIDC_ISSUER!;
export const OIDC_CLIENT_ID = VITE_OIDC_CLIENT_ID!;
export const OIDC_SCOPES = VITE_OIDC_SCOPES!;
// `||` (not `??`): compose passes `${VAR:-}` = "" (empty, not undefined) when a
// var is unset, so the origin fallback must trigger on empty string too.
export const OIDC_REDIRECT_URI =
  VITE_OIDC_REDIRECT_URI || `${window.location.origin}/auth/callback`;
export const OIDC_POST_LOGOUT_REDIRECT_URI =
  VITE_OIDC_POST_LOGOUT_REDIRECT_URI || `${window.location.origin}/`;

export const APP_VERSION = (VITE_APP_VERSION as string) || "dev";
