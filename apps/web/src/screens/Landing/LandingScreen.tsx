import { FC } from "react";
import { Box, useTheme } from "@mui/material";
import {
  BrandWatermark,
  PublicFooter,
  PublicHeader,
  PUBLIC_CONTENT_MAX_WIDTH,
} from "@/components/layout";
import { brandGradient } from "@/utils/brandGradient";
import { LandingHero } from "./components/LandingHero";
import { LandingOptions } from "./components/LandingOptions";

export const LandingScreen: FC = () => {
  const theme = useTheme();

  return (
    <Box className="flex min-h-screen flex-col">
      <PublicHeader />

      <Box
        component="main"
        className="relative flex flex-1 items-center overflow-hidden"
        sx={{ background: brandGradient(theme) }}
      >
        <BrandWatermark width="min(560px, 40%)" right="-3%" />

        <Box
          sx={{
            position: "relative",
            zIndex: 2,
            width: "100%",
            maxWidth: PUBLIC_CONTENT_MAX_WIDTH,
            mx: "auto",
            px: { xs: 2.5, md: 4, lg: 7 },
            py: { xs: 6, md: 8 },
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(400px, 100%), 1fr))",
            gap: { xs: 5, md: 8, lg: 9 },
            alignItems: "center",
          }}
        >
          <LandingHero />
          <LandingOptions />
        </Box>
      </Box>

      <PublicFooter />
    </Box>
  );
};
