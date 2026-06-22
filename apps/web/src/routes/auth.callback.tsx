import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth as useOidcAuth } from "react-oidc-context";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { Routes } from "@/interfaces";

/**
 * Public OIDC redirect target. `react-oidc-context` (mounted in __root against
 * the shared UserManager) automatically completes the Authorization Code + PKCE
 * exchange when this page loads with `?code&state`. We just wait for the session
 * to settle, then land on HOME — parity with the previous MSAL behavior (always
 * `/app/home`; returning to the originating deep-link is intentionally not done).
 *
 * Resolving here, OUTSIDE the `/app` and `/admin` layouts, guarantees no role
 * guard runs before the session exists. On failure we bounce to Landing with the
 * same `authError` signal the `/users/me` recovery path uses.
 */
function AuthCallbackComponent() {
  const oidc = useOidcAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (oidc.isAuthenticated) {
      void navigate({ to: Routes.HOME });
      return;
    }
    if (!oidc.isLoading && oidc.error) {
      void navigate({ to: "/", search: { authError: "login_failed" } });
    }
  }, [oidc.isAuthenticated, oidc.isLoading, oidc.error, navigate]);

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
