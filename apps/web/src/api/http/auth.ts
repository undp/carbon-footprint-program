import { msalInstance } from "@/auth/initializeMsal";
import { apiTokenRequest } from "@/config/msalConfig";

/**
 * Gets the current access token from MSAL
 * Automatically handles token refresh if needed
 */
export async function getAuthToken(): Promise<string | null> {
  const account = msalInstance.getActiveAccount();

  if (!account) {
    return null;
  }

  try {
    // Try to acquire token silently
    const response = await msalInstance.acquireTokenSilent({
      ...apiTokenRequest,
      account,
    });
    return response.accessToken;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to acquire token silently:", error);

    // If silent acquisition fails, try interactive popup
    try {
      const response = await msalInstance.acquireTokenPopup(apiTokenRequest);
      return response.accessToken;
    } catch (popupError) {
      // eslint-disable-next-line no-console
      console.error("Failed to acquire token with popup:", popupError);
      return null;
    }
  }
}
