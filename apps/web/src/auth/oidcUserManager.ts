import type { User } from "oidc-client-ts";
import { UserManager } from "oidc-client-ts";
import { oidcSettings } from "@/config/oidcConfig";

/**
 * Singleton OIDC `UserManager` — the single source of truth for the session
 * OUTSIDE React. The route guard (`requireRole`) and the `ky` HTTP client run
 * before/around React and read the session from here; `react-oidc-context` is
 * mounted against this SAME instance (see `routes/__root.tsx`), so React and
 * non-React consumers never diverge.
 */
export const oidcUserManager = new UserManager(oidcSettings);

// Single-flight all silent renewals. Both getValidOidcUser (below) and the
// library's own automaticSilentRenew timer call signinSilent(); when the token
// expires, a burst of concurrent callers would each fire a parallel renew.
// oidc-client-ts doesn't dedupe them, and parallel renews race on refresh-token
// rotation (one wins, the rest fail → spurious logout). Wrapping signinSilent —
// the single chokepoint both paths go through — makes them all await one renewal.
const runSilentRenew = oidcUserManager.signinSilent.bind(oidcUserManager);
let pendingRenewal: Promise<User | null> | null = null;
oidcUserManager.signinSilent = (args) => {
  if (!pendingRenewal) {
    pendingRenewal = runSilentRenew(args).finally(() => {
      pendingRenewal = null;
    });
  }
  return pendingRenewal;
};

/**
 * Resolves the current OIDC user for non-React consumers (the `ky` HTTP client
 * and the `requireRole` route guard). If the stored token has expired (and
 * `automaticSilentRenew` hasn't caught up yet), attempts a silent renew via the
 * refresh token before giving up. Returns null when there is no session or the
 * renew fails — the single place the renew policy lives for both consumers.
 */
export async function getValidOidcUser(): Promise<User | null> {
  const user = await oidcUserManager.getUser();
  if (!user) return null;
  if (!user.expired) return user;
  try {
    return await oidcUserManager.signinSilent();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to renew OIDC session silently:", error);
    return null;
  }
}
