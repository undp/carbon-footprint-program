import { FC } from "react";
import { Button, useTheme } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { SystemRole } from "@repo/types";
import { useAuth } from "@/contexts";
import { Routes } from "@/interfaces";

/**
 * Session action for the public header: signs in when there is no user and,
 * when there is one, takes them to the surface that matches their role.
 */
export const PublicHeaderSessionButton: FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { signInRedirect, user } = useAuth();

  const isAdmin =
    user?.role === SystemRole.ADMIN || user?.role === SystemRole.SUPERADMIN;

  const handleClick = () => {
    if (!user) {
      void signInRedirect();
      return;
    }

    void navigate({ to: isAdmin ? Routes.ADMIN_DASHBOARD : Routes.HOME });
  };

  const getLabel = () => {
    if (!user) return "Iniciar sesión";
    return isAdmin ? "Ir al admin" : "Ir al home";
  };

  return (
    <Button
      variant="contained"
      onClick={handleClick}
      sx={{
        backgroundColor: theme.palette.common.deepNavy,
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
