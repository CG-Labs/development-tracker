/**
 * CompleteSignup Component
 *
 * Handles Firebase Magic Link sign-in completion with password setup.
 * Following Firebase documentation: https://firebase.google.com/docs/auth/web/email-link-auth
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getAuth,
  isSignInWithEmailLink,
  signInWithEmailLink,
  updatePassword,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { ROLE_INFO } from "../types/roles";
import { markPasswordSet, getUserProfile } from "../services/userService";
import type { UserRole } from "../types/roles";

type PageState =
  | "initializing"
  | "loading"
  | "needs_email"
  | "signing_in"
  | "password_setup"
  | "setting_password"
  | "success"
  | "error";

export function CompleteSignup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteId = searchParams.get("inviteId");

  const [state, setState] = useState<PageState>("initializing");
  const [error, setError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole | null>(null);

  // Password setup state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const auth = getAuth();

  // Complete sign-in with email link
  const completeSignIn = useCallback(
    async (email: string, name?: string) => {
      setState("signing_in");

      try {
        // Sign in with the email link
        const result = await signInWithEmailLink(auth, email, window.location.href);

        // Clear email from storage
        window.localStorage.removeItem("emailForSignIn");

        // Get inviteId from URL and process invite
        if (inviteId) {
          const inviteDoc = await getDoc(doc(db, "invites", inviteId));

          if (inviteDoc.exists()) {
            const inviteData = inviteDoc.data();

            // Check if user profile already exists
            const userDoc = await getDoc(doc(db, "users", result.user.uid));

            if (!userDoc.exists()) {
              // Create user profile with role from invite
              await setDoc(doc(db, "users", result.user.uid), {
                uid: result.user.uid,
                email: email.toLowerCase(),
                displayName: name || email.split("@")[0],
                role: inviteData.role,
                status: "active",
                isActive: true,
                allowedDevelopments: inviteData.allowedDevelopments || null,
                invitedBy: inviteData.invitedBy,
                invitedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                passwordSet: false,
              });
            }

            // Mark invite as completed
            await updateDoc(doc(db, "invites", inviteId), {
              status: "accepted",
              acceptedAt: serverTimestamp(),
              userId: result.user.uid,
            });
          }
        }

        // Check if password is already set
        const userProfile = await getUserProfile(result.user.uid);
        if (userProfile?.passwordSet) {
          // Password already set, redirect to dashboard
          setState("success");
          setTimeout(() => {
            navigate("/");
          }, 1500);
        } else {
          // Show password setup screen
          setState("password_setup");
        }
      } catch (err) {
        console.error("Error signing in:", err);

        let errorMessage = "Failed to complete sign-in. Please try again.";

        if (err instanceof Error) {
          const errorCode = (err as { code?: string }).code || err.message;

          if (errorCode.includes("invalid-action-code") || errorCode.includes("expired-action-code")) {
            errorMessage = "This sign-in link has expired or already been used. Please request a new invitation.";
          } else if (errorCode.includes("invalid-email")) {
            errorMessage = "Invalid email address. Please check and try again.";
          } else if (errorCode.includes("user-disabled")) {
            errorMessage = "This account has been disabled. Please contact an administrator.";
          } else if (errorCode.includes("network-request-failed")) {
            errorMessage = "Network error. Please check your connection and try again.";
          }
        }

        setError(errorMessage);
        setState("error");
      }
    },
    [auth, inviteId, navigate]
  );

  // Handle password setup
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    // Validate password
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setState("setting_password");

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("No user signed in");
      }

      // Set the password
      await updatePassword(user, password);

      // Mark password as set in Firestore
      await markPasswordSet(user.uid);

      // Wait a moment for Firestore to sync, then verify profile exists
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify profile is ready before redirecting
      let retries = 3;
      while (retries > 0) {
        const profile = await getUserProfile(user.uid);
        if (profile && profile.passwordSet) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
        retries--;
      }

      // Success - redirect to dashboard
      setState("success");
      setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch (err) {
      console.error("Error setting password:", err);

      let errorMessage = "Failed to set password. Please try again.";

      if (err instanceof Error) {
        const errorCode = (err as { code?: string }).code || err.message;

        if (errorCode.includes("requires-recent-login")) {
          errorMessage = "Your session has expired. Please sign in again.";
        } else if (errorCode.includes("weak-password")) {
          errorMessage = "Password is too weak. Please choose a stronger password.";
        }
      }

      setPasswordError(errorMessage);
      setState("password_setup");
    }
  };

  // Run on mount to check auth state and sign-in link
  useEffect(() => {
    let isMounted = true;

    // Wait for auth to be ready
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;

      if (user) {
        // User is already signed in - check if they need to set password
        const userProfile = await getUserProfile(user.uid);
        if (userProfile?.passwordSet) {
          // Already fully set up, redirect to dashboard
          navigate("/");
        } else {
          // Need to set password
          setState("password_setup");
        }
        return;
      }

      // User not signed in - check if this is a sign-in link
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        if (isMounted) {
          setError("Invalid sign-in link. Please request a new invitation.");
          setState("error");
        }
        return;
      }

      // Get email from localStorage (same device flow)
      const email = window.localStorage.getItem("emailForSignIn");

      if (!email) {
        // User opened link on different device - need to ask for email
        if (isMounted) {
          setState("needs_email");
        }

        // Try to pre-fill from invite if we have inviteId
        if (inviteId) {
          try {
            const inviteDoc = await getDoc(doc(db, "invites", inviteId));
            if (inviteDoc.exists() && isMounted) {
              const data = inviteDoc.data();
              setEmailInput(data.email || "");
              setInviteRole(data.role as UserRole);
            }
          } catch (err) {
            console.error("Error fetching invite:", err);
          }
        }
        return;
      }

      // Complete sign-in automatically if we have the email
      if (isMounted) {
        setState("loading");
        await completeSignIn(email);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [auth, inviteId, completeSignIn, navigate]);

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (emailInput.trim()) {
      completeSignIn(emailInput.trim(), displayName || undefined);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
              />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">DevTracker</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Development Portfolio Manager</p>
        </div>

        {/* Card */}
        <div className="card p-6">
          {/* Initializing State */}
          {state === "initializing" && (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[var(--text-secondary)]">Initializing...</p>
            </div>
          )}

          {/* Loading State */}
          {state === "loading" && (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[var(--text-secondary)]">Verifying your invitation...</p>
            </div>
          )}

          {/* Needs Email State */}
          {state === "needs_email" && (
            <div>
              <div className="text-center mb-6">
                <h2 className="font-display text-xl font-bold text-[var(--text-primary)] mb-2">
                  Complete Your Sign Up
                </h2>
                <p className="text-[var(--text-muted)] text-sm mb-2">
                  Please enter the email address where you received the invite.
                </p>
                {inviteRole && (
                  <p className="text-[var(--text-secondary)] text-sm">
                    You've been invited to join as{" "}
                    <span className="font-semibold text-[var(--accent-purple)]">{ROLE_INFO[inviteRole].label}</span>
                  </p>
                )}
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required
                    className="input w-full"
                    placeholder="Enter your email"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Display Name (optional)
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="input w-full"
                    placeholder="Enter your name"
                  />
                </div>

                <button type="submit" className="btn-primary w-full">
                  Complete Sign Up
                </button>
              </form>
            </div>
          )}

          {/* Signing In State */}
          {state === "signing_in" && (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[var(--text-secondary)]">Signing you in...</p>
            </div>
          )}

          {/* Password Setup State */}
          {state === "password_setup" && (
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-[var(--accent-cyan)]/20 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-[var(--accent-cyan)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h2 className="font-display text-xl font-bold text-[var(--text-primary)] mb-2">Set Your Password</h2>
                <p className="text-[var(--text-secondary)] text-sm">
                  Welcome! Please create a password for your account.
                </p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="input w-full"
                    placeholder="Enter password"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="input w-full"
                    placeholder="Confirm password"
                  />
                </div>

                {/* Password requirements */}
                <div className="text-xs text-[var(--text-muted)] space-y-1">
                  <p className={password.length >= 8 ? "text-green-400" : ""}>
                    {password.length >= 8 ? "\u2713" : "\u2022"} At least 8 characters
                  </p>
                  <p className={password && password === confirmPassword ? "text-green-400" : ""}>
                    {password && password === confirmPassword ? "\u2713" : "\u2022"} Passwords must match
                  </p>
                </div>

                {passwordError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {passwordError}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={password.length < 8 || password !== confirmPassword}
                >
                  Create Password
                </button>
              </form>
            </div>
          )}

          {/* Setting Password State */}
          {state === "setting_password" && (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[var(--text-secondary)]">Setting up your password...</p>
            </div>
          )}

          {/* Success State */}
          {state === "success" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-display text-xl font-bold text-[var(--text-primary)] mb-2">Welcome to DevTracker!</h2>
              <p className="text-[var(--text-secondary)]">Your account is ready. Redirecting to dashboard...</p>
            </div>
          )}

          {/* Error State */}
          {state === "error" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="font-display text-xl font-bold text-[var(--text-primary)] mb-2">Something Went Wrong</h2>
              <p className="text-[var(--text-secondary)] mb-6">{error || "An unexpected error occurred."}</p>
              <div className="flex flex-col gap-3">
                <button onClick={() => navigate("/login")} className="btn-primary w-full">
                  Request New Invite
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="btn-secondary w-full"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--text-muted)] mt-6">DevTracker - Development Portfolio Manager</p>
      </div>
    </div>
  );
}
