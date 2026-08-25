import { FC } from "react";
import { alpha, Box, Typography, useTheme } from "@mui/material";
import { ABOUT_HERO } from "../constants";

/** Header of "Sobre la iniciativa": badge, title and lead. */
export const AboutHero: FC = () => {
  const theme = useTheme();

  return (
    <>
      <Box
        className="inline-block rounded-full"
        sx={{
          px: 2,
          py: 0.875,
          mb: 2.75,
          backgroundColor: alpha(theme.palette.common.white, 0.85),
        }}
      >
        <Typography
          component="span"
          sx={{
            fontSize: 11.5,
            fontWeight: "fontWeightBold",
            letterSpacing: "1.8px",
            textTransform: "uppercase",
            color: theme.palette.common.deepNavyDark,
          }}
        >
          {ABOUT_HERO.badge}
        </Typography>
      </Box>
      <Typography
        variant="h2"
        component="h1"
        color={theme.palette.common.white}
        sx={{
          fontWeight: "fontWeightBold",
          fontSize: { xs: "2.5rem", md: "3.25rem", lg: "3.875rem" },
          letterSpacing: "-1.6px",
          lineHeight: 1.03,
          mb: 2.25,
        }}
      >
        {ABOUT_HERO.title}
      </Typography>
      <Typography
        variant="subtitle1"
        component="p"
        fontWeight="fontWeightLight"
        color={alpha(theme.palette.common.white, 0.95)}
        sx={{ fontSize: 18, lineHeight: 1.7, maxWidth: 760 }}
      >
        {ABOUT_HERO.lead}
      </Typography>
    </>
  );
};
