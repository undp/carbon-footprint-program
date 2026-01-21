import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import {
  PublicClientApplication,
  EventType,
  EventMessage,
  AuthenticationResult,
} from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "./config/msalConfig";
import { routeTree } from "./routeTree.gen";
import { AuthProvider } from "./contexts/AuthContext";
import "./index.css";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

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

// Initialize MSAL and set up the app
async function initializeApp() {
  // Wait for MSAL to initialize
  await msalInstance.initialize();

  // Add account event callbacks - register before handling redirect
  msalInstance.addEventCallback((event: EventMessage) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
      const payload = event.payload as AuthenticationResult;
      const account = payload.account;
      msalInstance.setActiveAccount(account);
    }

    if (event.eventType === EventType.LOGOUT_SUCCESS) {
      msalInstance.setActiveAccount(null);
    }
  });

  // Handle redirect promise before rendering
  // This is crucial for redirect flow to work properly
  try {
    await msalInstance.handleRedirectPromise();
    // Event callback will handle setting active account for successful auth
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error handling redirect:", error);
  }

  // Set active account if we have accounts (for page refresh)
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0 && !msalInstance.getActiveAccount()) {
    msalInstance.setActiveAccount(accounts[0]);
  }

  // Render app
  const rootElement = document.getElementById("root")!;
  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <MsalProvider instance={msalInstance}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </MsalProvider>
  );
}

// Start the app
// eslint-disable-next-line no-console
initializeApp().catch(console.error);

export { msalInstance };
