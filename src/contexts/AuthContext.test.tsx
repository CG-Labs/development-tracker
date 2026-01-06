import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "./AuthContext";
import type { UserRole } from "../types/roles";

// Mock user service
vi.mock("../services/userService", () => ({
  getUserProfile: vi.fn(),
  updateLastLogin: vi.fn(),
  createUserFromInvite: vi.fn(),
  createAdminUserProfile: vi.fn(),
  getInviteByToken: vi.fn(),
  isSystemAdminEmail: vi.fn(),
  getUserNotifications: vi.fn(() => Promise.resolve([])),
  getUnreadNotificationCount: vi.fn(() => Promise.resolve(0)),
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
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
      <button data-testid="logout" onClick={() => auth.logout()}>Logout</button>
      <button data-testid="clearAccessDenied" onClick={() => auth.clearAccessDenied()}>Clear</button>
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

      await waitFor(() => {
        expect(screen.getByTestId("accessDenied").textContent).toBe("no_invite");
      });
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

      await waitFor(() => {
        const userData = JSON.parse(screen.getByTestId("currentUser").textContent!);
        expect(userData.role).toBe("admin");
      });

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

      await waitFor(() => {
        expect(screen.getByTestId("accessDenied").textContent).toBe("no_invite");
      });

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
});
