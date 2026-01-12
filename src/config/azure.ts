/**
 * Azure AD (Entra ID) Configuration
 *
 * MSAL.js configuration for authentication with Azure AD
 */

import { PublicClientApplication, LogLevel, type Configuration } from '@azure/msal-browser';

// MSAL Configuration
export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AAD_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AAD_TENANT_ID || 'common'}`,
    redirectUri: import.meta.env.VITE_AAD_REDIRECT_URI || window.location.origin + '/auth/callback',
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
          default:
            return;
        }
      },
      logLevel: LogLevel.Warning,
    },
  },
};

// Create MSAL instance
export const msalInstance = new PublicClientApplication(msalConfig);

// Scopes for Microsoft Graph API
export const loginRequest = {
  scopes: ['User.Read', 'Mail.Send'],
};

export const graphScopes = {
  userRead: ['User.Read'],
  mailSend: ['Mail.Send'],
  userReadWriteAll: ['User.ReadWrite.All'],
  directoryReadWriteAll: ['Directory.ReadWrite.All'],
};

/**
 * Initialize MSAL instance
 * Must be called before any authentication operations
 */
export async function initializeMsal(): Promise<void> {
  await msalInstance.initialize();

  // Handle redirect response
  try {
    const response = await msalInstance.handleRedirectPromise();
    if (response) {
      console.log('Redirect response received:', response.account?.username);
    }
  } catch (error) {
    console.error('Error handling redirect:', error);
  }
}

/**
 * Get active account or first account
 */
export function getActiveAccount() {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) return null;

  return msalInstance.getActiveAccount() || accounts[0];
}

/**
 * Acquire access token silently
 */
export async function acquireTokenSilent(scopes: string[]) {
  const account = getActiveAccount();
  if (!account) {
    throw new Error('No active account');
  }

  try {
    const response = await msalInstance.acquireTokenSilent({
      scopes,
      account,
    });
    return response.accessToken;
  } catch (error) {
    // If silent token acquisition fails, trigger interactive login
    const response = await msalInstance.acquireTokenPopup({
      scopes,
      account,
    });
    return response.accessToken;
  }
}
