# Frontend MSAL & Azure Easy-Auth Configuration Guide

This comprehensive guide explains how to configure Microsoft Authentication Library (MSAL) on the frontend and Azure App Service Easy-Auth on the backend for user authentication in the Huella Latam application.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Azure Portal Configuration](#azure-portal-configuration)
   - [Required Steps (Easy-Auth Default Setup)](#required-steps-easy-auth-default-setup)
   - [Optional Steps for Custom Authentication](#optional-steps-for-custom-authentication)
5. [Infrastructure (Bicep) Configuration](#infrastructure-bicep-configuration)
6. [Frontend MSAL Configuration](#frontend-msal-configuration)
7. [Backend Easy-Auth Configuration](#backend-easy-auth-configuration)
8. [Environment Variables](#environment-variables)
9. [Testing](#testing)
10. [Production Deployment](#production-deployment)
11. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This application uses a **two-layer authentication approach**:

### Frontend Authentication (MSAL)

- **Purpose**: Authenticate users via Azure Entra External ID
- **Technology**: `@azure/msal-browser` or `@azure/msal-react`
- **Flow**: Popup or Redirect-based OAuth 2.0 + OpenID Connect
- **Authentication Method**: Email OTP (One-Time Passcode)

### Backend Authentication (Easy-Auth) - **Default & Recommended**

- **Purpose**: Validate authenticated users on the API
- **Technology**: Azure App Service Easy Authentication
- **Flow**: Receives and validates user claims from App Service headers
- **Headers Used**: `X-MS-CLIENT-PRINCIPAL`, `X-MS-CLIENT-PRINCIPAL-ID`
- **✨ Key Benefit**: Zero code changes needed for token validation - Azure App Service handles everything

> **💡 Note**: Easy-Auth is the **recommended default approach** for this application. Alternative authentication methods (custom token validation, JWKS) are available but require additional code modifications. See [Optional Steps](#optional-steps-for-custom-authentication) if needed.

---

## 🏗️ Architecture

```
┌─────────────┐                    ┌──────────────────┐
│   Browser   │                    │  Azure Entra     │
│             │◄──────(1)─────────►│  External ID     │
│  MSAL.js    │   OAuth 2.0 Flow   │  (Email OTP)     │
└──────┬──────┘                    └──────────────────┘
       │
       │ (2) Access Token
       │
       ▼
┌─────────────┐     (3)            ┌──────────────────┐
│   Frontend  │────────────────────►│  Azure App       │
│   (React)   │   API Request       │  Service         │
│             │   + Bearer Token    │  (Easy-Auth)     │
└─────────────┘                    └────────┬─────────┘
                                            │
                                            │ (4) Injects Headers:
                                            │ X-MS-CLIENT-PRINCIPAL
                                            │
                                            ▼
                                   ┌──────────────────┐
                                   │   API Backend    │
                                   │   (Fastify)      │
                                   │   EasyAuthProvider│
                                   └──────────────────┘
```

**Flow Explanation:**

1. User authenticates via MSAL → Azure Entra External ID (Email OTP)
2. MSAL receives Access Token and ID Token from Azure
3. Frontend sends API requests with Bearer Token in Authorization header
4. Azure App Service Easy-Auth intercepts requests, validates token, and injects user claims
5. Backend reads `X-MS-CLIENT-PRINCIPAL` header to identify authenticated user

---

## 📋 Prerequisites

Before you begin, ensure you have:

- ✅ Azure subscription with access to create resources
- ✅ Permission to create Azure Entra External ID tenant
- ✅ Node.js 24+ and pnpm installed
- ✅ Azure CLI installed and logged in
- ✅ Access to the `undp-huella-latam` repository

---

## 🔧 Azure Portal Configuration

> **🎯 Default Approach**: This guide uses **Easy-Auth** as the default authentication method. This requires minimal code changes and Azure App Service handles token validation automatically.
> **🔧 Custom Authentication**: If you need more control (e.g., custom token validation, non-Azure hosting), see the [Optional Steps](#optional-steps-for-custom-authentication) section at the end of this document.

---

## ✅ Required Steps

These steps configure the recommended Easy-Auth approach where Azure App Service automatically validates tokens and injects user information into request headers.

### Step 1: Create Azure Entra External ID Tenant

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Search for **"Microsoft Entra ID"**
3. Click **"Manage tenants"**
4. Click **"Create a tenant"**
5. Select **"Microsoft Entra External ID"** as **"Tenant type"**
6. Configure:
   - **Organization name**: e.g `UNDP-HUELLA-LATAM` (or your preferred name). Choose a name carefully, because it will be seen by users while registering and logging-in.
   - **Initial domain name**: e.g `undphuella` (this becomes `undphuella.ciamlogin.com`)
   - **Country/Region**: Choose closest to your users (e.g., United States, Europe, LATAM)
7. Select your **Azure Subscription** and corresponding **Resource Group**
8. Review and create (this may take a few minutes)

> 💡 _**Tip**: Save the Tenant ID - you'll see it in Overview or in the list inside the **"Manage tenants"** as **"Organization ID"**_

### Step 2: Register Frontend Application

> **📱 Important**: This App Registration is for your **frontend web application** that will use MSAL.js for browser-based authentication.

1. Switch to your External Tenant directory
2. navigate to **App registrations** → Click **"New registration"**
3. Configure the registration:
   **Basic Information:**
   - **Name**: e.g `Huella Latam Web App - Frontend MSAL` (or any descriptive name)
     - 💡 _**Tip**: Use explicit names to differentiate between apps later (e.g., `YourApp-Frontend`, `YourApp-API`)_
   - **Supported account types**:
     - Select: "Accounts in this organizational directory only"

   **Redirect URIs:**
   - **Platform**: Single-page application (SPA)
   - **Development URI**: `http://localhost:5173`
   - **Production URI**: `https://<your-production-domain>.com`
   - _(You can add multiple URIs after the registration on the "Authentication (Preview)" option)_

4. Click **"Register"**
5. Add the other necessary redirect URIs to your frontend web application:
   - In your Frontend App registration, navigate to **"Authentication (Preview)"** in the left menu
   - Select
     - **Platform**: Single-page application (SPA)
     - **Development URI**: `http://localhost:5173/auth/sign-in`
     - **Production URI**: `https://<your-production-domain.com>/auth/sign-in`
       > 💡 _**Note**: This URIs is used as the post logout redirection on the front._

> 💡 _**Tip**: Save the Front App Registration ID you will need ahead_

### Step 3: Create Sign-in/Sign-up User Flow

> **🔐 Important**: After creating the Frontend App Registration, you need to set up a User Flow that defines how users will authenticate using Email OTP.

1. In your External Tenant directory, navigate to **"External Identities"** in the left menu
2. Go to **"User flows"**
3. Click **"New user flow"**
4. Select **"Sign up and sign in"** as the user flow type
5. Configure the user flow:
   - **Name**: e.g `SignUpSignIn` (or your preferred name)
   - **Identity providers**:
     - ✅ Check **"Email one-time passcode"**
   - **User attributes**: Select which attributes to collect during sign-up:
     - ✅ Email Address (required)
     - Add any other attributes your app needs
6. Click **"Create"**
7. Associate the user flow with your Frontend App Registration:
   - In your External ID tenant, navigate to **"External Identities"** in the left menu
   - Navigate to the **User flows**
   - Select your recently created **User flow**
   - Inside your **User flow**, navigate to **Applications** in the left menu
   - Click **+ Add application** → Select you frontend web application (e.g `Huella Latam Web App - Frontend MSAL`)

> _Users will now authenticate using the Email OTP flow you just configured. They'll receive a one-time passcode to their email address when signing in._

### Step 4: Register API Application

1. Switch to your External Tenant directory
2. Navigate to **App registrations** → Click **"New registration"**
3. Configure the registration:
   - **Name:** e.g `Huella Latam Api` (or any descriptive name)
     - 💡 _**Tip**: Use explicit names to differentiate between apps later (e.g., `YourApp-Frontend`, `YourApp-API`)_
   - **Supported account types:**
     - Choose **Accounts in this organizational directory only (\<your-external-tenant-name\> - Single tenant)**
4. Click **"Register"**

> 💡 _**Tip**: Save the Api App Registration ID you will need ahead_

### Step 5: Add Scopes

> **🔑 Key Point**: The App Registration you created in Step 2 is for the **frontend** (web app). The App Registration Azure creates here is for the **backend API** Easy Auth. These are two separate app registrations:
>
> - **Frontend App**: Used by MSAL in the browser
> - **Backend API App**: Used by Easy Auth on App Service

1. In your External Tenant directory, navigate to **"App registrations"**
2. Choose **All app registrations** tab
3. Select your recently created Api Application registration
4. Navigate to **"Expose an API"** in the left menu
5. Click **"Add a scope"**
   - Configure the scope:
     - **"Scope name"**: `access_as_user`
     - **"Who can consent?"**:
       - Choose **Admins and users**
     - **Admin consent display name**: e.g `Access Huella Latam API`
     - **Admin consent description**: e.g `Allow admins to access Huella Latam API`
     - **State:** `Enabled`
   - Click **Add scope**

> 💡 _**Tip**: Save the Api App Registration ID you will need ahead_

### Step 5: Enable Easy Auth on your App Service (API)

1. Switch to your principal Tenant directory
2. Navigate to **Azure Portal** → **Resource Groups**
3. Select the **Resource Group**
4. Select your API App Service (e.g., `api-mdzqz43nanpls`)
5. In the left menu, go to **Settings** > **"Authentication"**
6. Click **"Add identity provider"**
7. Select **"Microsoft"** as the identity provider
8. Configure the settings:
   - **App registration type:**
     - Choose **"Provide the details of an existing app registration":**
       - Configure the settings: - **Application (client) ID**: Add your Api App Registration ID (created on your App Registration on your External Tenant) - **Issuer URL**: `https://<external-tenant-sub-domain>.ciamlogin.com/<external-tenant-id>/v2.0` - **Allowed token audiences**: Add your Api App Registration ID (created on your App Registration on your External Tenant)
   - **Client application requirement:**:
     - Choose **Allow requests from specific client applications"**
     - In **"Allowed client applications"** Add your Front App Registration ID (created on your App Registration on your External Tenant)
   - **Identity requirement:**
     - Choose **Allow requests from any identity**
   - **Tenant requirement:**
     - Choose **Allow requests from specific tenants**
     - In **Allowed tenants** set you External Tenant ID created at the first step
   - **Restrict access**:
     - Choose **"Allow unauthenticated access"**. The API will be responsible for validating the incoming request.
   - **Token store**: Enable (recommended)

9. Click **"Add"**

### Step 6: Grant permission from Frontend to Backend

1. Switch to your External Tenant directory
2. navigate to **"App registrations"**
3. Choose **All app registrations** tab
4. Go to your **Frontend App Registration**
5. Navigate to **Manage** > **"API permissions"**.
6. Click **"Add a permission"** → **"API's my organization uses"**.
7. Select the API app registration "Huella Latam API - Node"
8. on **Select Permissions**.```
   - Check the scope you created before `access_as_user`
9. Click on **Add permissions**
10. Now grant admin consent by clicking **"Grant admin consent"** to pre-approved for all users.

### Step 7: Add Branding to your Company

1. Switch to your External Tenant directory
2. navigate to **Microsoft Entra ID**
3. Click on **Manage** > **Company branding** in the left menu
4. Select **Default sign-in** tab → **Customize**

## 📚 Optional Steps for Custom Authentication

> - Custom token validation logic (not using Easy-Auth)
> - Direct API calls from frontend to backend with custom scopes
> - Access to Microsoft Graph API beyond basic profile information
> - Non-Azure hosting requiring manual token validation
>
> **Note**: Implementing custom authentication requires additional code changes in your API backend.

### Optional Step 1: Configure API Permissions (Advanced - Microsoft Graph Access)

> **⚠️ Skip this step** if you're only using Email OTP authentication with the default scopes (openid, profile, email, offline_access).

This step is only needed if you plan to:

- Call **Microsoft Graph API** for additional user data beyond basic profile
- Access **other Microsoft 365 services** (SharePoint, OneDrive, Teams, etc.)
- Request **admin-only permissions** that require tenant administrator consent

**For basic Email OTP authentication, the following scopes are already available by default and don't require configuration:**

1. Go to **"API permissions"** (if needed)
2. The following Microsoft Graph permissions should already be present:
   - `openid` - Sign in and read user profile (default)
   - `profile` - View users' basic profile (default)
   - `email` - View users' email address (default)
   - `offline_access` - Maintain access to data for refresh tokens (default)
3. **Optional**: Add additional permissions if your app needs them:
   - `User.Read` - Read user's full profile from Microsoft Graph
   - `Mail.Read` - Read user's emails
   - `Calendars.Read` - Read user's calendar
4. Click **"Grant admin consent"** if required by your organization (typically only needed for non-default permissions)

### Optional Step 2: Create Client Secret (Advanced - Server-Side Flows)

> **⚠️ Note**: This is only needed if you want to use the client credentials flow or if your frontend needs to call other Microsoft APIs server-side. For Email OTP with MSAL in the browser, you typically don't need a client secret on the frontend app.

If needed:

1. Navigate to **"Certificates & secrets"** in your Frontend App Registration
2. Click **"New client secret"**
3. Configure:
   - **Description**: `Frontend App Secret`
   - **Expires**: Choose appropriate duration (recommended: 1 year for production)
4. Click **"Add"**
5. **Copy the secret value immediately** - it will only be shown once

### Optional Step 4: Configure Token Validation (Custom Validation Logic)

If you want to implement custom token validation on your API (instead of using Easy-Auth):

1. Set up JWKS endpoint validation in your API code
2. Verify token issuer matches your External ID tenant:
   - Format: `https://{tenant-subdomain}.ciamlogin.com/{tenant-id}/v2.0`
3. Validate token audience matches your API's Client ID
4. Implement token signature verification using JWKS keys

> **🔧 Code Changes Required**: You'll need to modify `apps/api/src/auth` to implement a custom JWT validation provider instead of using `EasyAuthProvider`.

## 🏗️ Infrastructure (Bicep) Configuration

The infrastructure is already set up to support Azure authentication. Here's what you need to know:

### Understanding the Configuration

After following the Azure Portal steps above, you'll have:

- **Frontend App Registration**: Client ID for MSAL (from Step 2)
- **API App Registration**: Client ID for the API```

### Step 1: Configure Deployment Environment Variables

The deployment script uses environment variables to configure Azure authentication. Set these in `infra/.env` (you can start with the `.env.template` file):

```bash
# Azure Subscription
export ENVIRONMENT=""
export AZURE_SUBSCRIPTION_ID=""
export AZURE_EXTERNAL_TENANT_SUBDOMAIN=""
export AZURE_EXTERNAL_TENANT_ID=""
export AZURE_API_CLIENT_ID=""   # API App Registration ID for Azure Entra External Authentication
export AZURE_FRONT_CLIENT_ID=""  # Frontend App Registration ID for Azure Entra External Authentication

# Azure Resource Group
export AZURE_RESOURCE_GROUP="undp-huella-latam-$ENVIRONMENT-rg"
export AZURE_SUBSCRIPTION_GROUP="Devs-Contributors"

# Location 'eastus' is not available for subscriptions with free trial. Using 'eastus2' instead.
export LOCATION=""

export DRY_RUN=""
```

If these variables are **not set**, the API will deploy with `AUTH_PROVIDER=none` (no authentication).

### Step 3: Deploy Infrastructure

The Bicep deployment will:

- ✅ Store credentials securely in Azure Key Vault
- ✅ Set up environment variables for the API
- ✅ Generate authority URL automatically

Deploy using the deployment script:

```bash
cd infra
./deploy.sh
```

### Step 3: Verify Key Vault Secrets

After deployment, verify secrets are stored:

````bashVerify App Service Configuration

After deploying via Bicep, verify the App Service has the correct settings:

```bicep
siteConfig: {
  appSettings: [
    // ... other settings ...
    {
      name: 'AZURE_EXTERNAL_TENANT_ID'
      value: 'undphuella'  // Your External ID tenant subdomain
    }
    {
      name: 'AZURE_API_CLIENT_ID'
      value: '12345678-...'  // Your FRONTEND app client ID (for reference)
    }
    {
      name: 'AUTH_PROVIDER'
      value: 'easy-auth'  // Tells the API to use Easy-Auth
    }
  ]
}
````

> **Note**: After enabling Easy Auth through the Azure Portal (as described in the Azure Portal Configuration section), the authentication is handled at the App Service level, before requests reach your application code.

```
[
    {
      name: 'AZURE_API_CLIENT_ID'
      value: '9554b350-94d3-436f-be3b-0e5b0fc1818a'  // Your client ID
    }
    {
      name: 'AUTH_PROVIDER'
      value: 'easy-auth'  // Tells the API to use Easy-Auth
    }

]
```

---

## 🎨 Frontend MSAL Configuration

### Step 1: Install MSAL Dependencies

```bash
cd apps/web
pnpm add @azure/msal-browser @azure/msal-react
```

### Step 2: Create MSAL Configuration File

Create `apps/web/src/config/msalConfig.ts`:

```typescript
import {
  Configuration,
  LogLevel,
  PublicClientApplication,
} from "@azure/msal-browser";

/**
 * MSAL Configuration for Azure Entra External ID
 *
 * This configures the Microsoft Authentication Library for browser-based
 * authentication using Azure Entra External ID with Email OTP.
 */

// Get configuration from environment variables
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID;
const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;
const redirectUri =
  import.meta.env.VITE_AZURE_REDIRECT_URI || window.location.origin;

if (!tenantId || !clientId) {
  throw new Error(
    "MSAL configuration error: VITE_AZURE_TENANT_ID and VITE_AZURE_CLIENT_ID must be set"
  );
}

/**
 * MSAL configuration object
 * @see https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/configuration.md
 */
export const msalConfig: Configuration = {
  auth: {
    // Your Azure Entra External ID client ID
    clientId: clientId,

    // Authority URL for External ID tenant
    // Format: https://{tenant-subdomain}.ciamlogin.com/{tenant-subdomain}
    authority: `https://${tenantId}.ciamlogin.com/${tenantId}`,

    // Redirect URI after successful authentication
    redirectUri: redirectUri,

    // Redirect URI after logout
    postLogoutRedirectUri: redirectUri,

    // Navigate to login request URL after callback
    navigateToLoginRequestUrl: true,
  },

  cache: {
    // Configure cache location
    // "localStorage" persists across browser sessions
    // "sessionStorage" clears when browser closes
    cacheLocation: "localStorage",

    // Set to true to enable cookies for IE/Edge support
    storeAuthStateInCookie: false,
  },

  system: {
    loggerOptions: {
      loggerCallback: (
        level: LogLevel,
        message: string,
        containsPii: boolean
      ) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          default:
            return;
        }
      },
      logLevel: import.meta.env.DEV ? LogLevel.Verbose : LogLevel.Warning,
      piiLoggingEnabled: false,
    },

    // Window interaction settings
    windowHashTimeout: 60000,
    iframeHashTimeout: 6000,
    loadFrameTimeout: 0,
  },
};

/**
 * Scopes requested for login
 * These determine what information the app can access
 */
export const loginRequest = {
  scopes: [
    "openid", // Required for OpenID Connect
    "profile", // Access to user's profile information
    "email", // Access to user's email address
    "offline_access", // Refresh token to maintain session
  ],
  prompt: "login" as const, // Always show login prompt
};

/**
 * Create and export MSAL instance
 */
export const msalInstance = new PublicClientApplication(msalConfig);

/**
 * Initialize MSAL
 * Call this before rendering your app
 */
export async function initializeMsal(): Promise<void> {
  await msalInstance.initialize();

  // Handle redirect promise
  const response = await msalInstance.handleRedirectPromise();

  if (response) {
    // User has returned from authentication
    console.log("Authentication successful", response.account);
  }
}
```

### Step 3: Create Authentication Context/Store

Create `apps/web/src/stores/authStore.ts` using Zustand:

```typescript
import { create } from "zustand";
import { msalInstance, loginRequest } from "@/config/msalConfig";
import type { AccountInfo, AuthenticationResult } from "@azure/msal-browser";

interface AuthState {
  account: AccountInfo | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  account: null,
  accessToken: null,
  isAuthenticated: false,
  isInitializing: true,
  error: null,

  /**
   * Initialize authentication state
   * Call this when your app starts
   */
  initialize: async () => {
    try {
      set({ isInitializing: true, error: null });

      // Get all accounts
      const accounts = msalInstance.getAllAccounts();

      if (accounts.length > 0) {
        // Set the first account as active
        const account = accounts[0];
        msalInstance.setActiveAccount(account);

        // Try to acquire token silently
        try {
          const response = await msalInstance.acquireTokenSilent({
            account,
            scopes: loginRequest.scopes,
          });

          set({
            account: response.account,
            accessToken: response.accessToken,
            isAuthenticated: true,
            isInitializing: false,
          });
        } catch (error) {
          // Silent acquisition failed, user needs to login again
          set({
            account,
            accessToken: null,
            isAuthenticated: false,
            isInitializing: false,
          });
        }
      } else {
        set({ isInitializing: false });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Initialization failed";
      set({ error: errorMessage, isInitializing: false });
      console.error("Auth initialization failed:", error);
    }
  },

  /**
   * Sign in using popup
   */
  signIn: async () => {
    try {
      set({ error: null });

      const response: AuthenticationResult =
        await msalInstance.loginPopup(loginRequest);

      msalInstance.setActiveAccount(response.account);

      set({
        account: response.account,
        accessToken: response.accessToken,
        isAuthenticated: true,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Sign in failed";
      set({ error: errorMessage });
      console.error("Sign in failed:", error);
      throw error;
    }
  },

  /**
   * Sign in with specific email (for Email OTP flow)
   */
  signInWithEmail: async (email: string) => {
    try {
      set({ error: null });

      const response: AuthenticationResult = await msalInstance.loginPopup({
        ...loginRequest,
        loginHint: email, // Pre-fill email in Azure login
      });

      msalInstance.setActiveAccount(response.account);

      set({
        account: response.account,
        accessToken: response.accessToken,
        isAuthenticated: true,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Sign in failed";
      set({ error: errorMessage });
      console.error("Sign in with email failed:", error);
      throw error;
    }
  },

  /**
   * Sign out
   */
  signOut: async () => {
    try {
      const account = get().account;

      if (account) {
        await msalInstance.logoutPopup({
          account,
        });
      }

      set({
        account: null,
        accessToken: null,
        isAuthenticated: false,
        error: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Sign out failed";
      set({ error: errorMessage });
      console.error("Sign out failed:", error);
      throw error;
    }
  },

  /**
   * Get access token (acquire silently if needed)
   */
  getAccessToken: async (): Promise<string | null> => {
    const { account, accessToken } = get();

    if (!account) {
      return null;
    }

    // If we have a token, return it
    if (accessToken) {
      return accessToken;
    }

    // Try to acquire token silently
    try {
      const response = await msalInstance.acquireTokenSilent({
        account,
        scopes: loginRequest.scopes,
      });

      set({ accessToken: response.accessToken });
      return response.accessToken;
    } catch (error) {
      console.error("Failed to acquire token silently:", error);

      // If silent acquisition fails, trigger interactive login
      try {
        const response = await msalInstance.acquireTokenPopup({
          account,
          scopes: loginRequest.scopes,
        });

        set({ accessToken: response.accessToken });
        return response.accessToken;
      } catch (popupError) {
        console.error("Failed to acquire token with popup:", popupError);
        return null;
      }
    }
  },
}));
```

### Step 4: Initialize MSAL in Main App

Update `apps/web/src/main.tsx`:

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initializeMsal } from './config/msalConfig';
import { useAuthStore } from './stores/authStore';

// Initialize MSAL before rendering
initializeMsal()
  .then(() => {
    // Initialize auth store
    return useAuthStore.getState().initialize();
  })
  .then(() => {
    // Render app
    const root = document.getElementById('root');
    if (!root) throw new Error('Root element not found');

    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  })
  .catch((error) => {
    console.error('Failed to initialize app:', error);
  });
```

### Step 5: Create Authentication Hook

Create `apps/web/src/hooks/useAuth.ts`:

```typescript
import { useAuthStore } from "@/stores/authStore";

/**
 * Hook to access authentication state and actions
 */
export function useAuth() {
  const {
    account,
    accessToken,
    isAuthenticated,
    isInitializing,
    error,
    signIn,
    signInWithEmail,
    signOut,
    getAccessToken,
  } = useAuthStore();

  return {
    // State
    user: account
      ? {
          id: account.localAccountId,
          email: account.username,
          name: account.name,
        }
      : null,
    isAuthenticated,
    isLoading: isInitializing,
    error,

    // Actions
    signIn,
    signInWithEmail,
    signOut,
    getAccessToken,
  };
}
```

### Step 6: Configure API Client to Include Token

Update your API client to include the access token:

Create or update `apps/web/src/lib/apiClient.ts`:

```typescript
import ky from "ky";
import { useAuthStore } from "@/stores/authStore";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

/**
 * API client with automatic authentication
 */
export const apiClient = ky.create({
  prefixUrl: API_BASE_URL,
  hooks: {
    beforeRequest: [
      async (request) => {
        // Get access token
        const token = await useAuthStore.getState().getAccessToken();

        if (token) {
          // Add Authorization header
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (request, options, response) => {
        // Handle 401 Unauthorized
        if (response.status === 401) {
          // Token might be expired, try to refresh
          const token = await useAuthStore.getState().getAccessToken();

          if (token) {
            // Retry request with new token
            request.headers.set("Authorization", `Bearer ${token}`);
            return ky(request);
          }
        }

        return response;
      },
    ],
  },
});
```

---

## ⚙️ Backend Easy-Auth Configuration

The backend is already configured with Easy-Auth support through the `EasyAuthProvider`. Here's how it works:

### How Easy-Auth Works (via Azure Portal → App Service → Authentication → Add Microsoft identity provider):

1. **Request arrives** at Azure App Service
2. **Azure checks** for Bearer token in `Authorization` header
3. **Azure validates** the token against Microsoft identity platform
4. **If valid**, Azure injects user information into special headers:
   - `X-MS-CLIENT-PRINCIPAL`: Base64-encoded JSON with user claims
   - `X-MS-CLIENT-PRINCIPAL-ID`: User's unique identifier
   - `X-MS-CLIENT-PRINCIPAL-NAME`: User's display name/email
5. **Request forwarded** to your Fastify API with these headers
6. **EasyAuthProvider** reads the headers and extracts user information

> **✨ Key Benefit**: Your API code doesn't need to validate tokens - Azure App Service does it for you!

- `X-MS-CLIENT-PRINCIPAL-ID`: User's unique identifier
- `X-MS-CLIENT-PRINCIPAL-NAME`: User's display name/email

### EasyAuthProvider Implementation

The API includes `apps/api/src/auth/providers/EasyAuthProvider.ts` which:

```typescript
/**
 * Reads X-MS-CLIENT-PRINCIPAL header
 * Decodes base64 → JSON
 * Extracts user claims (email, OID, etc.)
 * Returns AuthUser object
 */
export class EasyAuthProvider implements AuthProvider {
  readonly type = "easy-auth" as const;

  async authenticate(request: FastifyRequest): Promise<AuthResult> {
    const principalHeader = request.headers["x-ms-client-principal"];

    if (!principalHeader) {
      return { success: false, error: "User not authenticated" };
    }

    // Decode and parse
    const decoded = Buffer.from(principalHeader, "base64").toString("utf-8");
    const principal = JSON.parse(decoded);

    // Extract claims
    const email = principal.claims.find((c) => c.typ === "email")?.val;
    const oid = principal.claims.find((c) => c.typ === "oid")?.val;

    return {
      success: true,
      user: {
        idpUserId: oid,
        email,
        idpName: "easy-auth",
      },
    };
  }
}
```

### Environment Variable Configuration

Set `AUTH_PROVIDER` to enable Easy-Auth:

```bash
# In apps/api/.env (development)
AUTH_PROVIDER=easy-auth

# Or for local testing without Easy-Auth
AUTH_PROVIDER=none
```

In production, this is set automatically via `infra/modules/appService.bicep`.

### Test Frontend Authentication Locally

1. Start the development servers:

```bash
# Terminal 2 - Start Web
cd apps/web
pnpm dev
```

2. Open browser to `http://localhost:5173`

3. Click "Sign In" button

4. You should see Azure's login popup/redirect

5. Enter your email address

6. Check your email for the OTP code

7. Enter the code

8. You should be redirected back to the app, authenticated

### Test API Authentication

Since Easy-Auth only works on Azure App Service, you can test locally using:

```bash
# Set AUTH_PROVIDER=none for local development
AUTH_PROVIDER=none
VITE_API_BASE_URL=api-on-azure.com/api
```

And configure your `VITE_API_BASE_URL` to use your deployed backend on Azure

### Test End-to-End on Azure

1. Deploy frontend and backend to Azure

2. Open your production URL

3. Test the complete authentication flow

4. Check Azure Application Insights for authentication logs

---Frontend App Registration created with correct redirect URIs

- ✅ Easy Auth enabled on App Service via Azure Portal (Authentication → Add Microsoft)
- ✅ Bicep variables configured with correct tenant ID
- ✅ Production environment variables configured for frontend

### Deploy Infrastructure

```bash
cd infra
./deploy.sh production
```

### Deploy API

```bash
cd infra
./deploy-api.sh production
```

### Deploy Frontend

```bash
cd infra
./deploy-web.sh production
```

## 🐛 Troubleshooting

### MSAL Errors

#### "MSAL is not initialized"

- **Cause**: MSAL not initialized before use
- **Solution**: Ensure `initializeMsal()` is called before rendering app

#### "Popup blocked"

- \***\*Verify Easy Auth is enabled**: Go to Azure Portal → App Service → Authentication → Should show Microsoft provider
  - Ensure `AUTH_PROVIDER=easy-auth` is set in App Service environment variables
  - Check that frontend sends `Authorization: Bearer <token>` header
  - Verify token is valid and not expired
  - Check Easy Auth settings: "Restrict access" should be "Require authentication"

#### "redirect_uri_mismatch"

- **Cause**: Redirect URI in code doesn't match Azure registration
- **Solution**: Check `VITE_AZURE_REDIRECT_URI` matches exactly what's in Azure

### Easy-Auth Errors

#### "X-MS-CLIENT-PRINCIPAL header not found"

- **Cause**: Easy-Auth not enabled or request not authenticated
- **Solution**:
  - Verify `AUTH_PROVIDER=easy-auth` is set in App Service
  - Check that request includes `Authorization: Bearer <token>` header
  - Verify token is valid and not expired

#### "Failed to parse principal"

- **Cause**: Header format is incorrect
- **Solution**: Check App Service authentication logs, verify Easy-Auth is configured correctly

### Token Issues

#### "Token expired"

- **Cause**: Access token has expired (typically 1 hour lifetime)
- **Solution**: MSAL automatically handles refresh tokens; check `offline_access` scope is included

#### "Invalid audience"

- **Cause**: Token audience doesn't match `AZURE_API_CLIENT_ID`
- **Solution**: Verify client IDs match between frontend and backend configuration

### Network Issues

#### CORS errors

- **Cause**: API not allowing frontend origin
- **Solution**: Configure CORS in Fastify or Azure App Service

#### 401 Unauthorized

- **Cause**: Token not included or invalid
- **Solution**: Check browser DevTools → Network tab → Request headers

---

## 📚 Additional Resources

### Documentation

- [Azure Entra External ID Documentation](https://learn.microsoft.com/en-us/entra/external-id/)
- [MSAL.js Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js)
- [Azure Easy-Auth Documentation](https://learn.microsoft.com/en-us/azure/app-service/overview-authentication-authorization)

### Internal Documentation

- [Azure Entra External ID OTP Guide](./AzureEntraExternalID-OTP.md)
- [Infrastructure Deployment Guide](./Infra/Deployment.md)
- [API Deployment Guide](./Infra/ApiDeployment.md)
