import { FC, useMemo } from "react";
import { AppBar, Box, Button, Toolbar, useTheme } from "@mui/material";
import { Link } from "@tanstack/react-router";
import { HuellaLatamLogo } from "@/icons";
import {
  LandingHeaderRoutes,
  LandingHeaderRoutesTranslations,
} from "@/interfaces";

export const Header: FC = () => {
  const theme = useTheme();

  const pages = useMemo(
    () =>
      Object.values(LandingHeaderRoutes).map((route) => ({
        text: LandingHeaderRoutesTranslations[route],
        route,
      })),
    []
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
              className="text-white no-underline font-medium text-[16px] "
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
        >
          INICIAR SESIÓN
        </Button>
      </Toolbar>
    </AppBar>
  );
};
