/**
 * Azure Authentication Context
 *
 * Handles:
 * - User authentication with Azure AD (Entra ID)
 * - Access control (blocks unauthorized users)
 * - Invite-based signup flow with guest users
 * - Permission checks
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
// InteractionRequiredAuthError available if needed for error handling
import { msalInstance, loginRequest, initializeMsal, getActiveAccount } from "../config/azure";
import {
  getUserProfile,
  updateLastLogin,
  createUserFromInvite,
  createAdminUserProfile,
  getInviteByToken,
  isSystemAdminEmail,
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/userService";
import type { UserRole, Permission, UserNotification, UserInvite } from "../types/roles";
import { hasPermission } from "../types/roles";

export type { UserRole };

// Access denial reasons
export type AccessDenialReason =
  | "no_invite" // Signed in but no invite and not an admin email
  | "deactivated" // User account has been deactivated
  | "no_profile" // Signed in but no user profile exists
  | null;

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  isActive: boolean;
  allowedDevelopments?: string[];
}

interface AuthContextType {
  currentUser: AuthUser | null;
  loading: boolean;
  accessDenied: AccessDenialReason;
  pendingInvite: UserInvite | null;
  notifications: UserNotification[];
  unreadCount: number;
  login: () => Promise<void>;
  signupWithInvite: (displayName: string, invite: UserInvite) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: Permission) => boolean;
  refreshUserProfile: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  validateInviteToken: (token: string) => Promise<UserInvite | null>;
  clearAccessDenied: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AzureAuthProvider({ children }: { children: ReactNode }) {
  const { accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState<AccessDenialReason>(null);
  const [pendingInvite, setPendingInvite] = useState<UserInvite | null>(null);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  /**
   * Initialize MSAL on mount
   */
  useEffect(() => {
    initializeMsal();
  }, []);

  /**
   * Load user profile and validate access
   */
  const loadUserWithProfile = useCallback(async (msalAccount: any): Promise<AuthUser | null> => {
    const uid = msalAccount.homeAccountId;
    const email = msalAccount.username;

    // Try to get profile with retries (handles Cosmos DB sync delay after signup)
    let profile = await getUserProfile(uid);

    if (!profile) {
      // Profile not found - retry a few times in case of sync delay
      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        profile = await getUserProfile(uid);
        if (profile) break;
      }
    }

    if (!profile) {
      // No profile exists - check if this is an admin email
      if (email && isSystemAdminEmail(email)) {
        // Create admin profile automatically
        const adminProfile = await createAdminUserProfile(
          uid,
          email,
          msalAccount.name || undefined
        );
        return {
          uid,
          email,
          displayName: msalAccount.name || adminProfile.displayName || null,
          role: adminProfile.role,
          isActive: adminProfile.isActive,
          allowedDevelopments: adminProfile.allowedDevelopments,
        };
      }

      // Not an admin and no profile - access denied
      setAccessDenied("no_invite");
      return null;
    }

    // Check if user is deactivated
    if (!profile.isActive) {
      setAccessDenied("deactivated");
      return null;
    }

    // Update last login
    await updateLastLogin(uid);

    return {
      uid,
      email,
      displayName: msalAccount.name || profile.displayName || null,
      role: profile.role,
      isActive: profile.isActive,
      allowedDevelopments: profile.allowedDevelopments,
    };
  }, []);

  /**
   * Login with Azure AD redirect
   */
  async function login() {
    setAccessDenied(null);
    try {
      await msalInstance.loginRedirect(loginRequest);
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error('Failed to initiate login');
    }
  }

  /**
   * Signup with a valid invite token
   * Creates Entra ID guest user and Cosmos DB profile
   */
  async function signupWithInvite(
    displayName: string,
    invite: UserInvite
  ) {
    // First, authenticate with Azure AD
    try {
      await msalInstance.loginRedirect({
        ...loginRequest,
        loginHint: invite.email,
      });

      // After redirect, the user will be authenticated
      // The profile will be created in the auth state handler
      // Store the invite for profile creation
      sessionStorage.setItem('pendingInvite', JSON.stringify(invite));
      sessionStorage.setItem('pendingDisplayName', displayName);
    } catch (error) {
      console.error('Signup failed:', error);
      throw new Error('Failed to complete signup');
    }
  }

  /**
   * Logout
   */
  async function logout() {
    await msalInstance.logoutRedirect();
    setCurrentUser(null);
    setAccessDenied(null);
    setPendingInvite(null);
    setNotifications([]);
    setUnreadCount(0);
  }

  /**
   * Check if current user has a specific permission
   */
  function can(permission: Permission): boolean {
    return hasPermission(currentUser?.role, permission);
  }

  /**
   * Refresh user profile from Cosmos DB
   */
  async function refreshUserProfile() {
    const account = getActiveAccount();
    if (account) {
      const authUser = await loadUserWithProfile(account);
      if (authUser) {
        setCurrentUser(authUser);
      }
    }
  }

  /**
   * Validate an invite token
   */
  async function validateInviteToken(token: string): Promise<UserInvite | null> {
    const invite = await getInviteByToken(token);
    if (invite) {
      setPendingInvite(invite);
    }
    return invite;
  }

  /**
   * Clear access denied state
   */
  function clearAccessDenied() {
    setAccessDenied(null);
  }

  /**
   * Refresh notifications
   */
  const refreshNotifications = useCallback(async () => {
    if (currentUser) {
      const [notifs, count] = await Promise.all([
        getUserNotifications(currentUser.uid),
        getUnreadNotificationCount(currentUser.uid),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    }
  }, [currentUser]);

  /**
   * Mark a notification as read
   */
  async function markNotificationRead(notificationId: string) {
    await markNotificationAsRead(notificationId);
    await refreshNotifications();
  }

  /**
   * Mark all notifications as read
   */
  async function markAllNotificationsRead() {
    if (currentUser) {
      await markAllNotificationsAsRead(currentUser.uid);
      await refreshNotifications();
    }
  }

  // Auth state listener
  useEffect(() => {
    async function handleAuthState() {
      setLoading(true);

      if (isAuthenticated && accounts.length > 0) {
        const account = accounts[0];

        try {
          // Check for pending invite from signup flow
          const pendingInviteStr = sessionStorage.getItem('pendingInvite');
          const pendingDisplayName = sessionStorage.getItem('pendingDisplayName');

          if (pendingInviteStr && pendingDisplayName) {
            // Complete signup flow
            const invite = JSON.parse(pendingInviteStr);
            await createUserFromInvite(
              account.homeAccountId,
              account.username,
              pendingDisplayName,
              invite
            );

            // Clear pending data
            sessionStorage.removeItem('pendingInvite');
            sessionStorage.removeItem('pendingDisplayName');
          }

          const authUser = await loadUserWithProfile(account);
          if (authUser) {
            setCurrentUser(authUser);
            setAccessDenied(null);
          } else {
            setCurrentUser(null);
            // accessDenied is already set by loadUserWithProfile
          }
        } catch (error) {
          console.error("Error loading user profile:", error);
          setCurrentUser(null);
          setAccessDenied("no_profile");
        }
      } else {
        setCurrentUser(null);
        setAccessDenied(null);
      }

      setLoading(false);
    }

    handleAuthState();
  }, [isAuthenticated, accounts, loadUserWithProfile]);

  // Load notifications when user changes
  useEffect(() => {
    if (currentUser) {
      refreshNotifications();
    }
  }, [currentUser, refreshNotifications]);

  const value: AuthContextType = {
    currentUser,
    loading,
    accessDenied,
    pendingInvite,
    notifications,
    unreadCount,
    login,
    signupWithInvite,
    logout,
    can,
    refreshUserProfile,
    refreshNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    validateInviteToken,
    clearAccessDenied,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// For backwards compatibility during migration
export { AzureAuthProvider as AuthProvider };
