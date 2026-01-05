import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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
import { ensureUserProfile, getUserProfile } from "../services/userService";
import type { UserRole, Permission } from "../types/roles";
import { hasPermission } from "../types/roles";

export type { UserRole };

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
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  can: (permission: Permission) => boolean;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

async function loadUserWithProfile(user: User): Promise<AuthUser> {
  // Ensure user profile exists in Firestore and get the role
  const profile = await ensureUserProfile(
    user.uid,
    user.email || "",
    user.displayName || undefined
  );

  // Check if user is deactivated
  if (!profile.isActive) {
    throw new Error("Your account has been deactivated. Please contact an administrator.");
  }

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || profile.displayName || null,
    role: profile.role,
    isActive: profile.isActive,
    allowedDevelopments: profile.allowedDevelopments,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function signup(email: string, password: string, name: string) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Update profile with display name
    await updateProfile(userCredential.user, { displayName: name });
    const authUser = await loadUserWithProfile(userCredential.user);
    setCurrentUser(authUser);
  }

  async function login(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const authUser = await loadUserWithProfile(userCredential.user);
    setCurrentUser(authUser);
  }

  async function logout() {
    await signOut(auth);
    setCurrentUser(null);
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  // Check if current user has a specific permission
  function can(permission: Permission): boolean {
    return hasPermission(currentUser?.role, permission);
  }

  // Refresh user profile from Firestore (useful after role changes)
  async function refreshUserProfile() {
    if (auth.currentUser) {
      const profile = await getUserProfile(auth.currentUser.uid);
      if (profile) {
        setCurrentUser({
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
          displayName: auth.currentUser.displayName || profile.displayName || null,
          role: profile.role,
          isActive: profile.isActive,
          allowedDevelopments: profile.allowedDevelopments,
        });
      }
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const authUser = await loadUserWithProfile(user);
          setCurrentUser(authUser);
        } catch (error) {
          console.error("Error loading user profile:", error);
          // Check if this is a deactivation error
          if (error instanceof Error && error.message.includes("deactivated")) {
            // Sign out the deactivated user
            await signOut(auth);
            setCurrentUser(null);
            alert(error.message);
          } else {
            // Fallback to viewer role if profile load fails
            setCurrentUser({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              role: "viewer",
              isActive: true,
            });
          }
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    loading,
    login,
    signup,
    logout,
    resetPassword,
    can,
    refreshUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
