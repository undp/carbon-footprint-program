import { FC, useCallback } from "react";
import { AppBar, Box, Button, Toolbar, useTheme } from "@mui/material";
import { Link, useNavigate } from "@tanstack/react-router";
import { HuellaLatamLogo } from "@/icons";
import {
  LandingHeaderRoutes,
  LandingHeaderRoutesTranslations,
  Routes,
} from "@/interfaces";
import { IS_DEMO } from "@/config/environment";
import { useAuth } from "../../../contexts";
import { SystemRole } from "@repo/types";

const pages = Object.values(LandingHeaderRoutes).map((route) => ({
  text: LandingHeaderRoutesTranslations[route],
  route,
}));

export const Header: FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { signInRedirect, user } = useAuth();

  const imAdmin =
    user?.role === SystemRole.ADMIN || user?.role === SystemRole.SUPERADMIN;

  const navigateToHome = useCallback(() => {
    void navigate({ to: Routes.HOME });
  }, [navigate]);

  const navigateToAdmin = useCallback(() => {
    void navigate({ to: Routes.ADMIN_DASHBOARD });
  }, [navigate]);

  const handleSignInClick = useCallback(() => {
    void signInRedirect();
  }, [signInRedirect]);

  return (
    <AppBar color="transparent" elevation={0} position="static">
      <Toolbar className="px-6 py-4">
        <Box
          onClick={() => void navigate({ to: "/" })}
          sx={{ cursor: "pointer", display: "flex", alignItems: "center" }}
        >
          <HuellaLatamLogo
            sx={{
              width: 116,
              height: 50,
              mr: 5,
            }}
            contrast
          />
        </Box>
        <Box className="flex flex-1 gap-12">
          {!IS_DEMO &&
            pages.map((page) => (
              <Link
                className="text-base font-medium text-white no-underline"
                key={page.route}
                to={page.route}
              >
                {page.text}
              </Link>
            ))}
        </Box>
        {user ? (
          <Box className="flex gap-4">
            {imAdmin && (
              <Button
                sx={{ backgroundColor: theme.palette.common.deepForest }}
                variant="contained"
                onClick={navigateToAdmin}
              >
                IR AL ADMIN
              </Button>
            )}
            {!imAdmin && (
              <Button
                sx={{ backgroundColor: theme.palette.common.deepForest }}
                variant="contained"
                onClick={navigateToHome}
              >
                IR AL HOME
              </Button>
            )}
          </Box>
        ) : (
          <Button
            sx={{ backgroundColor: theme.palette.common.deepForest }}
            variant="contained"
            onClick={handleSignInClick}
          >
            INICIAR SESIÓN
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};
