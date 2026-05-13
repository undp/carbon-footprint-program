import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { enqueueSnackbar } from "notistack";
import { LandingScreen } from "@screens";

type LandingSearch = {
  authError?: "login_failed";
};

export const Route = createFileRoute("/")({
  // Accept only the known authError flag from requireRole's redirect;
  // ignore any other query params so the URL contract stays narrow.
  validateSearch: (search: Record<string, unknown>): LandingSearch => {
    if (search.authError === "login_failed") {
      return { authError: "login_failed" };
    }
    return {};
  },
  component: LandingRoute,
});

function LandingRoute() {
  const { authError } = Route.useSearch();
  const navigate = useNavigate();

  // Surface the error snackbar when the route guard redirected here
  // after a /users/me failure, then strip the param so a refresh
  // doesn't re-trigger the message.
  useEffect(() => {
    if (authError !== "login_failed") return;
    enqueueSnackbar("Ocurrió un problema al iniciar sesión", {
      variant: "error",
    });
    void navigate({ to: "/", search: {}, replace: true });
  }, [authError, navigate]);

  return <LandingScreen />;
}
