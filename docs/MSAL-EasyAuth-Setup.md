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
>
> **🔧 Custom Authentication**: If you need more control (e.g., custom token validation, non-Azure hosting), see the [Optional Steps](#optional-steps-for-custom-authentication) section at the end of this document.

---

## ✅ Required Steps (Easy-Auth Default Setup)

These steps configure the recommended Easy-Auth approach where Azure App Service automatically validates tokens and injects user information into request headers.

### Step 1: Create Azure Entra External ID Tenant

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Search for **"Microsoft Entra External ID"** or **"External Identities"**
3. Click **"Create a tenant"** → Select **"External ID tenant"**
4. Configure:
   - **Tenant name**: `undp-huella-latam` (or your preferred name)
   - **Domain name**: `undphuella` (this becomes `undphuella.ciamlogin.com`)
   - **Location**: Choose closest to your users (e.g., United States, Europe, LATAM)
5. Review and create (this may take a few minutes)
6. **Save the Tenant ID** - you'll see it in Overview (format: a short alphanumeric string, e.g., `undphuella`)

### Step 2: Register Frontend Application (for MSAL)

> **📱 Important**: This App Registration is for your **frontend web application** that will use MSAL.js for browser-based authentication.

1. Go to **App registrations** → Click **"New registration"**
2. Configure the registration:

   **Basic Information:**
   - **Name**: `Huella Latam Web App - Frontend MSAL` (or any descriptive name)
     - 💡 **Tip**: Use explicit names to differentiate between apps later (e.g., `YourApp-Frontend`, `YourApp-API`)
   - **Supported account types**:
     - Select: "Accounts in this organizational directory only"

   **Redirect URIs:**
   - **Platform**: Single-page application (SPA)
   - **Development URI**: `http://localhost:5173`
   - **Production URI**: `https://your-production-domain.com`
   - _(You can add multiple URIs)_

3. Click **"Register"**

4. **Save these values** (you'll need them later):
   - **Application (client) ID** - Located in Overview (UUID format)
   - **Directory (tenant) ID** - Should match your subdomain

### Step 3: Create Sign-in/Sign-up User Flow

> **🔐 Important**: After creating the Frontend App Registration, you need to set up a User Flow that defines how users will authenticate using Email OTP.

1. In your External ID tenant, navigate to **"External Identities"** in the left menu
2. Go to **"User flows"**
3. Click **"New user flow"**
4. Select **"Sign up and sign in"** as the user flow type
5. Configure the user flow:
   - **Name**: `SignUpSignIn` (or your preferred name)
   - **Identity providers**:
     - ✅ Check **"Email one-time passcode"**
   - **User attributes**: Select which attributes to collect during sign-up:
     - ✅ Email Address (required)
     - ✅ Display Name (optional but recommended)
     - Add any other attributes your app needs
   - **Application claims**: Select which claims to include in tokens:
     - ✅ Email Addresses
     - ✅ Display Name
     - ✅ User's Object ID
6. Click **"Create"**
7. **Important**: Associate this user flow with your frontend app registration:
   - Go back to your App Registration (Huella Latam Web App)
   - The user flow will be available for authentication

> **💡 Note**: Users will now authenticate using the Email OTP flow you just configured. They'll receive a one-time passcode to their email address when signing in.

### Step 4: Enable Easy Auth on App Service (API)

> **✨ Important**: For the API backend, you don't need to manually create a separate App Registration. Azure App Service can automatically create one when you enable Easy Auth.

1. Navigate to **Azure Portal** → **App Services**
2. Select your API App Service (e.g., `undp-huella-latam-api`)
3. In the left menu, go to **"Authentication"**
4. Click **"Add identity provider"**
5. Select **"Microsoft"** as the identity provider
6. Configure the settings:
   - **App registration type**: Choose **"Create new app registration"**
   - **Name**: `Huella Latam API - Backend EasyAuth` (or keep auto-generated name)
     - 💡 **Tip**: Use a clear, descriptive name like `YourApp-API-EasyAuth` to easily identify this as the backend API app registration
   - **Supported account types**:
     - Select **"Current tenant - Single tenant"** if using External ID
   - **Restrict access**: Choose **"Require authentication"**
   - **Unauthenticated requests**: Select **"HTTP 401 Unauthorized"**
   - **Token store**: Enable (recommended)
7. Click **"Add"**

Azure will automatically:

- ✅ Create an App Registration for your API
- ✅ Configure the necessary redirect URIs
- ✅ Set up the authentication flow
- ✅ Inject user information into request headers (`X-MS-CLIENT-PRINCIPAL`)

8. After creation, note down the **Client ID** that was generated for the API App Registration

> **🔑 Key Point**: The App Registration you created in Step 2 is for the **frontend** (web app). The App Registration Azure creates here is for the **backend API** Easy Auth. These are two separate app registrations:
>
> - **Frontend App**: Used by MSAL in the browser
> - **Backend API App**: Used by Easy Auth on App Service

---

## 📚 Optional Steps for Custom Authentication

> **⚠️ These steps are NOT required for the default Easy-Auth setup.** Only configure these if you need:
>
> - Custom token validation logic (not using Easy-Auth)
> - Direct API calls from frontend to backend with custom scopes
> - Access to Microsoft Graph API beyond basic profile information
> - Non-Azure hosting requiring manual token validation
>
> **Note**: Implementing custom authentication requires additional code changes in your API backend.

### Optional Step 1: Configure API Permissions (Advanced - Microsoft Graph Access)

> **⚠️ Skip this step** if you're only using Email OTP authentication with the default scopes (openid, profile, email, offline_access).

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

### Optional Step 2: Expose an API (Custom API Authentication)

> **⚠️ Important**: You need this step **only if** your frontend will call your backend API with the user's access token, and you're **NOT using Easy-Auth** (or implementing custom token validation alongside Easy-Auth).

**When to use this:**

- ✅ Frontend calls API endpoints that validate the user's token from MSAL
- ✅ You want fine-grained permission scopes for your API (e.g., `api://myapp/read`, `api://myapp/write`)
- ✅ You're implementing custom token validation (not relying on Easy-Auth)
- ✅ Hosting your API outside Azure App Service

**When to skip this:**

- ❌ You're using Easy-Auth exclusively (Azure handles tokens for you) - **This is the default approach**
- ❌ Your backend doesn't validate MSAL tokens directly

> **🔧 Code Changes Required**: If you implement this approach, you'll need to modify your API to validate tokens directly instead of using Easy-Auth. This requires implementing JWKS validation or similar token verification logic.

**To expose your API:**

1. In your **Backend API App Registration** (if created manually, or the one created by Easy Auth in Step 4):
2. Navigate to **"Expose an API"**
3. Click **"Set"** next to Application ID URI:
   - Accept default: `api://{client-id}`
   - Or use custom: `api://huella-latam-api`
4. Click **"Add a scope"**:
   - **Scope name**: `access_as_user`
   - **Who can consent**: Admins and users
   - **Admin consent display name**: Access Huella Latam API
   - **Admin consent description**: Allows the app to access Huella Latam API on behalf of the signed-in user
   - **User consent display name**: Access Huella Latam API
   - **User consent description**: Allows the app to access Huella Latam API on your behalf
   - **State**: Enabled
5. Click **"Add scope"**

6. **Grant permission from Frontend to Backend**:
   - Go to your **Frontend App Registration** (from Step 2)
   - Navigate to **"API permissions"**
   - Click **"Add a permission"** → **"My APIs"**
   - Select your Backend API
   - Check the scope you created (e.g., `access_as_user`)
   - Click **"Add permissions"**
   - Optionally click **"Grant admin consent"** to pre-approve for all users

7. **Update your MSAL configuration** to request the API scope:
   ```typescript
   export const loginRequest = {
     scopes: [
       "openid",
       "profile",
       "email",
       "offline_access",
       "api://huella-latam-api/access_as_user", // Your custom scope
     ],
   };
   ```

### Optional Step 3: Create Client Secret (Advanced - Server-Side Flows)

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

> **⚠️ Skip this step** if using Easy-Auth (the default approach). Easy-Auth automatically validates tokens.

If you want to implement custom token validation on your API (instead of using Easy-Auth):

1. Set up JWKS endpoint validation in your API code
2. Verify token issuer matches your External ID tenant:
   - Format: `https://{tenant-subdomain}.ciamlogin.com/{tenant-id}/v2.0`
3. Validate token audience matches your API's Client ID
4. Implement token signature verification using JWKS keys

> **🔧 Code Changes Required**: You'll need to modify `apps/api/src/auth` to implement a custom JWT validation provider instead of using `EasyAuthProvider`.

### Optional Step 5: Configure API Exposure (Custom Scopes - Advanced)

> **⚠️ Skip this step** if using Easy-Auth (the default approach).

If you want to define custom scopes for your API (requires custom token validation - see Optional Step 4):

1. Go to the API's App Registration (created in Step 4 or manually)
2. Navigate to **"Expose an API"**
3. Click **"Add a scope"**
4. Set the Application ID URI (default is usually fine: `api://{client-id}`)
5. Define your custom scopes (e.g., `read`, `write`)
6. Grant permissions from your frontend app registration to call the API

> **🔧 Code Changes Required**: Your API must validate these custom scopes in the access token, which requires implementing custom token validation logic.

---

## 🏗️ Infrastructure (Bicep) Configuration

The infrastructure is already set up to support Azure authentication. Here's what you need to know:

### Understanding the Configuration

After following the Azure Portal steps above, you'll have:

- **Frontend App Registration**: Client ID for MSAL (from Step 2)
- **API App Registration**: Automatically created by Easy Auth (from Step 5)

### Step 1: Configure Deployment Environment Variables

The deployment script uses environment variables to configure Azure authentication. Set these in `infra/.env`:

```bash
# Required base configuration
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_RESOURCE_GROUP=rg-undp-huella-latam-dev
AZURE_SUBSCRIPTION_GROUP=your-azure-ad-group
LOCATION=eastus
ENVIRONMENT=development

# Optional: Azure Authentication
AZURE_TENANT_SUBDOMAIN=undphuella  # Your External ID tenant subdomain
AZURE_EXTERNAL_TENANT_ID=624d9c14-5dae-473d-84a7-a41d2731f46e  # Your External ID tenant GUID
AZURE_FRONTEND_CLIENT_ID=12345678-1234-1234-1234-123456789abc  # Frontend app client ID
```

> **💡 Tip**: Copy `infra/.env.example` to `infra/.env` and fill in your values.

**What these variables do:**

- `AZURE_TENANT_SUBDOMAIN`: Your External ID tenant subdomain (e.g., `undphuella` from `undphuella.ciamlogin.com`)
- `AZURE_EXTERNAL_TENANT_ID`: Your External ID tenant GUID (the full UUID shown in Azure Portal, e.g., `624d9c14-5dae-473d-84a7-a41d2731f46e`)
- `AZURE_FRONTEND_CLIENT_ID`: Client ID from your **Frontend App Registration** (Step 2)

> **💡 Note**: Both the subdomain and GUID are required to construct the correct authority URL: `https://{subdomain}.ciamlogin.com/{guid}/v2.0/`

If these variables are **not set**, the API will deploy with `AUTH_PROVIDER=none` (no authentication).

### Step 2: Alternative - Update Bicep Parameters Directly

Alternatively, you can set these directly in `infra/params/main.development.bicepparam`:

```bicep
using '../main.bicep'

// ... existing parameters ...

// --------- Azure Authentication ---------
param enableAzureAuth = true
param azureAuthTenantSubdomain = 'undphuella'  // Your External ID tenant subdomain
param azureAuthTenantId = '624d9c14-5dae-473d-84a7-a41d2731f46e'  // Your External ID tenant GUID
param azureAuthClientId = '12345678-1234-1234-1234-123456789abc'  // Your frontend app client ID
```

> **💡 Important**: The `azureAuthClientId` is your **frontend** app's Client ID from Step 2. The API doesn't need the Easy Auth app registration details - Azure App Service injects authenticated user information directly into headers.

> **🔐 Security Note**: In production, pass these via Azure DevOps/GitHub Actions secure variables or use the environment variable approach.

### Step 3: Deploy Infrastructure

The Bicep deployment will:

- ✅ Store credentials securely in Azure Key Vault
- ✅ Configure App Service with Easy-Auth settings
- ✅ Set up environment variables for the API
- ✅ Generate authority URL automatically

Deploy using the deployment script:

```bash
cd infra
./deploy.sh development  # or your environment name
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

> **✨ Key Benefit**: Your API code doesn't need to validate tokens - Azure App Service does it for you!claims

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

---

## 🌐 Environment Variables

### Frontend (.env)

Create `apps/web/.env`:

```bash
# Azure Entra External ID Configuration
VITE_AZURE_TENANT_ID=undphuella
VITE_AZURE_CLIENT_ID=12345678-1234-1234-1234-123456789abc
VITE_AZURE_REDIRECT_URI=http://localhost:5173

# API Configuration
VITE_API_BASE_URL=http://localhost:8080
```

### Frontend (.env.production)

Create `apps/web/.env.production`:

```bash
# Azure Entra External ID Configuration
VITE_AZURE_TENANT_ID=undphuella
VITE_AZURE_CLIENT_ID=12345678-1234-1234-1234-123456789abc
VITE_AZURE_REDIRECT_URI=https://your-production-domain.com

# API Configuration
VITE_API_BASE_URL=https://your-api-domain.com
```

### Backend (.env)

Create `apps/api/.env`:

```bash
# Authentication Provider
# Options: "jwks" | "easy-auth" | "none"
AUTH_PROVIDER=none  # Use "none" for local development

# Azure AD Configuration (for JWKS validation if needed)
AZURE_EXTERNAL_TENANT_ID=undphuella
AZURE_API_CLIENT_ID=12345678-1234-1234-1234-123456789abc

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/huella_latam

# Server
API_HOST=localhost
API_PORT=8080
NODE_ENV=development
LOG_LEVEL=debug
```

### Backend (Production via App Service)

These are set automatically via Bicep in Azure App Service:

```bash
AUTH_PROVIDER=easy-auth
AZURE_EXTERNAL_TENANT_ID=undphuella
AZURE_API_CLIENT_ID=12345678-1234-1234-1234-123456789abc
```

---

## 🧪 Testing

### Test Frontend Authentication Locally

1. Start the development servers:

```bash
# Terminal 1 - Start API
cd apps/api
pnpm dev

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
```

Or test with JWKS provider if you want real token validation locally:

```bash
# Use JWKS for local validation
AUTH_PROVIDER=jwks
AZURE_EXTERNAL_TENANT_ID=undphuella
AZURE_API_CLIENT_ID=your-client-id
pnpm dev
```

### Test End-to-End on Azure

1. Deploy frontend and backend to Azure

2. Open your production URL

3. Test the complete authentication flow

4. Check Azure Application Insights for authentication logs

---Frontend App Registration created with correct redirect URIs

- ✅ Easy Auth enabled on App Service via Azure Portal (Authentication → Add Microsoft)
- ✅ Bicep parameters configured with correct tenant ID
- ✅ Production environment variables configured for fronten

### Pre-Deployment Checklist

- ✅ Bicep parameters configured with correct tenant and client IDs
- ✅ Client secret stored securely in Key Vault
- ✅ Redirect URIs updated in Azure App Registration
- ✅ Production environment variables configured
- ✅ CORS configured correctly for your domain
- ✅ Rate limiting enabled
- ✅ Application Insights configured

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

### Post-Deployment Verification

1. Verify Easy Auth is enabled:

```bash
az webapp auth show --name <app-service-name> --resource-group <rg-name>
```

2. Check App Service logs:

```bash
az webapp log tail --name <app-service-name> --resource-group <rg-name>
```

3. Test authentication flow on production URL:
   - Open your frontend app
   - Click sign in
   - Complete Email OTP flow
   - Verify API calls work with authentication

4. Verify user claims are being read correctly:
   - Check API logs for `X-MS-CLIENT-PRINCIPAL` header
   - Confirm user information is extracted properly

5. Check Application Insights for any errors

---

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

---

## 🔒 Security Best Practices

1. **Never commit secrets** to version control
2. **Use Key Vault** for all production secrets
3. **Enable HTTPS only** in production
4. **Implement rate limiting** to prevent abuse
5. **Validate all tokens** on the backend, never trust frontend
6. **Use secure flags** on cookies if applicable
7. **Monitor authentication logs** for suspicious activity
8. **Rotate client secrets** periodically
9. **Implement proper CORS** policies
10. **Use Content Security Policy (CSP)** headers

---

## ✅ Summary

This guide provides a complete authentication system with two approaches:

### 🎯 Default Approach (Recommended): Easy-Auth

**What you get:**

- ✅ **Frontend**: MSAL.js for Azure Entra External ID authentication
- ✅ **Backend**: Easy-Auth for seamless Azure App Service integration
- ✅ **Infrastructure**: Bicep templates for automated deployment
- ✅ **Security**: Secrets stored in Key Vault
- ✅ **Email OTP**: Passwordless authentication for users
- ✅ **Minimal Code Changes**: Azure handles token validation automatically

**Follow these steps:**

1. Step 1: Create Azure Entra External ID Tenant
2. Step 2: Register Frontend Application
3. Step 3: Create Sign-in/Sign-up User Flow
4. Step 4: Enable Easy Auth on App Service

### 🔧 Custom Authentication (Advanced)

**When to use:**

- You need custom token validation logic
- Your API is hosted outside Azure App Service
- You require fine-grained custom scopes for your API
- You need access to Microsoft Graph API beyond basic profile

**Additional requirements:**

- ⚠️ **Code Changes Required**: Implement JWKS token validation in your API
- ⚠️ **More Complexity**: Manual token validation and error handling
- ⚠️ **Additional Configuration**: See [Optional Steps](#optional-steps-for-custom-authentication)

---

For questions or issues, refer to the [Troubleshooting](#troubleshooting) section or contact the development team.
