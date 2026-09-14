import { FC } from "react";
import { alpha, Box, Typography, useTheme } from "@mui/material";
import { darkCardGradient } from "@/utils/brandGradient";
import {
  ACTIVE_PROGRAM_COUNTRIES,
  REGIONAL_OPPORTUNITY_CARD,
} from "../constants";

/**
 * Dark "El desafío" card: the countries with an active program and why a
 * shared regional solution makes the whole cycle cheaper.
 */
export const RegionalOpportunityCard: FC = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        borderRadius: 4,
        px: 3.75,
        py: 3.5,
        background: darkCardGradient(theme),
      }}
    >
      <Typography
        component="span"
        sx={{
          fontSize: 10.5,
          fontWeight: "fontWeightBold",
          letterSpacing: "1.4px",
          textTransform: "uppercase",
          color: theme.palette.common.mint,
          mb: 1.75,
        }}
      >
        {REGIONAL_OPPORTUNITY_CARD.overline}
      </Typography>

      <Box className="flex flex-col gap-2.5" sx={{ mb: 2.5 }}>
        {ACTIVE_PROGRAM_COUNTRIES.map((country) => (
          <Box
            key={country}
            className="flex items-center justify-between gap-3.5"
            sx={{
              px: 1.75,
              py: 1.25,
              borderRadius: 2.25,
              backgroundColor: alpha(theme.palette.common.mint, 0.13),
              border: `1px solid ${alpha(theme.palette.common.mint, 0.24)}`,
            }}
          >
            <Typography
              component="span"
              sx={{
                fontSize: 14,
                fontWeight: "fontWeightMedium",
                color: theme.palette.common.white,
              }}
            >
              {country}
            </Typography>
            <Typography
              component="span"
              sx={{
                fontSize: 11,
                fontWeight: "fontWeightBold",
                letterSpacing: "1px",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                color: theme.palette.common.mint,
              }}
            >
              {REGIONAL_OPPORTUNITY_CARD.countryStatusLabel}
            </Typography>
          </Box>
        ))}
      </Box>

      <Typography
        variant="body2"
        sx={{
          fontSize: 14,
          lineHeight: 1.7,
          mt: "auto",
          color: alpha(theme.palette.common.white, 0.86),
        }}
      >
        {REGIONAL_OPPORTUNITY_CARD.footnote}
      </Typography>
    </Box>
  );
};
