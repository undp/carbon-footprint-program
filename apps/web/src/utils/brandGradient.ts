import { alpha, type Theme } from "@mui/material/styles";

/**
 * Opacidad del velo verde oscuro que se superpone al degradado de marca para
 * bajarle el brillo y dejar el texto blanco legible encima.
 */
const BRAND_GRADIENT_OVERLAY_OPACITY = 0.32;

/**
 * Degradado de marca de Huella Latam: el degradado verde → aqua de la paleta
 * con un velo verde oscuro encima.
 *
 * Es el fondo de todas las superficies públicas destacadas (landing, heros de
 * las páginas institucionales, franja superior del header y banner de la
 * alianza), así que vive acá para que no se repita el literal en cada pantalla.
 */
export const brandGradient = (theme: Theme): string => {
  const overlay = alpha(
    theme.palette.common.deepForest,
    BRAND_GRADIENT_OVERLAY_OPACITY
  );

  return `linear-gradient(0deg, ${overlay} 0%, ${overlay} 100%), linear-gradient(293deg, ${theme.palette.common.brightGreen} 0%, ${theme.palette.secondary.main} 100%)`;
};
