import { FC, useCallback } from "react";
import { AppBar, Box, Button, Toolbar, useTheme } from "@mui/material";
import { Link, useNavigate } from "@tanstack/react-router";
import { HuellaLatamLogo } from "@/icons";
import {
  LandingHeaderRoutes,
  LandingHeaderRoutesTranslations,
} from "@/interfaces";
import { Route as SignInRoute } from "@/routes/auth/sign-in";

const pages = Object.values(LandingHeaderRoutes).map((route) => ({
  text: LandingHeaderRoutesTranslations[route],
  route,
}));

export const Header: FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const onClickSignIn = useCallback(
    () => void navigate({ to: SignInRoute.to }),
    [navigate]
  );

  return (
    <AppBar color="transparent" elevation={0} position="static">
      <Toolbar className="px-6 py-4">
        <HuellaLatamLogo
          sx={{
            width: 116,
            height: 50,
            mr: 5,
          }}
          contrast
        />
        <Box className="flex flex-1 gap-12">
          {pages.map((page) => (
            <Link
              className="text-base font-medium text-white no-underline"
              key={page.route}
              to={page.route}
            >
              {page.text}
            </Link>
          ))}
        </Box>
        <Button
          sx={{ backgroundColor: theme.palette.common.deepForest }}
          variant="contained"
          onClick={onClickSignIn}
        >
          INICIAR SESIÓN
        </Button>
      </Toolbar>
    </AppBar>
  );
};
