/**
 * Color Palette for Material UI Theme
 * Based on Figma Design System
 */

import { alpha } from "@mui/material/styles";
import type { PaletteOptions } from "@mui/material/styles";
import {
  SubmissionType as RequestType,
  CarbonInventoryRecognitionsType,
} from "@repo/types";
import { StatusFamily } from "../labels/status/types";

const requestTypeColors: Record<RequestType, string> = {
  [RequestType.ORGANIZATION_ACCREDITATION]: "#1565C0",
  [RequestType.CARBON_INVENTORY_CALCULATION]: "#1E8449",
  [RequestType.CARBON_INVENTORY_VERIFICATION]: "#4A4A4A",
  [RequestType.REDUCTION_PROJECT_VERIFICATION]: "#B8860B",
  [RequestType.NEUTRALIZATION_PLAN_VERIFICATION]: "#117A65",
};

const recognitionTypeColors: Record<CarbonInventoryRecognitionsType, string> = {
  [RequestType.CARBON_INVENTORY_CALCULATION]: `#89F8AF`,
  [RequestType.CARBON_INVENTORY_VERIFICATION]: "#DFDFDF",
  [RequestType.REDUCTION_PROJECT_VERIFICATION]: "#F7D634",
  [RequestType.NEUTRALIZATION_PLAN_VERIFICATION]: "#89D5CB",
};

// Status family colors mirror success.main / info.main / warning.main /
// error.main / grey[500] from the palette below. They are duplicated here
// because `palette` is a flat initializer and cannot self-reference — keep
// these in sync when any of those palette entries change.
const statusFamilyColors: Record<StatusFamily, string> = {
  [StatusFamily.POSITIVE]: "#2E7D32",
  [StatusFamily.IN_REVIEW]: "#0288D1",
  [StatusFamily.ACTION_REQUIRED]: "#ED6C02",
  [StatusFamily.NEGATIVE]: "#D32F2F",
  [StatusFamily.NEUTRAL]: "#9E9E9E",
};

export const palette: PaletteOptions = {
  mode: "light",
  // Primary colors - Main brand colors (Green)
  primary: {
    main: "#006E4D",
    light: "#338B70",
    dark: "#004D35",
    contrastText: "#FFFFFF",
  },
  // Secondary colors - Accent and complementary (Aqua)
  secondary: {
    main: "#63E4CF",
    light: "#82E9D8",
    dark: "#459F90",
    contrastText: "#FFFFFF",
  },
  // Error colors
  error: {
    main: "#D32F2F",
    light: "#EF5350",
    dark: "#C62828",
    contrastText: "#FFFFFF",
  },
  // Warning colors
  warning: {
    main: "#ED6C02",
    light: "#FF9800",
    dark: "#E65100",
    contrastText: "#FFFFFF",
  },
  // Info colors
  info: {
    main: "#0288D1",
    light: "#03A9F4",
    dark: "#01579B",
    contrastText: "#FFFFFF",
  },
  // Success colors
  success: {
    main: "#2E7D32",
    light: "#4CAF50",
    dark: "#1B5E20",
    contrastText: "#FFFFFF",
  },
  // Background colors
  background: {
    default: "#F9F9F9",
    paper: "#FFFFFF",
  },
  // Text colors
  text: {
    primary: "#414046",
    secondary: alpha("#414046", 0.6),
    disabled: alpha("#414046", 0.38),
    hint: alpha("#414046", 0.38),
  },
  // Other utility colors
  other: {
    backdrop: alpha("#000000", 0.5),
    filledInput: alpha("#000000", 0.09),
    tooltip: alpha("#616161", 0.9),
    snackbar: "#323232",
    ratingFull: "#FFB400",
    fluor: "#63E4CF",
    gradient: `linear-gradient(90deg, #56F58D 0%, #63E4CF 100%)`,
    gradient20: `linear-gradient(90deg, ${alpha(
      "#56F58D",
      0.2
    )} 0%, ${alpha("#63E4CF", 0.2)} 100%)`,
  },
  // Grey scale (Material Design standard)
  grey: {
    50: "#FAFAFA",
    100: "#F5F5F5",
    200: "#EEEEEE",
    300: "#E0E0E0",
    400: "#BDBDBD",
    500: "#9E9E9E",
    600: "#757575",
    700: "#616161",
    800: "#424242",
    900: "#212121",
    A100: "#D5D5D5",
    A200: "#AAAAAA",
    A400: "#616161",
    A700: "#303030",
  },
  // Action colors - using alpha() to generate transparencies automatically
  action: {
    active: alpha("#000000", 0.54),
    hover: alpha("#000000", 0.04),
    selected: alpha("#000000", 0.08),
    disabled: alpha("#000000", 0.26),
    disabledBackground: alpha("#000000", 0.12),
    focus: alpha("#000000", 0.12),
    hoverOpacity: 0.04,
    selectedOpacity: 0.08,
    disabledOpacity: 0.38,
    activatedOpacity: 0.12,
  },
  // Common colors
  common: {
    black: "#000000",
    white: "#FFFFFF",
    deepForest: "#1C403A",
    brightGreen: "#56F58D",
    glossyTeal: "#009689",
  },
  // Divider
  divider: alpha("#000000", 0.12),
  requestTypeColors,
  recognitionTypeColors,
  roleColors: {
    USER: "#0288D1",
    ADMIN: "#2E7D32",
    SUPERADMIN: "#B8860B",
  },
  statusFamilyColors,
} as const;
