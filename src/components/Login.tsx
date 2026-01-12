import { useState } from "react";
import { useAuth } from "../contexts/AzureAuthContext";

export function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  async function handleLogin() {
    setError("");
    setLoading(true);

    try {
      // Azure AD redirect - no email/password needed here
      await login();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sign in";
      setError(errorMessage);
      setLoading(false);
    }
  }


  return (
    <div className="min-h-screen blueprint-grid flex items-center justify-center px-4">
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
            Welcome Back
          </h1>
          <p className="text-[var(--text-secondary)] mt-2">
            Sign in to DevTrack Portfolio Manager
          </p>
        </div>

        {/* Login Card */}
        <div className="card p-8">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign in with Microsoft
                </span>
              )}
            </button>

            <p className="text-center text-[var(--text-muted)] text-xs">
              You'll be redirected to sign in with your Microsoft account
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
            <p className="text-center text-[var(--text-muted)] text-sm">
              Need an account? Contact your administrator for an invitation.
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
