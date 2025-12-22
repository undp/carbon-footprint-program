/**
 * Material UI Theme Configuration
 */
import { createTheme, type ThemeOptions } from "@mui/material/styles";
import { palette } from "./palette";
import { typography } from "./typography";

// Define the theme options
const themeOptions: ThemeOptions = {
  components: {
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
    MuiFormControl: {
      styleOverrides: {
        root: {
          minHeight: "5rem", // 80px equivalent, but responsive
        },
      },
    },
  },
  palette,
  typography,
};

// Create the theme
export const theme = createTheme(themeOptions);
