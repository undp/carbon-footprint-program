/**
 * Material UI Theme Configuration
 */
import { esES as materialEsES } from "@mui/material/locale";
import { createTheme, type ThemeOptions } from "@mui/material/styles";
import { esES as dataGridEsES } from "@mui/x-data-grid/locales";
import { esES as pickersEsES } from "@mui/x-date-pickers/locales";
import type {} from "@mui/x-date-pickers/themeAugmentation";
import { palette } from "./palette";
import { typography } from "./typography";

// Define the theme options
const themeOptions: ThemeOptions = {
  components: {
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
        color: "transparent",
      },
    },
    MuiToolbar: {
      defaultProps: {},
      styleOverrides: {
        root: {
          paddingTop: 16,
          paddingBottom: 16,
        },
      },
    },
    MuiButton: {
      defaultProps: {},
      styleOverrides: {
        root: {
          minHeight: "2.5rem", // 40px equivalent, but responsive
          padding: "0.25rem 1rem", // 4px top/bottom, 16px left/right
          // MUI handles icon spacing automatically via startIcon/endIcon
        },
      },
    },
  },
  palette,
  typography,
};

// Fixes to the official Spanish translations, applied after the locales
const localeOverrides: ThemeOptions = {
  components: {
    MuiAutocomplete: {
      defaultProps: {
        openText: "Abrir",
      },
    },
    MuiLocalizationProvider: {
      defaultProps: {
        localeText: {
          day: "Día",
        },
      },
    },
  },
};

// Create the theme. `createTheme` deep-merges the locales and the overrides.
export const theme = createTheme(
  themeOptions,
  materialEsES,
  dataGridEsES,
  pickersEsES,
  localeOverrides
);
