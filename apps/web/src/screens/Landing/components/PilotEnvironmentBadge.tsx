import { FC } from "react";
import { ScienceOutlined } from "@mui/icons-material";
import { alpha, Box, Typography, darken, useTheme } from "@mui/material";

/**
 * Yellow badge that marks the pilot environment: the platform is open to
 * organizations, but the recognitions system is still being trialled.
 */
export const PilotEnvironmentBadge: FC = () => {
  const theme = useTheme();

  // The yellow is far too light to carry white text, so the label and the icon
  // are set in a near-black tone of the same hue (10.5:1).
  const labelColor = darken(theme.palette.common.sunflower, 0.8);

  return (
    <Box
      className="inline-flex items-center gap-2.5 rounded-full"
      sx={{
        px: 2.25,
        py: 1,
        backgroundColor: theme.palette.common.sunflower,
        boxShadow: `0 4px 14px ${alpha(theme.palette.common.black, 0.18)}`,
      }}
    >
      <ScienceOutlined sx={{ fontSize: 16, color: labelColor }} />
      <Typography
        component="span"
        sx={{
          fontSize: 12,
          fontWeight: "fontWeightBold",
          letterSpacing: "1.7px",
          textTransform: "uppercase",
          color: labelColor,
        }}
      >
        Ambiente piloto
      </Typography>
    </Box>
  );
};
