import { FC } from "react";
import { alpha, Box, Typography, useTheme } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import { darkCardGradient } from "@/utils/brandGradient";

interface Props {
  value: string;
  label: string;
  /** Decorative icon that peeks out from the bottom-right corner. */
  WatermarkIcon?: SvgIconComponent;
}

/**
 * Dark card with a highlight figure. Used in the stats bands of
 * "Sobre la iniciativa" and "Agradecimientos".
 */
export const HighlightStatCard: FC<Props> = ({
  value,
  label,
  WatermarkIcon,
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        background: darkCardGradient(theme),
        border: `1px solid ${alpha(theme.palette.common.softLeaf, 0.28)}`,
        borderRadius: 4,
        px: 3.25,
        py: 3,
        boxShadow: `0 14px 34px ${alpha(theme.palette.common.deepNavyDark, 0.24)}`,
      }}
    >
      {WatermarkIcon && (
        <WatermarkIcon
          aria-hidden
          sx={{
            position: "absolute",
            right: -16,
            bottom: -16,
            fontSize: 104,
            color: theme.palette.common.softLeaf,
            opacity: 0.16,
          }}
        />
      )}
      <Box sx={{ position: "relative", zIndex: 2 }}>
        <Typography
          component="b"
          sx={{
            display: "block",
            fontSize: 40,
            fontWeight: "fontWeightBold",
            lineHeight: 1,
            letterSpacing: "-1.8px",
            color: theme.palette.common.softLeaf,
            mb: 1,
          }}
        >
          {value}
        </Typography>
        <Typography
          component="span"
          sx={{
            display: "block",
            maxWidth: 200,
            fontSize: 12.5,
            fontWeight: "fontWeightMedium",
            lineHeight: 1.5,
            color: alpha(theme.palette.common.white, 0.86),
          }}
        >
          {label}
        </Typography>
      </Box>
    </Box>
  );
};
