import "@testing-library/jest-dom";
import { vi } from "vitest";

// Set test admin emails for userService tests
import.meta.env.VITE_ADMIN_EMAILS = "testadmin@example.com,testadmin2@example.com";

// Mock Firebase Auth
vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({})),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn(),
  onAuthStateChanged: vi.fn(() => {
    // Return unsubscribe function
    return vi.fn();
  }),
}));

// Mock Firebase config
vi.mock("../config/firebase", () => ({
  auth: {},
  db: {},
}));
