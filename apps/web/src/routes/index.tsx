import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { enqueueSnackbar } from "notistack";
import { z } from "zod";
import { LandingScreen } from "@screens";

// Accept only the known authError flag from requireRole's redirect;
// `.catch(undefined)` silently drops unexpected values so the URL
// contract stays narrow and a refresh with garbage params doesn't break.
const landingSearchSchema = z.object({
  authError: z.literal("login_failed").optional().catch(undefined),
});

export const Route = createFileRoute("/")({
  validateSearch: landingSearchSchema,
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
