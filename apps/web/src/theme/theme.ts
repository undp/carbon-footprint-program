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
      styleOverrides: {
        root: {
          display: "flex",
          height: "40px",
          padding: "0 16px",
          justifyContent: "center",
          alignItems: "center",
          gap: "10px",
        },
      },
    },
  },
  palette,
  typography,
};

// Create the theme
export const theme = createTheme(themeOptions);
