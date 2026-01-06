import "@testing-library/jest-dom";
import { vi } from "vitest";

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
