import { FC } from "react";
import { alpha, Box, Typography, useTheme } from "@mui/material";
import { BrandLockup } from "@/components/BrandLockup";
import { LANDING_COPY } from "../constants";
import { PilotEnvironmentBadge } from "./PilotEnvironmentBadge";

/** The landing's presentation column: pilot notice, brand and promise. */
export const LandingHero: FC = () => {
  const theme = useTheme();

  return (
    <Box className="flex flex-col items-start">
      <PilotEnvironmentBadge />
      <Typography
        component="p"
        color={alpha(theme.palette.common.white, 0.92)}
        sx={{
          mt: 5,
          fontSize: "clamp(1.25rem, 2.4vw, 2rem)",
          fontWeight: "fontWeightRegular",
        }}
      >
        {LANDING_COPY.welcome}
      </Typography>
      <Box sx={{ mt: 3 }}>
        <BrandLockup
          component="h1"
          contrast
          markHeight="clamp(72px, 8vw, 116px)"
          nameFontSize="clamp(1.75rem, 3.2vw, 2.625rem)"
          territoryFontSize="clamp(0.7rem, 1.15vw, 0.9375rem)"
          gap={2.5}
        />
      </Box>
      <Typography
        component="p"
        color={alpha(theme.palette.common.white, 0.94)}
        sx={{
          mt: 3,
          maxWidth: "44ch",
          fontSize: "clamp(1.0625rem, 1.7vw, 1.4375rem)",
          fontWeight: "fontWeightLight",
          lineHeight: 1.55,
        }}
      >
        {LANDING_COPY.tagline}
      </Typography>
    </Box>
  );
};
