import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { MsalProvider } from "@azure/msal-react";
import { msalInstance, initializeMsal } from "./auth/initializeMsal";
import { routeTree } from "./routeTree.gen";
import { AuthProvider } from "./contexts/AuthContext";
import "./index.css";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { queryClient } from "./api/query";
import { QueryClientProvider } from "@tanstack/react-query";

// Create router instance
const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
});

// Extend TanStack Router types
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Initialize MSAL and render the app
async function initializeApp() {
  // Initialize MSAL authentication
  await initializeMsal();

  // Render app
  const rootElement = document.getElementById("root")!;
  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <MsalProvider instance={msalInstance}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </MsalProvider>
  );
}

// Start the app
// eslint-disable-next-line no-console
initializeApp().catch(console.error);
