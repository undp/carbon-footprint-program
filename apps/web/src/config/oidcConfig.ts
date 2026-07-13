import type { UserManagerSettings } from "oidc-client-ts";
import { WebStorageStateStore } from "oidc-client-ts";
import {
  OIDC_ISSUER,
  OIDC_CLIENT_ID,
  OIDC_SCOPES,
  OIDC_REDIRECT_URI,
  OIDC_POST_LOGOUT_REDIRECT_URI,
} from "./environment";

/**
 * Generic OIDC client settings (Authorization Code + PKCE). Provider-agnostic:
 * `authority` is the configured issuer, so the same build works against any
 * compliant IdP. Tokens are persisted in localStorage and silently renewed via
 * the refresh token (`automaticSilentRenew`); the refresh-token lifetime is
 * governed by the requested scopes — Keycloak omits `offline_access` (renew
 * rides the SSO-session-bound refresh token), Entra requests it. See the
 * VITE_OIDC_SCOPES notes in the OIDC env docs.
 */
export const oidcSettings: UserManagerSettings = {
  authority: OIDC_ISSUER,
  client_id: OIDC_CLIENT_ID,
  redirect_uri: OIDC_REDIRECT_URI,
  post_logout_redirect_uri: OIDC_POST_LOGOUT_REDIRECT_URI,
  // popup + silent renew reuse redirect_uri unless overridden.
  response_type: "code",
  scope: OIDC_SCOPES,
  userStore: new WebStorageStateStore({ store: window.localStorage }),
  automaticSilentRenew: true,
};
