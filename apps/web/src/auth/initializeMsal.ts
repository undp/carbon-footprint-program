import {
  PublicClientApplication,
  EventType,
  EventMessage,
  AuthenticationResult,
} from "@azure/msal-browser";
import { msalConfig } from "@/config/msalConfig";

// Initialize MSAL instance
export const msalInstance = new PublicClientApplication(msalConfig);

let msalInitPromise: Promise<void> | null = null;

/**
 * Initialize MSAL and handle authentication flow.
 * Idempotent — safe to call multiple times; only runs once.
 */
export function initializeMsal(): Promise<void> {
  if (msalInitPromise) return msalInitPromise;
  msalInitPromise = doInitializeMsal().catch((error) => {
    msalInitPromise = null;
    throw error;
  });
  return msalInitPromise;
}

async function doInitializeMsal(): Promise<void> {
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
    // navigateToLoginRequestUrl: false — stay on the redirectUri (/app/home)
    // after login instead of returning to the page that initiated it (the
    // landing has no auth redirect, so returning would strand the user there).
    // In msal-browser v5 this moved from the global config to a per-call option.
    await msalInstance.handleRedirectPromise({
      navigateToLoginRequestUrl: false,
    });
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
