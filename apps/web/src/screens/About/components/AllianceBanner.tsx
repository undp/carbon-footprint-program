import { FC } from "react";
import { alpha, Box, Typography, useTheme } from "@mui/material";
import { HuellaLatamLogo } from "@/icons";
import { brandGradient } from "@/utils/brandGradient";
import { ALLIANCE_BANNER_TEXT } from "../constants";

/** Opening banner of "Una alianza regional". */
export const AllianceBanner: FC = () => {
  const theme = useTheme();

  return (
    <Box
      className="relative flex flex-wrap items-center gap-10 overflow-hidden"
      sx={{
        borderRadius: 4,
        px: 4.5,
        py: 4,
        mb: 2.25,
        background: brandGradient(theme),
        boxShadow: `0 16px 38px ${alpha(theme.palette.common.deepForestDark, 0.14)}`,
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          right: -80,
          top: -90,
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(theme.palette.common.white, 0.34)} 0%, ${alpha(theme.palette.common.white, 0)} 70%)`,
        }}
      />
      <HuellaLatamLogo
        contrast
        sx={{
          position: "relative",
          zIndex: 2,
          flexShrink: 0,
          width: 122,
          height: 52,
        }}
      />
      <Typography
        component="p"
        fontWeight="fontWeightLight"
        sx={{
          position: "relative",
          zIndex: 2,
          flex: 1,
          minWidth: { xs: 0, md: 320 },
          fontSize: 17,
          lineHeight: 1.6,
          color: theme.palette.common.white,
        }}
      >
        {ALLIANCE_BANNER_TEXT}
      </Typography>
    </Box>
  );
};
