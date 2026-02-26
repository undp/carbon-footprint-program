/**
 * Material UI Theme Configuration
 */
import { createTheme, type ThemeOptions } from "@mui/material/styles";
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

// Create the theme
export const theme = createTheme(themeOptions);
