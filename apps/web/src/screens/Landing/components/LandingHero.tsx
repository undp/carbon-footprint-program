import { FC } from "react";
import { alpha, Box, Typography, useTheme } from "@mui/material";
import { VOCAB } from "@/config/vocab";
import { DemoEnvironmentBadge } from "./DemoEnvironmentBadge";
import { DemoNoticeCard } from "./DemoNoticeCard";

/** The landing's presentation column: brand, promise and demo notice. */
export const LandingHero: FC = () => {
  const theme = useTheme();

  return (
    <Box className="flex flex-col items-start">
      <Box sx={{ mb: 3.25 }}>
        <DemoEnvironmentBadge />
      </Box>
      <Typography
        variant="h5"
        component="p"
        fontWeight="fontWeightLight"
        color={alpha(theme.palette.common.white, 0.9)}
        sx={{ mb: 1.25 }}
      >
        Te damos la bienvenida a
      </Typography>
      <Typography
        variant="h2"
        component="h1"
        color={theme.palette.common.white}
        sx={{
          fontWeight: "fontWeightBold",
          fontSize: { xs: "3rem", md: "4.25rem", lg: "4.875rem" },
          letterSpacing: "-2px",
          lineHeight: 1,
          mb: 2.75,
        }}
      >
        Huella Latam
      </Typography>
      <Typography
        variant="h6"
        component="p"
        fontWeight="fontWeightLight"
        color={alpha(theme.palette.common.white, 0.92)}
        sx={{ maxWidth: 520, lineHeight: 1.55 }}
      >
        {`Mide, reporta y toma acción sobre tu huella de carbono ${VOCAB.organization.relationalAdjective}.`}
      </Typography>
      <Box sx={{ mt: 4.75, width: "100%" }}>
        <DemoNoticeCard />
      </Box>
    </Box>
  );
};
