import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import type { UserRole } from "../types/roles";

// Mock user service
vi.mock("../services/userService", () => ({
  getUserProfile: vi.fn(),
  updateLastLogin: vi.fn(),
  createUserFromInvite: vi.fn(() => Promise.resolve({
    uid: "new-uid",
    email: "test@example.com",
    displayName: "Test User",
    role: "editor",
    status: "active",
    isActive: true,
    createdAt: new Date(),
  })),
  createAdminUserProfile: vi.fn(),
  getInviteByToken: vi.fn(),
  isSystemAdminEmail: vi.fn(),
  getUserNotifications: vi.fn(() => Promise.resolve([])),
  getUnreadNotificationCount: vi.fn(() => Promise.resolve(0)),
  markNotificationAsRead: vi.fn(() => Promise.resolve()),
  markAllNotificationsAsRead: vi.fn(() => Promise.resolve()),
}));

// Mock Firebase auth - more detailed mocking
const mockOnAuthStateChanged = vi.fn();
const mockSignInWithEmailAndPassword = vi.fn();
const mockSignOut = vi.fn();
const mockSendPasswordResetEmail = vi.fn();
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockUpdateProfile = vi.fn();

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({})),
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) => mockCreateUserWithEmailAndPassword(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  sendPasswordResetEmail: (...args: unknown[]) => mockSendPasswordResetEmail(...args),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
}));

// Import the mocked modules
import * as userService from "../services/userService";

// Helper to create a valid mock UserProfile
function createMockProfile(overrides: Partial<{
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  allowedDevelopments: string[];
}> = {}) {
  return {
    uid: "test-uid",
    email: "test@example.com",
    displayName: "Test User",
    role: "editor" as UserRole,
    status: "active" as const,
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  };
}

// Test component that uses the auth context
function TestComponent({ testId = "test" }: { testId?: string }) {
  const auth = useAuth();
  return (
    <div data-testid={testId}>
      <div data-testid="loading">{auth.loading ? "true" : "false"}</div>
      <div data-testid="currentUser">{auth.currentUser ? JSON.stringify(auth.currentUser) : "null"}</div>
      <div data-testid="accessDenied">{auth.accessDenied || "null"}</div>
      <div data-testid="unreadCount">{auth.unreadCount}</div>
      <div data-testid="notifications">{JSON.stringify(auth.notifications)}</div>
      <div data-testid="pendingInvite">{auth.pendingInvite ? JSON.stringify(auth.pendingInvite) : "null"}</div>
      <button data-testid="logout" onClick={() => auth.logout()}>Logout</button>
      <button data-testid="clearAccessDenied" onClick={() => auth.clearAccessDenied()}>Clear</button>
      <button data-testid="refreshUserProfile" onClick={() => auth.refreshUserProfile()}>Refresh Profile</button>
      <button data-testid="refreshNotifications" onClick={() => auth.refreshNotifications()}>Refresh Notifications</button>
      <button data-testid="markNotificationRead" onClick={() => auth.markNotificationRead("notif-1")}>Mark Read</button>
      <button data-testid="markAllNotificationsRead" onClick={() => auth.markAllNotificationsRead()}>Mark All Read</button>
      <button data-testid="validateInvite" onClick={() => auth.validateInviteToken("test-token")}>Validate Invite</button>
    </div>
  );
}

// Test component for permission checks
function PermissionTestComponent() {
  const { can } = useAuth();
  return (
    <div>
      <div data-testid="can-manageUsers">{can("manageUsers") ? "true" : "false"}</div>
      <div data-testid="can-editUnit">{can("editUnit") ? "true" : "false"}</div>
      <div data-testid="can-viewUnit">{can("viewUnit") ? "true" : "false"}</div>
    </div>
  );
}

