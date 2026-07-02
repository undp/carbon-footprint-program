import { getValidOidcUser } from "@/auth/oidcUserManager";

/**
 * Returns the current OIDC access token for API calls. Delegates to
 * `getValidOidcUser`, which silently renews an expired token before giving up.
 * Returns null when not signed in.
 */
export async function getAuthToken(): Promise<string | null> {
  const user = await getValidOidcUser();
  return user?.access_token ?? null;
}
