import { FC } from "react";
import { Button } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { SystemRole } from "@repo/types";
import { useAuth } from "@/contexts";
import { Routes } from "@/interfaces";
import { PUBLIC_ACCESS_BUTTON_SX } from "./constants";

/**
 * Access action of the public header: an anonymous visitor signs in, and a
 * visitor with a session open gets a single shortcut to the surface that
 * matches their role.
 *
 * There is no sign-up button. `signUpRedirect` stays available on the auth
 * context for whatever surface takes registration on later.
 */
export const PublicHeaderAccess: FC = () => {
  const navigate = useNavigate();
  const { signInRedirect, user } = useAuth();

  const isAdmin =
    user?.role === SystemRole.ADMIN || user?.role === SystemRole.SUPERADMIN;

  if (user) {
    return (
      <Button
        variant="contained"
        onClick={() =>
          void navigate({ to: isAdmin ? Routes.ADMIN_DASHBOARD : Routes.HOME })
        }
        sx={PUBLIC_ACCESS_BUTTON_SX}
      >
        {isAdmin ? "Ir al admin" : "Ir al inicio"}
      </Button>
    );
  }

  return (
    <Button
      variant="contained"
      onClick={() => void signInRedirect(Routes.HOME)}
      sx={PUBLIC_ACCESS_BUTTON_SX}
    >
      Iniciar sesión
    </Button>
  );
};
