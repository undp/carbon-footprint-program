import { alpha, type Theme } from "@mui/material/styles";

/**
 * Opacity of the dark green veil laid over the brand gradient to lower its
 * brightness and keep the white text legible on top.
 */
const BRAND_GRADIENT_OVERLAY_OPACITY = 0.32;

/**
 * Huella Latam brand gradient: the palette's green → aqua gradient with a dark
 * green veil on top.
 *
 * It is the background of every prominent public surface (landing, the
 * institutional page heros, the top band of the header and the alliance
 * banner), so it lives here to avoid repeating the literal on each screen.
 */
export const brandGradient = (theme: Theme): string => {
  const overlay = alpha(
    theme.palette.common.deepForest,
    BRAND_GRADIENT_OVERLAY_OPACITY
  );

  return `linear-gradient(0deg, ${overlay} 0%, ${overlay} 100%), linear-gradient(293deg, ${theme.palette.common.brightGreen} 0%, ${theme.palette.secondary.main} 100%)`;
};

/**
 * Dark green surface gradient shared by the highlight stat cards and the "El
 * desafío" regional card, so the two dark surfaces stay in sync when the
 * green is retuned.
 */
export const darkCardGradient = (theme: Theme): string =>
  `linear-gradient(150deg, ${theme.palette.common.deepForest} 0%, ${theme.palette.common.deepForestDark} 100%)`;
