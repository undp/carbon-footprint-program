import { AppBar, Box, Button, Toolbar } from "@mui/material";
import { Link } from "@tanstack/react-router";
import { HuellaLatamLogo } from "@icons";
import React, { useMemo } from "react";

const PAGE_ROUTES = {
  ABOUT_US: "/about",
  TRANSPARENCY: "/transparency",
  CAPINAUT: "/capinaut",
} as const;

type PageRoute = (typeof PAGE_ROUTES)[keyof typeof PAGE_ROUTES];

const PAGE_ROUTES_TRANSLATIONS: Record<PageRoute, string> = {
  [PAGE_ROUTES.ABOUT_US]: "Sobre Huella Latam",
  [PAGE_ROUTES.TRANSPARENCY]: "Transparencia",
  [PAGE_ROUTES.CAPINAUT]: "Capinauta",
};

export const Header: React.FC = () => {
  const pages = useMemo(
    () =>
      Object.values(PAGE_ROUTES).map((route) => ({
        text: PAGE_ROUTES_TRANSLATIONS[route],
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
        <Button variant="contained">INICIAR SESIÓN</Button>
      </Toolbar>
    </AppBar>
  );
};
