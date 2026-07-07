import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { enqueueSnackbar } from "notistack";
import { z } from "zod";
import { LandingScreen } from "@screens";
import { getApiErrorMessageFromCode } from "@/utils/getApiErrorMessage";

// Accept only the known authError flag from requireRole's redirect;
// `.catch(undefined)` silently drops unexpected values so the URL
// contract stays narrow and a refresh with garbage params doesn't break.
const landingSearchSchema = z.object({
  authError: z.literal("login_failed").optional().catch(undefined),
  // API error code forwarded by requireRole so we can show specific copy
  // (e.g. EMAIL_REGISTERED_UNDER_DIFFERENT_IDENTITY) instead of the generic one.
  authErrorCode: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/")({
  validateSearch: landingSearchSchema,
  component: LandingRoute,
});

function LandingRoute() {
  const { authError, authErrorCode } = Route.useSearch();
  const navigate = useNavigate();

  // Surface the error snackbar when the route guard redirected here
  // after a /users/me failure, then strip the params so a refresh
  // doesn't re-trigger the message. The specific copy is derived from the
  // forwarded API error code, falling back to the generic message.
  useEffect(() => {
    if (authError !== "login_failed") return;
    enqueueSnackbar(
      getApiErrorMessageFromCode(
        authErrorCode,
        "Ocurrió un problema al iniciar sesión"
      ),
      { variant: "error" }
    );
    void navigate({ to: "/", search: {}, replace: true });
  }, [authError, authErrorCode, navigate]);

  return <LandingScreen />;
}
