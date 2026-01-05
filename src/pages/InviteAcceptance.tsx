/**
 * Invite Acceptance Page
 *
 * Handles the magic link invite flow:
 * 1. Validates the invite token from URL
 * 2. Shows invite details (who invited, what role)
 * 3. Allows user to create account with matching email
 * 4. Creates user profile from invite
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ROLE_INFO, type UserInvite } from "../types/roles";

type InviteStatus = "loading" | "valid" | "invalid" | "expired" | "used" | "error";

export function InviteAcceptance() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { validateInviteToken, signupWithInvite, currentUser } = useAuth();

  const [status, setStatus] = useState<InviteStatus>("loading");
  const [invite, setInvite] = useState<UserInvite | null>(null);
  const [error, setError] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      navigate("/");
    }
  }, [currentUser, navigate]);

  // Validate token on mount
  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setStatus("invalid");
        return;
      }

      try {
        const inviteData = await validateInviteToken(token);

        if (!inviteData) {
          setStatus("invalid");
          return;
        }

        if (inviteData.status === "accepted") {
          setStatus("used");
          return;
        }

        if (inviteData.status === "expired" || new Date(inviteData.expiresAt) < new Date()) {
          setStatus("expired");
          return;
        }

        if (inviteData.status === "cancelled") {
          setStatus("invalid");
          return;
        }

        setInvite(inviteData);
        setEmail(inviteData.email);
        setStatus("valid");
      } catch (err) {
        console.error("Error validating invite:", err);
        setStatus("error");
      }
    }

    validateToken();
  }, [token, validateInviteToken]);

  function validateForm(): string | null {
    if (!name.trim()) {
      return "Please enter your name";
    }
    if (!email.trim()) {
      return "Please enter your email";
    }
    if (invite && email.toLowerCase() !== invite.email.toLowerCase()) {
      return "Email must match the invitation email";
    }
    if (password.length < 6) {
      return "Password must be at least 6 characters";
    }
    if (password !== confirmPassword) {
      return "Passwords do not match";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!invite) {
      setError("No valid invitation found");
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    try {
      await signupWithInvite(email, password, name, invite);
      // The AuthContext will handle the redirect after successful signup
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create account";
      if (errorMessage.includes("email-already-in-use")) {
        setError("An account with this email already exists. Please sign in instead.");
      } else if (errorMessage.includes("weak-password")) {
        setError("Password is too weak. Please use a stronger password.");
      } else if (errorMessage.includes("invalid-email")) {
        setError("Please enter a valid email address");
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen blueprint-grid flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
            <div className="relative w-full h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] rounded-xl opacity-20 animate-pulse" />
              <div className="absolute inset-[3px] bg-[var(--bg-deep)] rounded-[10px] flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-[var(--accent-cyan)] animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            </div>
          </div>
          <p className="text-[var(--text-secondary)]">Validating invitation...</p>
        </div>
      </div>
    );
  }

  // Invalid/expired/used states
  if (status !== "valid") {
    const messages = {
      invalid: {
        title: "Invalid Invitation",
        message: "This invitation link is invalid or has been cancelled.",
        icon: (
          <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ),
      },
      expired: {
        title: "Invitation Expired",
        message: "This invitation has expired. Please contact your administrator for a new invitation.",
        icon: (
          <svg className="w-10 h-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      used: {
        title: "Invitation Already Used",
        message: "This invitation has already been accepted. If you have an account, please sign in.",
        icon: (
          <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      error: {
        title: "Something Went Wrong",
        message: "There was an error validating your invitation. Please try again later.",
        icon: (
          <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
      },
    };

    const content = messages[status];

    return (
      <div className="min-h-screen blueprint-grid flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6">
            <div className="relative w-full h-full">
              <div className="absolute inset-0 bg-[var(--bg-deep)] rounded-full flex items-center justify-center">
                {content.icon}
              </div>
            </div>
          </div>

          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-4">
            {content.title}
          </h1>
          <p className="text-[var(--text-secondary)] mb-8">{content.message}</p>

          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
          >
            Go to Sign In
          </Link>

          <p className="text-[var(--text-muted)] text-xs mt-8">DevTracker v1.0</p>
        </div>
      </div>
    );
  }

  // Valid invite - show signup form
  return (
    <div className="min-h-screen blueprint-grid flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
            <div className="relative w-full h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] rounded-xl opacity-20" />
              <div className="absolute inset-[3px] bg-[var(--bg-deep)] rounded-[10px] flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-[var(--accent-cyan)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            You're Invited!
          </h1>
          <p className="text-[var(--text-secondary)] mt-2">
            Join DevTrack Portfolio Manager
          </p>
        </div>

        {/* Invite Details Card */}
        {invite && (
          <div className="card p-4 mb-6 bg-gradient-to-r from-[var(--accent-cyan)]/10 to-[var(--accent-purple)]/10 border-[var(--accent-cyan)]/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--accent-cyan)]/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[var(--accent-cyan)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">
                  <span className="font-medium text-[var(--text-primary)]">{invite.invitedByName || invite.invitedByEmail}</span>
                  {" "}has invited you as:
                </p>
                <p className="mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-sm font-medium rounded ${
                    invite.role === "admin"
                      ? "bg-red-500/20 text-red-400"
                      : invite.role === "manager"
                      ? "bg-purple-500/20 text-purple-400"
                      : invite.role === "editor"
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-gray-500/20 text-gray-400"
                  }`}>
                    {ROLE_INFO[invite.role]?.label || invite.role}
                  </span>
                </p>
                {invite.allowedDevelopments && invite.allowedDevelopments.length > 0 && (
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    Access to {invite.allowedDevelopments.length} development{invite.allowedDevelopments.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Signup Form */}
        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="John Smith"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input bg-[var(--bg-deep)]"
                placeholder="you@example.com"
                required
                disabled
              />
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Email must match the invitation
              </p>
            </div>

            <div>
              <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="At least 6 characters"
                required
              />
            </div>

            <div>
              <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="Confirm your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating Account...
                </span>
              ) : (
                "Accept Invitation & Create Account"
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
            <p className="text-center text-[var(--text-secondary)] text-sm">
              Already have an account?{" "}
              <Link
                to="/"
                className="text-[var(--accent-cyan)] hover:text-[var(--text-primary)] font-medium transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[var(--text-muted)] text-xs mt-8">
          DevTracker v1.0
        </p>
      </div>
    </div>
  );
}
