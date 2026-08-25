/**
 * Color palette for the Material UI theme.
 *
 * The Dominican deployment dresses the platform in the institutional identity
 * of the Ministerio de Medio Ambiente y Recursos Naturales: the navy of the
 * Gobierno de la República Dominicana as the primary color, the green of the
 * leaf inside the Huella de Carbono RD fingerprint as the secondary one, and a
 * warm yellow reserved for attention accents.
 *
 * Every pairing shipped here clears WCAG AA (4.5:1 for body text, 3:1 for large
 * text and UI outlines): white on `primary.main` is 11.5:1, white on
 * `secondary.main` 4.7:1, and `softLeaf` / `sunflower` over `deepNavyDark`
 * clear 10:1. Keep new pairings above those floors — the yellow in particular
 * is 1.6:1 against white and only ever carries dark text.
 */

import { alpha } from "@mui/material/styles";
import type { PaletteOptions } from "@mui/material/styles";
import {
  SubmissionType as RequestType,
  CarbonInventoryRecognitionsType,
} from "@repo/types";
import { StatusFamily } from "@/labels/chips/types";

const recognitionTypeColors: Record<CarbonInventoryRecognitionsType, string> = {
  [RequestType.CARBON_INVENTORY_CALCULATION]: `#C4E39B`,
  [RequestType.CARBON_INVENTORY_VERIFICATION]: "#DFDFDF",
  [RequestType.REDUCTION_PROJECT_VERIFICATION]: "#F7D634",
  [RequestType.NEUTRALIZATION_PLAN_VERIFICATION]: "#89D5CB",
};

// Submission-type chips reuse the recognition hues for the four recognition
// types and add a pastel blue for organization accreditation (no recognition
// equivalent), keeping the two chip families color-consistent by construction.
const submissionTypeColors: Record<RequestType, string> = {
  ...recognitionTypeColors,
  [RequestType.ORGANIZATION_ACCREDITATION]: "#89B8F8",
};

const SUCCESS_MAIN = "#2E7D32";
const INFO_MAIN = "#0288D1";
const WARNING_MAIN = "#ED6C02";
const ERROR_MAIN = "#D32F2F";
const GREY_500 = "#9E9E9E";

const statusFamilyColors: Record<StatusFamily, string> = {
  [StatusFamily.POSITIVE]: SUCCESS_MAIN,
  [StatusFamily.IN_REVIEW]: INFO_MAIN,
  [StatusFamily.ACTION_REQUIRED]: WARNING_MAIN,
  [StatusFamily.NEGATIVE]: ERROR_MAIN,
  [StatusFamily.NEUTRAL]: GREY_500,
};

export const palette: PaletteOptions = {
  mode: "light",
  // Primary colors - institutional navy of the Gobierno de la República
  // Dominicana. `light` doubles as the hover / link blue.
  primary: {
    main: "#003876",
    light: "#0A4A96",
    dark: "#002550",
    contrastText: "#FFFFFF",
  },
  // Secondary colors - the leaf inside the Huella de Carbono RD fingerprint.
  // `main` is darkened from the artwork so it can carry white text and be read
  // as a figure color; `light` is the leaf as it appears in the logo.
  secondary: {
    main: "#557F22",
    light: "#ADCD6C",
    dark: "#3C5C15",
    contrastText: "#FFFFFF",
  },
  // Error colors
  error: {
    main: ERROR_MAIN,
    light: "#EF5350",
    dark: "#C62828",
    contrastText: "#FFFFFF",
  },
  // Warning colors
  warning: {
    main: WARNING_MAIN,
    light: "#FF9800",
    dark: "#E65100",
    contrastText: "#FFFFFF",
  },
  // Info colors
  info: {
    main: INFO_MAIN,
    light: "#03A9F4",
    dark: "#01579B",
    contrastText: "#FFFFFF",
  },
  // Success colors
  success: {
    main: SUCCESS_MAIN,
    light: "#4CAF50",
    dark: "#1B5E20",
    contrastText: "#FFFFFF",
  },
  // Background colors
  background: {
    default: "#F5F7FA",
    paper: "#FFFFFF",
  },
  // Text colors
  text: {
    primary: "#233043",
    secondary: alpha("#233043", 0.68),
    disabled: alpha("#233043", 0.38),
    hint: alpha("#233043", 0.38),
  },
  // Other utility colors
  other: {
    backdrop: alpha("#000000", 0.5),
    filledInput: alpha("#000000", 0.09),
    tooltip: alpha("#616161", 0.9),
    snackbar: "#323232",
    ratingFull: "#FFB400",
    accent: "#ADCD6C",
    gradient: `linear-gradient(90deg, #003876 0%, #ADCD6C 100%)`,
    gradient20: `linear-gradient(90deg, ${alpha(
      "#003876",
      0.2
    )} 0%, ${alpha("#ADCD6C", 0.2)} 100%)`,
  },
  // Grey scale (Material Design standard)
  grey: {
    50: "#FAFAFA",
    100: "#F5F5F5",
    200: "#EEEEEE",
    300: "#E0E0E0",
    400: "#BDBDBD",
    500: GREY_500,
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
    // Navy of the dark surfaces: the institutional footer, the solid buttons
    // over the brand gradient and the dark cards.
    deepNavy: "#0C2E5C",
    // Near-black navy of the titles and the deep end of the dark cards.
    deepNavyDark: "#071E3C",
    // The leaf of the Huella de Carbono RD fingerprint, as decoration over a
    // navy surface.
    leafGreen: "#ADCD6C",
    // High-contrast pale green over a `deepNavyDark` background (highlight
    // figures and details of the dark cards).
    softLeaf: "#C9E29B",
    // Teal that marks the administration surfaces apart from the navy of the
    // public ones.
    oceanTeal: "#0F6E8F",
    // Attention yellow: the pilot-environment badge and the accents over navy
    // backgrounds. It only ever carries dark text.
    sunflower: "#F5C844",
  },
  // Divider
  divider: alpha("#000000", 0.12),
  submissionTypeColors,
  recognitionTypeColors,
  roleColors: {
    USER: "#0288D1",
    ADMIN: "#2E7D32",
    SUPERADMIN: "#B8860B",
  },
  statusFamilyColors,
} as const;
