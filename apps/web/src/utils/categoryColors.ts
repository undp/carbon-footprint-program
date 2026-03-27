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
export function getColorPalette(hexColor: string): CategoryColorSet {
  // Normalize: strip alpha channel from 8-digit hex (#RRGGBBAA → #RRGGBB)
  const normalized = hexColor.length === 9 ? hexColor.slice(0, 7) : hexColor;
  const fallback = "#90A4AE";
  const safeColor = /^#[0-9A-Fa-f]{6}$/.test(normalized)
    ? normalized
    : fallback;
  return {
    main: safeColor,
    dark: darken(safeColor, 0.6),
    light: alpha(safeColor, 0.3),
    background: alpha(safeColor, 0.8),
    contrastText: "#414046",
  };
}

/** Predefined color palette available for category assignment */
export const CATEGORY_COLORS = [
  "#FFB74D", // orange
  "#64B5F6", // light blue
  "#82C784", // green
  "#F06292", // pink
  "#BA68C8", // purple
  "#FFD54F", // yellow
  "#4DB6AC", // teal
  "#FF8A65", // deep orange
  "#7986CB", // indigo
  "#90A4AE", // blue gray
  "#AED581", // light green
  "#D4E157", // lime
];
