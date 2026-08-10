import { FC, useCallback } from "react";
import { Button, useTheme } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { SystemRole } from "@repo/types";
import { useAuth } from "@/contexts";
import { Routes } from "@/interfaces";

/**
 * Acción de sesión del header público: inicia sesión cuando no hay usuario y,
 * cuando lo hay, lleva a la superficie que le corresponde según su rol.
 */
export const PublicHeaderSessionButton: FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { signInRedirect, user } = useAuth();

  const isAdmin =
    user?.role === SystemRole.ADMIN || user?.role === SystemRole.SUPERADMIN;

  const handleClick = useCallback(() => {
    if (!user) {
      void signInRedirect();
      return;
    }

    void navigate({ to: isAdmin ? Routes.ADMIN_DASHBOARD : Routes.HOME });
  }, [isAdmin, navigate, signInRedirect, user]);

  const getLabel = () => {
    if (!user) return "Iniciar sesión";
    return isAdmin ? "Ir al admin" : "Ir al home";
  };

  return (
    <Button
      variant="contained"
      onClick={handleClick}
      sx={{
        backgroundColor: theme.palette.common.deepForest,
        borderRadius: 1.25,
        px: 2.5,
        py: 1.25,
        fontSize: 12.5,
        letterSpacing: "1.1px",
        whiteSpace: "nowrap",
      }}
    >
      {getLabel()}
    </Button>
  );
};
