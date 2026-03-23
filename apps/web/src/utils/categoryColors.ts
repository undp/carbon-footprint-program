import { alpha, darken } from "@mui/material/styles";

export interface CategoryColorSet {
  main: string;
  dark: string;
  light: string;
  background: string;
  contrastText: string;
}

/**
 * Derives a full color set from a single hex color.
 * Mirrors the pattern used in the theme palette for category colors.
 */
export function deriveCategoryColors(hexColor: string): CategoryColorSet {
  // Normalize: strip alpha channel from 8-digit hex (#RRGGBBAA → #RRGGBB)
  const normalized = hexColor.length === 9 ? hexColor.slice(0, 7) : hexColor;
  return {
    main: normalized,
    dark: darken(normalized, 0.6),
    light: alpha(normalized, 0.3),
    background: alpha(normalized, 0.8),
    contrastText: "#414046",
  };
}
