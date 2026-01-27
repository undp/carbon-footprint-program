import { Outlet, createRootRoute } from "@tanstack/react-router";
import { ThemeProvider } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "@/theme";
import { SnackbarProvider } from "notistack";
import { useInitializeUser } from "@/hooks/useInitializeUser";

function RootComponent() {
  useInitializeUser(); // Initialize user data when authenticated

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider preventDuplicate>
        <Outlet />
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
