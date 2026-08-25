import { FC } from "react";
import { Button } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { SystemRole } from "@repo/types";
import { useAuth } from "@/contexts";
import { Routes } from "@/interfaces";
import { PUBLIC_ACCESS_BUTTON_SX } from "./constants";

/**
 * Access actions of the public header. An anonymous visitor gets the two doors
 * the platform has —registering a new organization and signing an existing one
 * in— and a visitor with a session open gets a single shortcut to the surface
 * that matches their role.
 */
export const PublicHeaderAccess: FC = () => {
  const navigate = useNavigate();
  const { signInRedirect, signUpRedirect, user } = useAuth();

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
        {isAdmin ? "Ir al admin" : "Ir al home"}
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outlined"
        onClick={() => void signUpRedirect(Routes.HOME)}
        sx={{
          ...PUBLIC_ACCESS_BUTTON_SX,
          borderWidth: 1.5,
          "&:hover": { borderWidth: 1.5 },
        }}
      >
        Registrarse
      </Button>
      <Button
        variant="contained"
        onClick={() => void signInRedirect(Routes.HOME)}
        sx={PUBLIC_ACCESS_BUTTON_SX}
      >
        Iniciar sesión
      </Button>
    </>
  );
};
