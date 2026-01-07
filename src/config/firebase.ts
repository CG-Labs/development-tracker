import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import type { ActionCodeSettings } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCbFD4XkbHQaIahWiHJ1OuNQwcgCkvtlYc",
  authDomain: "development-tracker-13764.firebaseapp.com",
  projectId: "development-tracker-13764",
  storageBucket: "development-tracker-13764.firebasestorage.app",
  messagingSenderId: "430769368098",
  appId: "1:430769368098:web:0b0b6d049fa630407c6e7b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Get action code settings for Firebase Magic Link authentication
 * Following Firebase documentation: https://firebase.google.com/docs/auth/web/email-link-auth
 */
export function getActionCodeSettings(inviteId: string): ActionCodeSettings {
  // Determine the base URL based on environment
  const baseUrl = typeof window !== "undefined" && window.location.hostname === "localhost"
    ? `http://localhost:5173/complete-signup?inviteId=${inviteId}`
    : `https://development-tracker-13764.web.app/complete-signup?inviteId=${inviteId}`;

  return {
    // URL must be in the authorized domains list in Firebase Console
    url: baseUrl,
    // This must be true for email link sign-in
    handleCodeInApp: true,
  };
}

export default app;
