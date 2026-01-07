/**
 * Firebase Authentication Error Mapping
 *
 * Maps Firebase auth error codes to user-friendly messages.
 * Reference: https://firebase.google.com/docs/auth/admin/errors
 */

export interface AuthErrorInfo {
  code: string;
  userMessage: string;
  technicalMessage: string;
  recoveryAction?: string;
}

/**
 * Firebase Auth error codes mapped to user-friendly messages
 */
export const AUTH_ERROR_MAP: Record<string, AuthErrorInfo> = {
  // Sign-in errors
  "auth/invalid-email": {
    code: "auth/invalid-email",
    userMessage: "Invalid email address format.",
    technicalMessage: "The email address is not valid.",
    recoveryAction: "Please check your email address and try again.",
  },
  "auth/user-disabled": {
    code: "auth/user-disabled",
    userMessage: "This account has been disabled.",
    technicalMessage: "The user account has been disabled by an administrator.",
    recoveryAction: "Please contact your administrator for assistance.",
  },
  "auth/user-not-found": {
    code: "auth/user-not-found",
    userMessage: "No account found with this email.",
    technicalMessage: "No user record found for this identifier.",
    recoveryAction: "Please check your email or request an invitation.",
  },
  "auth/wrong-password": {
    code: "auth/wrong-password",
    userMessage: "Incorrect password.",
    technicalMessage: "The password is invalid for the given email.",
    recoveryAction: "Please check your password or use 'Forgot Password'.",
  },
  "auth/invalid-credential": {
    code: "auth/invalid-credential",
    userMessage: "Invalid email or password.",
    technicalMessage: "The supplied auth credential is incorrect or expired.",
    recoveryAction: "Please check your credentials and try again.",
  },

  // Sign-up errors
  "auth/email-already-in-use": {
    code: "auth/email-already-in-use",
    userMessage: "An account with this email already exists.",
    technicalMessage: "The email address is already in use by another account.",
    recoveryAction: "Please sign in or use a different email.",
  },
  "auth/weak-password": {
    code: "auth/weak-password",
    userMessage: "Password is too weak.",
    technicalMessage: "The password must be at least 6 characters.",
    recoveryAction: "Please choose a stronger password with at least 8 characters.",
  },
  "auth/operation-not-allowed": {
    code: "auth/operation-not-allowed",
    userMessage: "This sign-in method is not enabled.",
    technicalMessage: "The sign-in provider is disabled for this Firebase project.",
    recoveryAction: "Please contact your administrator.",
  },

  // Magic link / action code errors
  "auth/invalid-action-code": {
    code: "auth/invalid-action-code",
    userMessage: "This link is invalid or has already been used.",
    technicalMessage: "The action code is invalid or has been consumed.",
    recoveryAction: "Please request a new invitation link.",
  },
  "auth/expired-action-code": {
    code: "auth/expired-action-code",
    userMessage: "This link has expired.",
    technicalMessage: "The action code has expired.",
    recoveryAction: "Please request a new invitation link.",
  },

  // Re-authentication errors
  "auth/requires-recent-login": {
    code: "auth/requires-recent-login",
    userMessage: "Please sign in again to complete this action.",
    technicalMessage: "This operation requires recent authentication.",
    recoveryAction: "Please sign out and sign in again.",
  },

  // Rate limiting
  "auth/too-many-requests": {
    code: "auth/too-many-requests",
    userMessage: "Too many failed attempts. Please try again later.",
    technicalMessage: "Access temporarily disabled due to many failed login attempts.",
    recoveryAction: "Wait a few minutes before trying again.",
  },

  // Network errors
  "auth/network-request-failed": {
    code: "auth/network-request-failed",
    userMessage: "Network error. Please check your connection.",
    technicalMessage: "A network error occurred.",
    recoveryAction: "Please check your internet connection and try again.",
  },

  // Session errors
  "auth/user-token-expired": {
    code: "auth/user-token-expired",
    userMessage: "Your session has expired.",
    technicalMessage: "The user's credential is no longer valid.",
    recoveryAction: "Please sign in again.",
  },

  // Account errors
  "auth/account-exists-with-different-credential": {
    code: "auth/account-exists-with-different-credential",
    userMessage: "An account already exists with this email using a different sign-in method.",
    technicalMessage: "Account exists with different credential.",
    recoveryAction: "Try signing in with a different method.",
  },

  // Internal errors
  "auth/internal-error": {
    code: "auth/internal-error",
    userMessage: "An unexpected error occurred.",
    technicalMessage: "An internal error has occurred.",
    recoveryAction: "Please try again. If the problem persists, contact support.",
  },

  // Popup errors (for OAuth)
  "auth/popup-closed-by-user": {
    code: "auth/popup-closed-by-user",
    userMessage: "Sign-in was cancelled.",
    technicalMessage: "The popup was closed before authentication completed.",
    recoveryAction: "Please try signing in again.",
  },

  // Default fallback
  "auth/unknown": {
    code: "auth/unknown",
    userMessage: "An unexpected error occurred.",
    technicalMessage: "An unknown error occurred.",
    recoveryAction: "Please try again. If the problem persists, contact support.",
  },
};

/**
 * Get user-friendly error message from Firebase auth error
 */
export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const errorCode = (error as { code?: string }).code || "";
    const errorInfo = AUTH_ERROR_MAP[errorCode];

    if (errorInfo) {
      return errorInfo.userMessage;
    }

    // Check for partial matches in error message
    const errorMessage = error.message.toLowerCase();
    for (const [code, info] of Object.entries(AUTH_ERROR_MAP)) {
      if (errorMessage.includes(code.replace("auth/", "").replace(/-/g, " "))) {
        return info.userMessage;
      }
    }

    // Return the raw message if no mapping found
    return error.message;
  }

  return AUTH_ERROR_MAP["auth/unknown"].userMessage;
}

/**
 * Get full error info from Firebase auth error
 */
export function getAuthErrorInfo(error: unknown): AuthErrorInfo {
  if (error instanceof Error) {
    const errorCode = (error as { code?: string }).code || "";
    const errorInfo = AUTH_ERROR_MAP[errorCode];

    if (errorInfo) {
      return errorInfo;
    }
  }

  return AUTH_ERROR_MAP["auth/unknown"];
}

/**
 * Check if error is a specific auth error code
 */
export function isAuthError(error: unknown, code: string): boolean {
  if (error instanceof Error) {
    const errorCode = (error as { code?: string }).code || "";
    return errorCode === code || error.message.includes(code);
  }
  return false;
}

/**
 * Check if error indicates the user should re-authenticate
 */
export function requiresReauthentication(error: unknown): boolean {
  return isAuthError(error, "auth/requires-recent-login") ||
         isAuthError(error, "auth/user-token-expired");
}

/**
 * Check if error is due to rate limiting
 */
export function isRateLimited(error: unknown): boolean {
  return isAuthError(error, "auth/too-many-requests");
}

/**
 * Check if error is due to network issues
 */
export function isNetworkError(error: unknown): boolean {
  return isAuthError(error, "auth/network-request-failed");
}

/**
 * Check if error is due to invalid/expired magic link
 */
export function isInvalidMagicLink(error: unknown): boolean {
  return isAuthError(error, "auth/invalid-action-code") ||
         isAuthError(error, "auth/expired-action-code");
}
