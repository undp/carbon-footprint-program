import { Outlet, createRootRoute } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "@/theme";
import { queryClient } from "@/api/query/client";
import { SnackbarProvider } from "notistack";
import { useInitializeUser } from "@/hooks/useInitializeUser";

function RootComponent() {
  useInitializeUser(); // Initialize user data when authenticated

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider preventDuplicate>
          <Outlet />
        </SnackbarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
