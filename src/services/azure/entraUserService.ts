/**
 * Azure AD (Entra ID) User Service
 *
 * Handles creating guest users in Entra ID
 * Part of custom invite flow (not native B2B invitations)
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { acquireTokenSilent, graphScopes } from '../../config/azure';

/**
 * Get authenticated Graph API client with elevated permissions
 */
function getGraphClient(): Client {
  return Client.init({
    authProvider: async (done) => {
      try {
        const token = await acquireTokenSilent([
          ...graphScopes.userReadWriteAll,
          ...graphScopes.directoryReadWriteAll,
        ]);
        done(null, token);
      } catch (error) {
        done(error as Error, null);
      }
    },
  });
}

/**
 * Create guest user in Entra ID
 * Called after user clicks custom email invitation link and completes signup
 */
export async function createGuestUser(
  email: string,
  displayName: string
): Promise<string> {
  const client = getGraphClient();

  const invitation = {
    invitedUserEmailAddress: email,
    invitedUserDisplayName: displayName,
    inviteRedirectUrl: import.meta.env.VITE_APP_URL || window.location.origin,
    sendInvitationMessage: false, // We already sent custom email via Graph API
  };

  try {
    const response = await client.api('/invitations').post(invitation);
    return response.invitedUser.id; // Return the Entra ID user object ID
  } catch (error) {
    console.error('Error creating guest user:', error);
    throw new Error('Failed to create guest user in Entra ID');
  }
}

/**
 * Get user profile from Entra ID by email
 */
export async function getUserByEmail(email: string): Promise<any | null> {
  const client = getGraphClient();

  try {
    const users = await client
      .api('/users')
      .filter(`mail eq '${email}' or userPrincipalName eq '${email}'`)
      .get();

    if (users.value && users.value.length > 0) {
      return users.value[0];
    }
    return null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

/**
 * Check if user is a guest (external user)
 */
export function isGuestUser(userPrincipalName: string): boolean {
  return userPrincipalName.includes('#EXT#');
}

/**
 * Check if user is a member (internal user)
 */
export function isMemberUser(userPrincipalName: string): boolean {
  return !userPrincipalName.includes('#EXT#');
}
