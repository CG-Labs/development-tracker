/**
 * Access Denied Page
 *
 * Hard block for unauthorized users. No navigation visible.
 * User must sign out - cannot bypass.
 */

import { useAuth, type AccessDenialReason } from "../contexts/AuthContext";

interface AccessDeniedProps {
  reason: AccessDenialReason;
}

export function AccessDenied({ reason }: AccessDeniedProps) {
  const { logout } = useAuth();

  const messages: Record<NonNullable<AccessDenialReason>, { title: string; message: string }> = {
    no_invite: {
      title: "Access Denied",
      message:
        "You need an invitation to access this system. Please contact your administrator to request access.",
    },
    deactivated: {
      title: "Account Deactivated",
      message:
        "Your account has been deactivated. Please contact your administrator if you believe this is an error.",
    },
    no_profile: {
      title: "Account Not Found",
      message:
        "Your account profile could not be found. Please contact your administrator for assistance.",
    },
  };

  const content = reason ? messages[reason] : messages.no_invite;

  return (
    <div className="min-h-screen blueprint-grid flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Warning Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 mb-6">
          <div className="relative w-full h-full">
            <div className="absolute inset-0 bg-red-500/20 rounded-full animate-pulse" />
            <div className="absolute inset-[4px] bg-[var(--bg-deep)] rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-red-500"
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
          </div>
        </div>

        {/* Message */}
        <h1 className="font-display text-2xl font-bold text-red-500 mb-4">{content.title}</h1>
        <p className="text-[var(--text-secondary)] mb-8">{content.message}</p>

        {/* Sign Out Button */}
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-deep)] transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Sign Out
        </button>

        {/* Contact Info */}
        <p className="mt-8 text-[var(--text-muted)] text-sm">
          Need help? Contact your system administrator.
        </p>

        {/* Footer */}
        <p className="text-[var(--text-muted)] text-xs mt-8">DevTracker v1.0</p>
      </div>
    </div>
  );
}