// Test component for login
function LoginTestComponent() {
  const { login, resetPassword, signupWithInvite, pendingInvite } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleLogin = async () => {
    try {
      await login("test@example.com", "password123");
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleResetPassword = async () => {
    try {
      await resetPassword("test@example.com");
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSignup = async () => {
    if (pendingInvite) {
      try {
        await signupWithInvite("test@example.com", "password123", "Test User", pendingInvite);
        setSuccess(true);
      } catch (err) {
        setError((err as Error).message);
      }
    }
  };

  return (
    <div>
      <div data-testid="error">{error || "null"}</div>
      <div data-testid="success">{success ? "true" : "false"}</div>
      <button data-testid="login" onClick={handleLogin}>Login</button>
      <button data-testid="resetPassword" onClick={handleResetPassword}>Reset Password</button>
      <button data-testid="signup" onClick={handleSignup}>Signup</button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no auth state, loading finished
    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      // Simulate immediate callback with no user
      setTimeout(() => callback(null), 0);
      return vi.fn(); // unsubscribe
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("useAuth hook", () => {
    it("throws error when used outside AuthProvider", () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow("useAuth must be used within an AuthProvider");

      consoleError.mockRestore();
    });
  });

  describe("AuthProvider", () => {
    it("provides initial state correctly", async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });

      expect(screen.getByTestId("currentUser").textContent).toBe("null");
      expect(screen.getByTestId("accessDenied").textContent).toBe("null");
      expect(screen.getByTestId("unreadCount").textContent).toBe("0");
    });

    it("shows loading state initially", () => {
      mockOnAuthStateChanged.mockImplementation(() => {
        // Don't call callback - stay in loading state
        return vi.fn();
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId("loading").textContent).toBe("true");
    });

    it("handles authenticated user with valid profile", async () => {
      const mockUser = {
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Test User",
      };

      const mockProfile = createMockProfile({
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Test User",
        role: "editor",
        isActive: true,
        allowedDevelopments: ["dev-1"],
      });

      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        setTimeout(() => callback(mockUser), 0);
        return vi.fn();
      });

      vi.mocked(userService.getUserProfile).mockResolvedValue(mockProfile);
      vi.mocked(userService.updateLastLogin).mockResolvedValue();
      vi.mocked(userService.getUserNotifications).mockResolvedValue([]);
      vi.mocked(userService.getUnreadNotificationCount).mockResolvedValue(0);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });

      await waitFor(() => {
        const userData = JSON.parse(screen.getByTestId("currentUser").textContent!);
        expect(userData.uid).toBe("test-uid");
        expect(userData.email).toBe("test@example.com");
        expect(userData.role).toBe("editor");
      });

      expect(userService.updateLastLogin).toHaveBeenCalledWith("test-uid");
    });

    it("sets accessDenied to deactivated when user is inactive", async () => {
      const mockUser = {
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Test User",
      };

      const mockProfile = createMockProfile({
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Test User",
        role: "editor",
        isActive: false, // Deactivated
      });

      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        setTimeout(() => callback(mockUser), 0);
        return vi.fn();
      });

      vi.mocked(userService.getUserProfile).mockResolvedValue(mockProfile);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("accessDenied").textContent).toBe("deactivated");
      });

      expect(screen.getByTestId("currentUser").textContent).toBe("null");
    });

    it("sets accessDenied to no_invite when no profile and not admin", async () => {
      const mockUser = {
        uid: "test-uid",
        email: "regular@example.com",
        displayName: "Regular User",
      };

      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        setTimeout(() => callback(mockUser), 0);
        return vi.fn();
      });

      vi.mocked(userService.getUserProfile).mockResolvedValue(null);
      vi.mocked(userService.isSystemAdminEmail).mockReturnValue(false);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait longer due to retry logic (3 retries × 500ms + processing time)
      await waitFor(() => {
        expect(screen.getByTestId("accessDenied").textContent).toBe("no_invite");
      }, { timeout: 3000 });
    });

    it("creates admin profile for admin emails", async () => {
      const mockUser = {
        uid: "admin-uid",
        email: "admin@example.com",
        displayName: "Admin User",
      };

      const mockAdminProfile = createMockProfile({
        uid: "admin-uid",
        email: "admin@example.com",
        displayName: "Admin User",
        role: "admin",
        isActive: true,
      });

      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        setTimeout(() => callback(mockUser), 0);
        return vi.fn();
      });

      vi.mocked(userService.getUserProfile).mockResolvedValue(null);
      vi.mocked(userService.isSystemAdminEmail).mockReturnValue(true);
      vi.mocked(userService.createAdminUserProfile).mockResolvedValue(mockAdminProfile);
      vi.mocked(userService.getUserNotifications).mockResolvedValue([]);
      vi.mocked(userService.getUnreadNotificationCount).mockResolvedValue(0);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait longer due to retry logic (3 retries × 500ms + processing time)
      await waitFor(() => {
        const userData = JSON.parse(screen.getByTestId("currentUser").textContent!);
        expect(userData.role).toBe("admin");
      }, { timeout: 3000 });

      expect(userService.createAdminUserProfile).toHaveBeenCalledWith(
        "admin-uid",
        "admin@example.com",
        "Admin User"
      );
    });
  });

  describe("logout", () => {
    it("clears user state on logout", async () => {
      const mockUser = {
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Test User",
      };

      const mockProfile = createMockProfile({
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Test User",
        role: "editor",
        isActive: true,
      });

      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        setTimeout(() => callback(mockUser), 0);
        return vi.fn();
      });

      vi.mocked(userService.getUserProfile).mockResolvedValue(mockProfile);
      vi.mocked(userService.updateLastLogin).mockResolvedValue();
      vi.mocked(userService.getUserNotifications).mockResolvedValue([]);
      vi.mocked(userService.getUnreadNotificationCount).mockResolvedValue(0);
      mockSignOut.mockResolvedValue(undefined);

      const user = userEvent.setup();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("currentUser").textContent).not.toBe("null");
      });

      // Click logout
      await user.click(screen.getByTestId("logout"));

      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe("clearAccessDenied", () => {
    it("clears access denied state", async () => {
      const mockUser = {
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Test User",
      };

      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        setTimeout(() => callback(mockUser), 0);
        return vi.fn();
      });

      vi.mocked(userService.getUserProfile).mockResolvedValue(null);
      vi.mocked(userService.isSystemAdminEmail).mockReturnValue(false);

      const user = userEvent.setup();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait longer due to retry logic (3 retries × 500ms + processing time)
      await waitFor(() => {
        expect(screen.getByTestId("accessDenied").textContent).toBe("no_invite");
      }, { timeout: 3000 });

      await user.click(screen.getByTestId("clearAccessDenied"));

      expect(screen.getByTestId("accessDenied").textContent).toBe("null");
    });
  });

  describe("can (permissions)", () => {
    it("returns correct permissions for admin role", async () => {
      const mockUser = {
        uid: "admin-uid",
        email: "admin@example.com",
        displayName: "Admin",
      };

      const mockProfile = createMockProfile({
        uid: "admin-uid",
        email: "admin@example.com",
        displayName: "Admin",
        role: "admin",
        isActive: true,
      });

      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        setTimeout(() => callback(mockUser), 0);
        return vi.fn();
      });

      vi.mocked(userService.getUserProfile).mockResolvedValue(mockProfile);
      vi.mocked(userService.updateLastLogin).mockResolvedValue();
      vi.mocked(userService.getUserNotifications).mockResolvedValue([]);
      vi.mocked(userService.getUnreadNotificationCount).mockResolvedValue(0);

      render(
        <AuthProvider>
          <PermissionTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("can-manageUsers").textContent).toBe("true");
      });
      expect(screen.getByTestId("can-editUnit").textContent).toBe("true");
      expect(screen.getByTestId("can-viewUnit").textContent).toBe("true");
    });

    it("returns correct permissions for viewer role", async () => {
      const mockUser = {
        uid: "viewer-uid",
        email: "viewer@example.com",
        displayName: "Viewer",
      };

      const mockProfile = createMockProfile({
        uid: "viewer-uid",
        email: "viewer@example.com",
        displayName: "Viewer",
        role: "viewer",
        isActive: true,
      });

      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        setTimeout(() => callback(mockUser), 0);
        return vi.fn();
      });

      vi.mocked(userService.getUserProfile).mockResolvedValue(mockProfile);
      vi.mocked(userService.updateLastLogin).mockResolvedValue();
      vi.mocked(userService.getUserNotifications).mockResolvedValue([]);
      vi.mocked(userService.getUnreadNotificationCount).mockResolvedValue(0);

      render(
        <AuthProvider>
          <PermissionTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("can-viewUnit").textContent).toBe("true");
      });
      expect(screen.getByTestId("can-manageUsers").textContent).toBe("false");
      expect(screen.getByTestId("can-editUnit").textContent).toBe("false");
    });

    it("returns false for all permissions when no user", async () => {
      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        setTimeout(() => callback(null), 0);
        return vi.fn();
      });

      render(
        <AuthProvider>
          <PermissionTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("can-manageUsers").textContent).toBe("false");
      });
      expect(screen.getByTestId("can-editUnit").textContent).toBe("false");
      expect(screen.getByTestId("can-viewUnit").textContent).toBe("false");
    });
  });

  describe("notifications", () => {
    it("loads notifications when user is authenticated", async () => {
      const mockUser = {
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Test User",
      };

      const mockProfile = createMockProfile({
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Test User",
        role: "editor",
        isActive: true,
      });

      const mockNotifications = [
        {
          id: "notif-1",
          userId: "test-uid",
          type: "system" as const,
          title: "Test Notification",
          message: "Test message",
          read: false,
          createdAt: new Date(),
        },
      ];

      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        setTimeout(() => callback(mockUser), 0);
        return vi.fn();
      });

      vi.mocked(userService.getUserProfile).mockResolvedValue(mockProfile);
      vi.mocked(userService.updateLastLogin).mockResolvedValue();
      vi.mocked(userService.getUserNotifications).mockResolvedValue(mockNotifications);
      vi.mocked(userService.getUnreadNotificationCount).mockResolvedValue(1);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("unreadCount").textContent).toBe("1");
      });

      expect(userService.getUserNotifications).toHaveBeenCalledWith("test-uid");
      expect(userService.getUnreadNotificationCount).toHaveBeenCalledWith("test-uid");
    });
  });

  describe("error handling", () => {
    it("sets accessDenied to no_profile on error", async () => {
      const mockUser = {
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Test User",
      };

      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        setTimeout(() => callback(mockUser), 0);
        return vi.fn();
      });

      vi.mocked(userService.getUserProfile).mockRejectedValue(new Error("Database error"));

      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("accessDenied").textContent).toBe("no_profile");
      });

      consoleError.mockRestore();
    });
  });

  describe("refreshUserProfile", () => {
    it("refreshes user profile when called", async () => {
      const mockUser = {
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Test User",
      };

      const mockProfile = createMockProfile({
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Test User",
        role: "editor",
        isActive: true,
      });

      const updatedProfile = createMockProfile({
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Updated User",
        role: "admin",
        isActive: true,
      });

      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        setTimeout(() => callback(mockUser), 0);
        return vi.fn();
      });

      // Mock auth.currentUser for refreshUserProfile
      const { auth } = await import("../config/firebase");
      Object.defineProperty(auth, "currentUser", {
        value: mockUser,
        writable: true,
        configurable: true,
      });

      vi.mocked(userService.getUserProfile)
        .mockResolvedValueOnce(mockProfile)
        .mockResolvedValueOnce(updatedProfile);
      vi.mocked(userService.updateLastLogin).mockResolvedValue();
      vi.mocked(userService.getUserNotifications).mockResolvedValue([]);
      vi.mocked(userService.getUnreadNotificationCount).mockResolvedValue(0);

      const user = userEvent.setup();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        const userData = JSON.parse(screen.getByTestId("currentUser").textContent!);
        expect(userData.role).toBe("editor");
      });

      await user.click(screen.getByTestId("refreshUserProfile"));

      await waitFor(() => {
        const userData = JSON.parse(screen.getByTestId("currentUser").textContent!);
        expect(userData.role).toBe("admin");
      });
    });
  });

  describe("validateInviteToken", () => {
    it("validates invite token and sets pending invite", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "new@example.com",
        role: "editor" as UserRole,
        token: "test-token",
        invitedBy: "admin-uid",
        invitedByEmail: "admin@example.com",
        status: "pending" as const,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      };

      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        setTimeout(() => callback(null), 0);
        return vi.fn();
      });

      vi.mocked(userService.getInviteByToken).mockResolvedValue(mockInvite);

      const user = userEvent.setup();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });

      await user.click(screen.getByTestId("validateInvite"));

      await waitFor(() => {
        expect(screen.getByTestId("pendingInvite").textContent).not.toBe("null");
      });

      expect(userService.getInviteByToken).toHaveBeenCalledWith("test-token");
    });

    it("returns null for invalid token", async () => {
      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        setTimeout(() => callback(null), 0);
        return vi.fn();
      });

      vi.mocked(userService.getInviteByToken).mockResolvedValue(null);

      const user = userEvent.setup();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });

      await user.click(screen.getByTestId("validateInvite"));

      await waitFor(() => {
        expect(userService.getInviteByToken).toHaveBeenCalled();
      });

      expect(screen.getByTestId("pendingInvite").textContent).toBe("null");
    });
  });

  describe("markNotificationRead", () => {
    it("marks a notification as read and refreshes", async () => {
      const mockUser = {
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Test User",
      };

      const mockProfile = createMockProfile({
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Test User",
        role: "editor",
        isActive: true,
      });

      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        setTimeout(() => callback(mockUser), 0);
        return vi.fn();
      });

      vi.mocked(userService.getUserProfile).mockResolvedValue(mockProfile);
      vi.mocked(userService.updateLastLogin).mockResolvedValue();
      vi.mocked(userService.getUserNotifications).mockResolvedValue([]);
      vi.mocked(userService.getUnreadNotificationCount)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0);
      vi.mocked(userService.markNotificationAsRead).mockResolvedValue();

      const user = userEvent.setup();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });

      await user.click(screen.getByTestId("markNotificationRead"));

      await waitFor(() => {
        expect(userService.markNotificationAsRead).toHaveBeenCalledWith("notif-1");
      });
    });
  });

  describe("markAllNotificationsRead", () => {
    it("marks all notifications as read", async () => {
      const mockUser = {
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Test User",
      };

      const mockProfile = createMockProfile({
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Test User",
        role: "editor",
        isActive: true,
      });

      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        setTimeout(() => callback(mockUser), 0);
        return vi.fn();
      });

      vi.mocked(userService.getUserProfile).mockResolvedValue(mockProfile);
      vi.mocked(userService.updateLastLogin).mockResolvedValue();
      vi.mocked(userService.getUserNotifications).mockResolvedValue([]);
      vi.mocked(userService.getUnreadNotificationCount)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0);
      vi.mocked(userService.markAllNotificationsAsRead).mockResolvedValue();

      const user = userEvent.setup();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("currentUser").textContent).not.toBe("null");
      });

      await user.click(screen.getByTestId("markAllNotificationsRead"));

      await waitFor(() => {
        expect(userService.markAllNotificationsAsRead).toHaveBeenCalledWith("test-uid");
      });
    });
  });

  describe("login", () => {
    it("logs in user successfully", async () => {
      const mockUser = {
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Test User",
      };

      const mockProfile = createMockProfile({
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Test User",
        role: "editor",
        isActive: true,
      });

      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        setTimeout(() => callback(null), 0);
        return vi.fn();
      });

      mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });
      vi.mocked(userService.getUserProfile).mockResolvedValue(mockProfile);
      vi.mocked(userService.updateLastLogin).mockResolvedValue();
      vi.mocked(userService.getUserNotifications).mockResolvedValue([]);
      vi.mocked(userService.getUnreadNotificationCount).mockResolvedValue(0);

      const user = userEvent.setup();

      render(
        <AuthProvider>
          <LoginTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("error").textContent).toBe("null");
      });

      await user.click(screen.getByTestId("login"));

      await waitFor(() => {
        expect(mockSignInWithEmailAndPassword).toHaveBeenCalled();
      });
    });

    it("throws error when user has no profile and not admin", async () => {
      const mockUser = {
        uid: "test-uid",
        email: "regular@example.com",
        displayName: "Regular User",
      };

      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        setTimeout(() => callback(null), 0);
        return vi.fn();
      });

      mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });
      vi.mocked(userService.getUserProfile).mockResolvedValue(null);
      vi.mocked(userService.isSystemAdminEmail).mockReturnValue(false);
      mockSignOut.mockResolvedValue(undefined);

      const user = userEvent.setup();

      render(
        <AuthProvider>
          <LoginTestComponent />
        </AuthProvider>
      );

      await user.click(screen.getByTestId("login"));

      // Wait longer due to retry logic (3 retries × 500ms + processing time)
      await waitFor(() => {
        expect(screen.getByTestId("error").textContent).toContain("Access denied");
      }, { timeout: 3000 });

      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe("resetPassword", () => {
    it("sends password reset email", async () => {
      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        setTimeout(() => callback(null), 0);
        return vi.fn();
      });

      mockSendPasswordResetEmail.mockResolvedValue(undefined);

      const user = userEvent.setup();

      render(
        <AuthProvider>
          <LoginTestComponent />
        </AuthProvider>
      );

      await user.click(screen.getByTestId("resetPassword"));

      await waitFor(() => {
        expect(mockSendPasswordResetEmail).toHaveBeenCalled();
      });
    });
  });

  describe("signupWithInvite", () => {
    it("creates account with valid invite", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "test@example.com",
        role: "editor" as UserRole,
        token: "test-token",
        invitedBy: "admin-uid",
        invitedByEmail: "admin@example.com",
        status: "pending" as const,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      };

      const mockUser = {
        uid: "new-uid",
        email: "test@example.com",
        displayName: null,
      };

      const mockProfile = createMockProfile({
        uid: "new-uid",
        email: "test@example.com",
        displayName: "Test User",
        role: "editor",
        isActive: true,
      });

      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        setTimeout(() => callback(null), 0);
        return vi.fn();
      });

      vi.mocked(userService.getInviteByToken).mockResolvedValue(mockInvite);
      mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });
      mockUpdateProfile.mockResolvedValue(undefined);
      vi.mocked(userService.createUserFromInvite).mockResolvedValue(mockProfile);

      const user = userEvent.setup();

      render(
        <AuthProvider>
          <TestComponent />
          <LoginTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });

      // First validate the invite
      await user.click(screen.getByTestId("validateInvite"));

      await waitFor(() => {
        expect(screen.getByTestId("pendingInvite").textContent).not.toBe("null");
      });

      // Then signup
      await user.click(screen.getByTestId("signup"));

      await waitFor(() => {
        expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalled();
      });
    });

    it("throws error when email does not match invite", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "different@example.com",
        role: "editor" as UserRole,
        token: "test-token",
        invitedBy: "admin-uid",
        invitedByEmail: "admin@example.com",
        status: "pending" as const,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      };

      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        setTimeout(() => callback(null), 0);
        return vi.fn();
      });

      vi.mocked(userService.getInviteByToken).mockResolvedValue(mockInvite);

      const user = userEvent.setup();

      render(
        <AuthProvider>
          <TestComponent />
          <LoginTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });

      await user.click(screen.getByTestId("validateInvite"));

      await waitFor(() => {
        expect(screen.getByTestId("pendingInvite").textContent).not.toBe("null");
      });

      await user.click(screen.getByTestId("signup"));

      await waitFor(() => {
        expect(screen.getByTestId("error").textContent).toContain("Email does not match");
      });
    });
  });

  describe("refreshNotifications", () => {
    it("refreshes notifications when called", async () => {
      const mockUser = {
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Test User",
      };

      const mockProfile = createMockProfile({
        uid: "test-uid",
        email: "test@example.com",
        displayName: "Test User",
        role: "editor",
        isActive: true,
      });

      const mockNotifications = [
        {
          id: "notif-1",
          userId: "test-uid",
          type: "system" as const,
          title: "Test",
          message: "Message",
          read: false,
          createdAt: new Date(),
        },
      ];

      mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
        setTimeout(() => callback(mockUser), 0);
        return vi.fn();
      });

      vi.mocked(userService.getUserProfile).mockResolvedValue(mockProfile);
      vi.mocked(userService.updateLastLogin).mockResolvedValue();
      vi.mocked(userService.getUserNotifications)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(mockNotifications);
      vi.mocked(userService.getUnreadNotificationCount)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1);

      const user = userEvent.setup();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("unreadCount").textContent).toBe("0");
      });

      await user.click(screen.getByTestId("refreshNotifications"));

      await waitFor(() => {
        expect(screen.getByTestId("unreadCount").textContent).toBe("1");
      });
    });
  });
});
