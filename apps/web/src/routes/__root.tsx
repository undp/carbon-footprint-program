import { Navigate, Outlet, createRootRoute } from "@tanstack/react-router";
import { GlobalStyles, ThemeProvider } from "@mui/material";
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
import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import {
  DEVTOOLS_TRIGGER_BOTTOM_PX,
  OVERLAY_RIGHT_PX,
} from "@/devtools/overlayLayout";
import { IS_CHATBOT_ENABLED, IS_DEVELOPMENT } from "../config/environment";
import { Routes } from "@/interfaces";
import { UnpluggedCablesIcon } from "../icons";
import { ChatbotWidget } from "@/components/Chatbot/ChatbotWidget";

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
              {/* One devtools shell hosting both inspectors as tabs, instead
                  of each library's own floating toggle. Mounted inside
                  QueryClientProvider so the Query panel sees the client, and
                  inside the root route so the Router panel sees the match
                  tree. */}
              {IS_DEVELOPMENT && (
                <>
                  {/* The shell only offers corner/edge presets, no offset, so
                      its exact slot in the bottom-right stack comes from here.
                      Offsets live in devtools/overlayLayout so this and
                      FormDebugPanel cannot drift apart.

                      `!important` is needed because the shell injects its own
                      `position: fixed; bottom/right` into <head> at runtime. The
                      aria-label is the only stable hook — its class names are
                      generated. Living inside this IS_DEVELOPMENT block means
                      @tanstack/devtools-vite strips the rule from production
                      builds along with the shell itself. */}
                  <GlobalStyles
                    styles={{
                      'button[aria-label="Open TanStack Devtools"]': {
                        right: `${OVERLAY_RIGHT_PX}px !important`,
                        bottom: `${DEVTOOLS_TRIGGER_BOTTOM_PX}px !important`,
                      },
                    }}
                  />
                  <TanStackDevtools
                    // bottom-left is not an option here: the sidebar and logout
                    // button own that corner. This only seeds the initial value
                    // — the shell persists trigger settings in local storage
                    // once it has run, so a dev machine that already opened it
                    // keeps its stored position.
                    config={{ position: "bottom-right" }}
                    plugins={[
                      {
                        name: "TanStack Query",
                        render: <ReactQueryDevtoolsPanel />,
                      },
                      {
                        name: "TanStack Router",
                        render: <TanStackRouterDevtoolsPanel />,
                      },
                    ]}
                  />
                </>
              )}
              <AuthProvider>
                <ExplanationProvider>
                  <Outlet />
                  {/* Optional AI feature (DPG optionality) — only mounted when
                      the deployment enables it. Minimum-viable placement;
                      design review may relocate. */}
                  {IS_CHATBOT_ENABLED && <ChatbotWidget />}
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
