import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useAuth as useOidcAuth } from "react-oidc-context";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { Routes } from "@/interfaces";
import type { OidcSignInState } from "@/contexts/AuthContext";

/**
 * Public OIDC redirect target — the single landing point of the login flow and
 * the only place that resolves it. Domain-agnostic: it restores the session and
 * navigates to the generic `returnTo` carried in `user.state`; it knows nothing
 * about what the user was doing. The post-login action (e.g. claiming a draft)
 * lives in the domain route `returnTo` points at.
 *
 * Resolving here, OUTSIDE the `/app` and `/admin` layouts, guarantees no role
 * guard runs before the session exists.
 *
 * - Success: navigate to the `returnTo` carried in `user.state`, else HOME.
 *   `returnTo` is app-generated (built via the router, never user input) and
 *   `navigate({ to })` only targets internal routes, so it isn't exploitable
 *   today; we still assert it's an internal path (`isSafeInternalPath`) as
 *   defense-in-depth, since it round-trips through the IdP and localStorage.
 * - Error / cancel / no session+params: go to Landing (with `authError` on a
 *   real error so Landing shows the snackbar). Also closes the no-params
 *   infinite-spinner gap.
 */
/**
 * Only follow an app-internal path. Rejects absolute and protocol-relative URLs
 * (`https://evil.com`, `//evil.com`) so a future refactor that forwarded
 * `returnTo` to `window.location` couldn't become an open redirect.
 */
const isSafeInternalPath = (path?: string): path is string =>
  !!path && /^\/(?!\/)/.test(path);

function AuthCallbackComponent() {
  const oidc = useOidcAuth();
  const navigate = useNavigate();
  // Resolve exactly once: the effect re-runs as the OIDC state settles.
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;

    if (oidc.isAuthenticated) {
      handledRef.current = true;
      const state = oidc.user?.state as OidcSignInState | undefined;
      const returnTo = state?.returnTo;
      void navigate({
        to: isSafeInternalPath(returnTo) ? returnTo : Routes.HOME,
      });
      return;
    }

    // Still completing the code exchange — keep the spinner.
    if (oidc.isLoading) return;

    // Terminal, non-success: auth error, cancellation, or no session/params.
    handledRef.current = true;
    void navigate({
      to: Routes.LANDING,
      search: oidc.error ? { authError: "login_failed" } : undefined,
    });
  }, [oidc.isAuthenticated, oidc.isLoading, oidc.error, oidc.user, navigate]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CircularProgress />
    </Box>
  );
}

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackComponent,
});
