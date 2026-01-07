/**
 * Authentication Context
 *
 * Handles:
 * - User authentication state
 * - Access control (blocks unauthorized users)
 * - Invite-based signup flow
 * - Permission checks
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth } from "../config/firebase";
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
  login: (email: string, password: string) => Promise<void>;
  signupWithInvite: (email: string, password: string, name: string, invite: UserInvite) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState<AccessDenialReason>(null);
  const [pendingInvite, setPendingInvite] = useState<UserInvite | null>(null);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  /**
   * Load user profile and validate access
   * Includes retry logic for race conditions after signup
   */
  const loadUserWithProfile = useCallback(async (user: User): Promise<AuthUser | null> => {
    // Try to get profile with retries (handles Firestore sync delay after signup)
    let profile = await getUserProfile(user.uid);

    if (!profile) {
      // Profile not found - retry a few times in case of sync delay
      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        profile = await getUserProfile(user.uid);
        if (profile) break;
      }
    }

    if (!profile) {
      // No profile exists - check if this is an admin email
      if (user.email && isSystemAdminEmail(user.email)) {
        // Create admin profile automatically
        const adminProfile = await createAdminUserProfile(
          user.uid,
          user.email,
          user.displayName || undefined
        );
        return {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || adminProfile.displayName || null,
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
    await updateLastLogin(user.uid);

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || profile.displayName || null,
      role: profile.role,
      isActive: profile.isActive,
      allowedDevelopments: profile.allowedDevelopments,
    };
  }, []);

  /**
   * Login with email and password
   */
  async function login(email: string, password: string) {
    setAccessDenied(null);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const authUser = await loadUserWithProfile(userCredential.user);

    if (!authUser) {
      // User is not authorized - sign them out
      await signOut(auth);
      throw new Error("Access denied. You need an invitation to access this system.");
    }

    setCurrentUser(authUser);
  }

  /**
   * Signup with a valid invite token
   */
  async function signupWithInvite(
    email: string,
    password: string,
    name: string,
    invite: UserInvite
  ) {
    // Validate email matches invite
    if (email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new Error("Email does not match the invitation");
    }

    // Create Firebase Auth account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Update profile with display name
    await updateProfile(userCredential.user, { displayName: name });

    // Create user profile from invite
    const profile = await createUserFromInvite(
      userCredential.user.uid,
      email,
      name,
      invite
    );

    setCurrentUser({
      uid: userCredential.user.uid,
      email: email,
      displayName: name,
      role: profile.role,
      isActive: profile.isActive,
      allowedDevelopments: profile.allowedDevelopments,
    });

    setPendingInvite(null);
    setAccessDenied(null);
  }

  /**
   * Logout
   */
  async function logout() {
    await signOut(auth);
    setCurrentUser(null);
    setAccessDenied(null);
    setPendingInvite(null);
    setNotifications([]);
    setUnreadCount(0);
  }

  /**
   * Reset password
   */
  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  /**
   * Check if current user has a specific permission
   */
  function can(permission: Permission): boolean {
    return hasPermission(currentUser?.role, permission);
  }

  /**
   * Refresh user profile from Firestore
   */
  async function refreshUserProfile() {
    if (auth.currentUser) {
      const authUser = await loadUserWithProfile(auth.currentUser);
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);

      if (user) {
        try {
          const authUser = await loadUserWithProfile(user);
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
    });

    return unsubscribe;
  }, [loadUserWithProfile]);

  // Load notifications when user changes - intentional data loading pattern
  useEffect(() => {
    if (currentUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    resetPassword,
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
