import {
  PublicClientApplication,
  EventType,
  EventMessage,
  AuthenticationResult,
} from "@azure/msal-browser";
import { msalConfig } from "@/config/msalConfig";

// Initialize MSAL instance
export const msalInstance = new PublicClientApplication(msalConfig);

/**
 * Initialize MSAL and handle authentication flow
 * Must be called before rendering the React app
 */
export async function initializeMsal(): Promise<void> {
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
}
