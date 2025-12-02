/**
 * Material UI Theme Configuration
 */
import { createTheme, type ThemeOptions } from "@mui/material/styles";
import { palette } from "./palette";
import { typography } from "./typography";

// Define the theme options
const themeOptions: ThemeOptions = {
  palette,
  typography,
};

// Create the theme
export const theme = createTheme(themeOptions);
