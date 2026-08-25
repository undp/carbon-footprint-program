import type { SxProps, Theme } from "@mui/material";

/**
 * Maximum content width of the public screens, in pixels. Above this width the
 * content is centered and side margins appear.
 */
export const PUBLIC_CONTENT_MAX_WIDTH = 1560;

/**
 * Minimum breathing room, in pixels, between the hero text and the cards that
 * sit over its bottom edge.
 */
export const HERO_OVERLAP_BREATHING_ROOM = 28;

/** Height of the brand mark in the public header, in pixels. */
export const PUBLIC_HEADER_MARK_HEIGHT = 44;

/** Font size of the brand name in the public header, in pixels. */
export const PUBLIC_HEADER_NAME_FONT_SIZE = 17;

/** Font size of the territory line in the public header, in pixels. */
export const PUBLIC_HEADER_TERRITORY_FONT_SIZE = 8.5;

/**
 * Shape shared by the access buttons of the public header, so "Registrarse"
 * and "Iniciar sesión" read as a pair regardless of their variant.
 */
export const PUBLIC_ACCESS_BUTTON_SX: SxProps<Theme> = {
  borderRadius: 1.25,
  px: 2.5,
  py: 1.25,
  fontSize: 12.5,
  fontWeight: "fontWeightBold",
  letterSpacing: "1.1px",
  whiteSpace: "nowrap",
};
