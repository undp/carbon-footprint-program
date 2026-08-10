import { FC } from "react";
import { alpha, Box, Typography, useTheme } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";

interface Props {
  value: string;
  label: string;
  /** Ícono decorativo que se asoma en la esquina inferior derecha. */
  WatermarkIcon?: SvgIconComponent;
}

/**
 * Tarjeta oscura con una cifra destacada. Se usa en las bandas de cifras de
 * "Sobre la iniciativa" y "Agradecimientos".
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
        background: `linear-gradient(150deg, ${theme.palette.common.deepForest} 0%, ${theme.palette.common.deepForestDark} 100%)`,
        border: `1px solid ${alpha(theme.palette.common.mint, 0.28)}`,
        borderRadius: 4,
        px: 3.25,
        py: 3,
        boxShadow: `0 14px 34px ${alpha(theme.palette.common.deepForestDark, 0.24)}`,
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
            color: theme.palette.common.mint,
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
            color: theme.palette.common.mint,
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
