import { FC } from "react";
import { WarningAmberRounded } from "@mui/icons-material";
import { alpha, Box, Typography, darken, useTheme } from "@mui/material";

/** Distintivo amarillo que identifica el ambiente de demostración. */
export const DemoEnvironmentBadge: FC = () => {
  const theme = useTheme();

  return (
    <Box
      className="inline-flex items-center gap-2.5 rounded-full"
      sx={{
        px: 2,
        py: 0.875,
        backgroundColor: theme.palette.common.sunflower,
        boxShadow: `0 4px 14px ${alpha(theme.palette.common.black, 0.18)}`,
      }}
    >
      <WarningAmberRounded
        sx={{
          fontSize: 15,
          color: darken(theme.palette.common.sunflower, 0.8),
        }}
      />
      <Typography
        component="span"
        sx={{
          fontSize: 11.5,
          fontWeight: "fontWeightBold",
          letterSpacing: "1.6px",
          textTransform: "uppercase",
          color: darken(theme.palette.common.sunflower, 0.8),
        }}
      >
        Ambiente demo
      </Typography>
    </Box>
  );
};
