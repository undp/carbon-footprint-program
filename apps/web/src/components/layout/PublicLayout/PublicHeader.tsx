import { FC } from "react";
import { alpha, AppBar, Box, Divider, Toolbar, useTheme } from "@mui/material";
import { Link } from "@tanstack/react-router";
import { HuellaLatamLogo } from "@/icons";
import { Routes } from "@/interfaces";
import { brandGradient } from "@/utils/brandGradient";
import { PartnerLockupStrip } from "./PartnerLockupStrip";
import { PublicHeaderNav } from "./PublicHeaderNav";
import { PublicHeaderSessionButton } from "./PublicHeaderSessionButton";
import {
  PUBLIC_HEADER_ACCENT_BAR_HEIGHT,
  PUBLIC_HEADER_LOGO_HEIGHT,
  PUBLIC_HEADER_LOGO_WIDTH,
  PUBLIC_HEADER_PARTNERS,
} from "./constants";

/**
 * Header shared by all public screens: brand band, wordmark, institutional
 * navigation, partners and session access.
 */
export const PublicHeader: FC = () => {
  const theme = useTheme();

  return (
    <AppBar
      position="sticky"
      color="transparent"
      elevation={0}
      sx={{ backgroundColor: theme.palette.common.white }}
    >
      <Box
        sx={{
          height: PUBLIC_HEADER_ACCENT_BAR_HEIGHT,
          background: brandGradient(theme),
        }}
      />
      <Toolbar
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: { xs: 2, md: 3, lg: 4 },
          px: { xs: 2.5, md: 4, lg: 7 },
          py: 1.5,
          backgroundColor: theme.palette.common.white,
          borderBottom: `1px solid ${theme.palette.divider}`,
          boxShadow: `0 2px 14px ${alpha(theme.palette.common.deepNavyDark, 0.1)}`,
        }}
      >
        <Link
          to={Routes.LANDING}
          aria-label="Ir al inicio de Huella Latam"
          className="flex shrink-0 items-center"
        >
          <HuellaLatamLogo
            sx={{
              width: PUBLIC_HEADER_LOGO_WIDTH,
              height: PUBLIC_HEADER_LOGO_HEIGHT,
            }}
          />
        </Link>

        {/* `mr-auto` pushes the partners block to the far right while they
            fit on the same row; when they don't fit, the Toolbar drops them
            all to a second row instead of breaking the navigation. */}
        <Box className="mr-auto flex min-w-0 shrink md:shrink-0">
          <PublicHeaderNav />
        </Box>

        <Box className="flex flex-wrap items-center gap-4 md:shrink-0 lg:gap-5">
          <PartnerLockupStrip
            items={PUBLIC_HEADER_PARTNERS}
            captionColor={theme.palette.text.secondary}
            dividerHeight={32}
            gap={1.75}
          />
          <Divider
            orientation="vertical"
            flexItem
            sx={{ height: 32, alignSelf: "center" }}
          />
          <PublicHeaderSessionButton />
        </Box>
      </Toolbar>
    </AppBar>
  );
};
