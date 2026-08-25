import { FC } from "react";
import { Box, useTheme } from "@mui/material";
import {
  BrandWatermark,
  PublicHeader,
  PUBLIC_CONTENT_MAX_WIDTH,
} from "@/components/layout";
import { brandGradient } from "@/utils/brandGradient";
import { CreateInventoryOptions } from "./components/CreateInventoryOptions";
import { LandingFooter } from "./components/LandingFooter";
import { LandingHero } from "./components/LandingHero";

export const LandingScreen: FC = () => {
  const theme = useTheme();

  return (
    <Box
      className="flex min-h-screen flex-col"
      sx={{ background: brandGradient(theme) }}
    >
      <PublicHeader />

      <Box
        component="main"
        className="relative flex flex-1 items-center overflow-hidden"
      >
        <BrandWatermark width="min(1000px, 68%)" right="-4%" />

        <Box
          sx={{
            position: "relative",
            zIndex: 2,
            width: "100%",
            maxWidth: PUBLIC_CONTENT_MAX_WIDTH,
            mx: "auto",
            px: { xs: 2.5, md: 4, lg: 7 },
            pt: { xs: 6, md: 8, lg: 9 },
            pb: 8,
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(380px, 100%), 1fr))",
            gap: { xs: 5, md: 8, lg: 11 },
            alignItems: "center",
          }}
        >
          <LandingHero />
          <CreateInventoryOptions />
        </Box>
      </Box>

      <LandingFooter />
    </Box>
  );
};
