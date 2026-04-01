import { Navigate, Outlet, createRootRoute } from "@tanstack/react-router";
import { ThemeProvider } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "@/theme";
import { SnackbarProvider } from "notistack";
import { initializeMsal, msalInstance } from "../auth/initializeMsal";
import { MsalProvider } from "@azure/msal-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../api/query";
import { AuthProvider, ExplanationProvider } from "../contexts";
import { useEffect } from "react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { IS_DEVELOPMENT } from "../config/environment";
import { Routes } from "@/interfaces";

function RootComponent() {
  useEffect(() => {
    // Initialize MSAL authentication
    void initializeMsal();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider preventDuplicate autoHideDuration={4000}>
        <MsalProvider instance={msalInstance}>
          <QueryClientProvider client={queryClient}>
            {IS_DEVELOPMENT && <ReactQueryDevtools initialIsOpen={false} />}
            <AuthProvider>
              <ExplanationProvider>
                <Outlet />
              </ExplanationProvider>
            </AuthProvider>
          </QueryClientProvider>
        </MsalProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => <Navigate to={Routes.LANDING} />,
});
