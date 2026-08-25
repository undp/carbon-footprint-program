import { FC } from "react";
import { alpha, AppBar, Box, Toolbar, useTheme } from "@mui/material";
import { Link } from "@tanstack/react-router";
import { BrandLockup } from "@/components/BrandLockup";
import { BRAND } from "@/config/brand";
import { Routes } from "@/interfaces";
import { PublicHeaderAccess } from "./PublicHeaderAccess";
import { PublicHeaderNav } from "./PublicHeaderNav";
import {
  PUBLIC_CONTENT_MAX_WIDTH,
  PUBLIC_HEADER_MARK_HEIGHT,
  PUBLIC_HEADER_NAME_FONT_SIZE,
  PUBLIC_HEADER_TERRITORY_FONT_SIZE,
} from "./constants";

/**
 * Header shared by all public screens: brand lockup, institutional navigation
 * and the doors into the platform.
 */
export const PublicHeader: FC = () => {
  const theme = useTheme();

  return (
    <AppBar
      position="sticky"
      color="transparent"
      elevation={0}
      sx={{
        backgroundColor: theme.palette.common.white,
        boxShadow: `0 1px 4px ${alpha(theme.palette.common.deepNavyDark, 0.12)}`,
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: { xs: 2, md: 3, lg: 4 },
          width: "100%",
          maxWidth: PUBLIC_CONTENT_MAX_WIDTH,
          mx: "auto",
          px: { xs: 2.5, md: 4, lg: 7 },
          py: 1.5,
        }}
      >
        <Link
          to={Routes.LANDING}
          aria-label={`Ir al inicio de ${BRAND.name}`}
          className="flex shrink-0 items-center"
        >
          <BrandLockup
            markHeight={PUBLIC_HEADER_MARK_HEIGHT}
            nameFontSize={PUBLIC_HEADER_NAME_FONT_SIZE}
            territoryFontSize={PUBLIC_HEADER_TERRITORY_FONT_SIZE}
          />
        </Link>

        {/* `mr-auto` pushes the access buttons to the far right while they fit
            on the same row; when they don't fit, the Toolbar drops them to a
            second row instead of breaking the navigation. */}
        <Box className="mr-auto flex min-w-0 shrink md:shrink-0">
          <PublicHeaderNav />
        </Box>

        <Box className="flex flex-wrap items-center gap-2.5 md:shrink-0">
          <PublicHeaderAccess />
        </Box>
      </Toolbar>
    </AppBar>
  );
};
