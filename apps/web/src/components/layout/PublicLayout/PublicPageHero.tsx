import { FC, PropsWithChildren } from "react";
import { Box, useTheme } from "@mui/material";
import { LatamFootprintIcon } from "@/icons";
import { brandGradient } from "@/utils/brandGradient";
import {
  HERO_OVERLAP_BREATHING_ROOM,
  PUBLIC_CONTENT_MAX_WIDTH,
} from "./constants";

interface Props {
  /**
   * Píxeles que el contenido siguiente sube dentro del hero (las páginas cuyas
   * tarjetas de cifras se montan sobre su borde inferior). El relleno inferior
   * crece con este valor para que las tarjetas nunca tapen el texto.
   */
  overlappingContentOffset?: number;
}

/** Relleno inferior base del hero por breakpoint, en píxeles. */
const BASE_BOTTOM_PADDING = { xs: 40, md: 52, lg: 60 };

/**
 * Encabezado de las pantallas institucionales públicas: degradado de marca con
 * la huella decorativa a la derecha y el título de la página encima.
 */
export const PublicPageHero: FC<PropsWithChildren<Props>> = ({
  overlappingContentOffset = 0,
  children,
}) => {
  const theme = useTheme();

  const clearance = overlappingContentOffset + HERO_OVERLAP_BREATHING_ROOM;
  const bottomPadding = {
    xs: `${Math.max(BASE_BOTTOM_PADDING.xs, clearance)}px`,
    md: `${Math.max(BASE_BOTTOM_PADDING.md, clearance)}px`,
    lg: `${Math.max(BASE_BOTTOM_PADDING.lg, clearance)}px`,
  };

  return (
    <Box
      component="section"
      sx={{
        position: "relative",
        overflow: "hidden",
        background: brandGradient(theme),
      }}
    >
      <LatamFootprintIcon
        aria-hidden
        sx={{
          position: "absolute",
          right: "-3%",
          top: "50%",
          transform: "translateY(-50%)",
          width: "min(820px, 54%)",
          height: "auto",
          fill: theme.palette.common.white,
          opacity: 0.18,
          pointerEvents: "none",
          userSelect: "none",
        }}
      />
      <Box
        sx={{
          position: "relative",
          zIndex: 2,
          maxWidth: PUBLIC_CONTENT_MAX_WIDTH,
          mx: "auto",
          px: { xs: 2.5, md: 4, lg: 7 },
          pt: { xs: 5, md: 6.5, lg: 7.5 },
          pb: bottomPadding,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};
