import { alpha, type Theme } from "@mui/material/styles";

/**
 * Sky-blue opening of the brand gradient, before the navy veil. It is the only
 * hue of the gradient that no palette token holds, because it exists solely to
 * give the gradient its diagonal lift.
 */
const BRAND_GRADIENT_SKY = "#7FA9D9";

/**
 * Opacity of the navy veil laid over the brand gradient to lower its brightness
 * and keep the white text legible on top.
 *
 * At 0.5 the lightest point of the gradient resolves to ~#45699B, which reads
 * 5.4:1 against white — WCAG AA for body text with headroom, so a heading or a
 * paragraph may sit anywhere over the gradient. Lower it and the top-left
 * corner stops clearing 4.5:1.
 */
const BRAND_GRADIENT_OVERLAY_OPACITY = 0.5;

/**
 * Huella de Carbono RD brand gradient: the institutional blues running from a
 * sky opening down to the deep navy, with a navy veil on top.
 *
 * It is the background of every prominent public surface (landing, the
 * institutional page heros, the top band of the header and the alliance
 * banner), so it lives here to avoid repeating the literal on each screen.
 */
export const brandGradient = (theme: Theme): string => {
  const overlay = alpha(
    theme.palette.common.deepNavy,
    BRAND_GRADIENT_OVERLAY_OPACITY
  );

  return `linear-gradient(0deg, ${overlay} 0%, ${overlay} 100%), linear-gradient(120deg, ${BRAND_GRADIENT_SKY} 0%, ${theme.palette.primary.light} 52%, ${theme.palette.common.deepNavy} 100%)`;
};

/**
 * Dark navy surface gradient shared by the highlight stat cards and the "El
 * desafío" card, so the two dark surfaces stay in sync when the navy is
 * retuned.
 */
export const darkCardGradient = (theme: Theme): string =>
  `linear-gradient(150deg, ${theme.palette.common.deepNavy} 0%, ${theme.palette.common.deepNavyDark} 100%)`;
