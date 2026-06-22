import { oidcUserManager } from "@/auth/oidcUserManager";

/**
 * Returns the current OIDC access token for API calls. If the stored token has
 * expired (and automaticSilentRenew hasn't caught up yet), it attempts a silent
 * renew via the refresh token before giving up. Returns null when not signed in.
 */
export async function getAuthToken(): Promise<string | null> {
  const user = await oidcUserManager.getUser();

  if (!user) {
    return null;
  }

  if (!user.expired) {
    return user.access_token ?? null;
  }

  try {
    const renewed = await oidcUserManager.signinSilent();
    return renewed?.access_token ?? null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to acquire token silently:", error);
    return null;
  }
}
