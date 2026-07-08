import { Navigate, Outlet, createRootRoute } from "@tanstack/react-router";
import { ThemeProvider } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { es } from "date-fns/locale";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import Typography from "@mui/material/Typography";
import { theme } from "@/theme";
import { SnackbarProvider } from "notistack";
import { AuthProvider as OidcAuthProvider } from "react-oidc-context";
import { oidcUserManager } from "../auth/oidcUserManager";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../api/query";
import { AuthProvider, ExplanationProvider } from "../contexts";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { IS_DEVELOPMENT } from "../config/environment";
import { Routes } from "@/interfaces";
import { UnpluggedCablesIcon } from "../icons";

// Strip the ?code&state params once react-oidc-context completes the redirect
// callback; the /auth/callback route then navigates to HOME.
function onSigninCallback() {
  window.history.replaceState({}, document.title, window.location.pathname);
}

function RootComponent() {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider preventDuplicate autoHideDuration={4000}>
          <OidcAuthProvider
            userManager={oidcUserManager}
            onSigninCallback={onSigninCallback}
          >
            <QueryClientProvider client={queryClient}>
              {IS_DEVELOPMENT && <ReactQueryDevtools initialIsOpen={false} />}
              <AuthProvider>
                <ExplanationProvider>
                  <Outlet />
                </ExplanationProvider>
              </AuthProvider>
            </QueryClientProvider>
          </OidcAuthProvider>
        </SnackbarProvider>
      </ThemeProvider>
    </LocalizationProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => <Navigate to={Routes.LANDING} />,
  errorComponent: ({ error }) => (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
          px: 3,
          textAlign: "center",
        }}
      >
        <UnpluggedCablesIcon sx={{ fontSize: 500, my: -12 }} />
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Algo salió mal
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ maxWidth: 480, mb: 4 }}
        >
          Ocurrió un error inesperado al cargar la página. Por favor, intenta
          recargar o vuelve al inicio.
        </Typography>
        {IS_DEVELOPMENT && (
          <Typography
            variant="body2"
            component="pre"
            sx={{
              // bgcolor: "grey.100",
              color: "error.dark",
              p: 2,
              borderRadius: 1,
              maxWidth: 600,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              mb: 4,
            }}
          >
            Debug: {error.message}
          </Typography>
        )}
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => (window.location.href = "/")}
          >
            Volver al inicio
          </Button>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Recargar página
          </Button>
        </Box>
      </Box>
    </ThemeProvider>
  ),
});
