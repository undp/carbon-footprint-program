import { FC } from "react";
import { alpha, Typography, useTheme } from "@mui/material";
import { ACKNOWLEDGEMENTS_HERO } from "../constants";

/** Encabezado de "Agradecimientos". */
export const AcknowledgementsHero: FC = () => {
  const theme = useTheme();

  return (
    <>
      <Typography
        variant="h2"
        component="h1"
        color={theme.palette.common.white}
        sx={{
          fontWeight: "fontWeightBold",
          fontSize: { xs: "2.375rem", md: "3rem", lg: "3.625rem" },
          letterSpacing: "-1.4px",
          lineHeight: 1.05,
          mb: 2.25,
        }}
      >
        {ACKNOWLEDGEMENTS_HERO.title}
      </Typography>
      <Typography
        component="p"
        fontWeight="fontWeightLight"
        color={alpha(theme.palette.common.white, 0.94)}
        sx={{ fontSize: 17, lineHeight: 1.7, maxWidth: 820 }}
      >
        {ACKNOWLEDGEMENTS_HERO.lead}
      </Typography>
    </>
  );
};
