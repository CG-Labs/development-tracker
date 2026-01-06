import { describe, it, expect, vi, beforeEach } from "vitest";
import type { UserRole } from "../types/roles";

// Mock Firestore
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockAddDoc = vi.fn();
const mockDoc = vi.fn();
const mockCollection = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  orderBy: (...args: unknown[]) => mockOrderBy(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  serverTimestamp: () => ({ _serverTimestamp: true }),
  Timestamp: {
    fromDate: (date: Date) => ({ toDate: () => date }),
  },
}));

// Mock Firebase config
vi.mock("../config/firebase", () => ({
  db: {},
}));

// Mock email service
vi.mock("./emailService", () => ({
  sendInviteEmail: vi.fn(() => Promise.resolve()),
  sendInviteAcceptedEmail: vi.fn(() => Promise.resolve()),
}));

// Import after mocks are set up
import {
  getUserProfile,
  getUserProfileByEmail,
  createAdminUserProfile,
  updateLastLogin,
  updateUserRole,
  updateUserProfile,
  deactivateUser,
  reactivateUser,
  deleteUser,
  getAllUsers,
  canAccessDevelopment,
  getInviteByToken,
  getPendingInviteByEmail,
  cancelInvite,
  deleteInvite,
  createNotification,
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  isSystemAdminEmail,
} from "./userService";

// Helper to create mock Firestore document snapshot
function createMockDocSnap(exists: boolean, data: Record<string, unknown> = {}, id = "test-id") {
  return {
    exists: () => exists,
    data: () => data,
    id,
  };
}

// Helper to create mock query snapshot
function createMockQuerySnapshot(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    empty: docs.length === 0,
    docs: docs.map((d) => ({
      id: d.id,
      data: () => d.data,
    })),
    size: docs.length,
  };
}

describe("userService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDoc.mockReturnValue({ id: "mock-doc-ref" });
    mockCollection.mockReturnValue({ id: "mock-collection-ref" });
    mockQuery.mockReturnValue({ id: "mock-query-ref" });
    mockWhere.mockReturnValue({ id: "mock-where-ref" });
    mockOrderBy.mockReturnValue({ id: "mock-orderby-ref" });
  });

  // ==================== User Profile Tests ====================

  describe("getUserProfile", () => {
    it("returns user profile when document exists", async () => {
      const mockData = {
        email: "test@example.com",
        displayName: "Test User",
        role: "editor",
        status: "active",
        isActive: true,
        allowedDevelopments: ["dev-1"],
        createdAt: { toDate: () => new Date("2024-01-01") },
        lastLogin: { toDate: () => new Date("2024-01-15") },
      };

      mockGetDoc.mockResolvedValue(createMockDocSnap(true, mockData, "test-uid"));

      const result = await getUserProfile("test-uid");

      expect(result).not.toBeNull();
      expect(result?.uid).toBe("test-uid");
      expect(result?.email).toBe("test@example.com");
      expect(result?.role).toBe("editor");
      expect(result?.isActive).toBe(true);
    });

    it("returns null when document does not exist", async () => {
      mockGetDoc.mockResolvedValue(createMockDocSnap(false));

      const result = await getUserProfile("nonexistent-uid");

      expect(result).toBeNull();
    });

    it("returns null and logs error on exception", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mockGetDoc.mockRejectedValue(new Error("Firestore error"));

      const result = await getUserProfile("test-uid");

      expect(result).toBeNull();
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe("getUserProfileByEmail", () => {
    it("returns user profile when found by email", async () => {
      const mockData = {
        email: "test@example.com",
        displayName: "Test User",
        role: "viewer",
        isActive: true,
        createdAt: { toDate: () => new Date() },
      };

      mockGetDocs.mockResolvedValue(
        createMockQuerySnapshot([{ id: "user-123", data: mockData }])
      );

      const result = await getUserProfileByEmail("test@example.com");

      expect(result).not.toBeNull();
      expect(result?.email).toBe("test@example.com");
      expect(result?.uid).toBe("user-123");
    });

    it("returns null when no user found", async () => {
      mockGetDocs.mockResolvedValue(createMockQuerySnapshot([]));

      const result = await getUserProfileByEmail("nonexistent@example.com");

      expect(result).toBeNull();
    });
  });

  describe("createAdminUserProfile", () => {
    it("creates admin profile for admin email", async () => {
      mockSetDoc.mockResolvedValue(undefined);
      mockAddDoc.mockResolvedValue({ id: "audit-log-id" });

      const result = await createAdminUserProfile(
        "admin-uid",
        "jcnasher@gmail.com",
        "Admin User"
      );

      expect(result.role).toBe("admin");
      expect(result.isActive).toBe(true);
      expect(result.email).toBe("jcnasher@gmail.com");
      expect(mockSetDoc).toHaveBeenCalled();
    });

    it("throws error for non-admin email", async () => {
      await expect(
        createAdminUserProfile("user-uid", "regular@example.com", "Regular User")
      ).rejects.toThrow("Not authorized to create admin profile");
    });
  });

  describe("updateLastLogin", () => {
    it("updates last login timestamp", async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      await updateLastLogin("test-uid");

      expect(mockUpdateDoc).toHaveBeenCalled();
    });

    it("handles errors gracefully", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mockUpdateDoc.mockRejectedValue(new Error("Update failed"));

      await updateLastLogin("test-uid");

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe("updateUserRole", () => {
    it("updates user role and logs audit event", async () => {
      mockGetDoc.mockResolvedValue(
        createMockDocSnap(true, { email: "test@example.com", role: "viewer" })
      );
      mockUpdateDoc.mockResolvedValue(undefined);
      mockAddDoc.mockResolvedValue({ id: "audit-id" });

      await updateUserRole("user-123", "editor", "admin-uid");

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(mockAddDoc).toHaveBeenCalled(); // Audit log
    });

    it("throws error when user not found", async () => {
      mockGetDoc.mockResolvedValue(createMockDocSnap(false));

      await expect(updateUserRole("nonexistent", "editor", "admin")).rejects.toThrow(
        "User not found"
      );
    });
  });

  describe("updateUserProfile", () => {
    it("updates user profile fields", async () => {
      mockGetDoc.mockResolvedValue(
        createMockDocSnap(true, {
          email: "test@example.com",
          displayName: "Old Name",
          role: "viewer",
        })
      );
      mockUpdateDoc.mockResolvedValue(undefined);
      mockAddDoc.mockResolvedValue({ id: "audit-id" });

      await updateUserProfile(
        "user-123",
        { displayName: "New Name", role: "editor" },
        "admin-uid"
      );

      expect(mockUpdateDoc).toHaveBeenCalled();
    });

    it("throws error when user not found", async () => {
      mockGetDoc.mockResolvedValue(createMockDocSnap(false));

      await expect(
        updateUserProfile("nonexistent", { displayName: "Name" }, "admin")
      ).rejects.toThrow("User not found");
    });
  });

  describe("deactivateUser", () => {
    it("deactivates user and logs audit", async () => {
      mockGetDoc.mockResolvedValue(
        createMockDocSnap(true, { email: "test@example.com" })
      );
      mockUpdateDoc.mockResolvedValue(undefined);
      mockAddDoc.mockResolvedValue({ id: "audit-id" });

      await deactivateUser("user-123", "admin-uid");

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ isActive: false, status: "inactive" })
      );
    });

    it("throws error when user not found", async () => {
      mockGetDoc.mockResolvedValue(createMockDocSnap(false));

      await expect(deactivateUser("nonexistent", "admin")).rejects.toThrow("User not found");
    });
  });

  describe("reactivateUser", () => {
    it("reactivates user and logs audit", async () => {
      mockGetDoc.mockResolvedValue(
        createMockDocSnap(true, { email: "test@example.com" })
      );
      mockUpdateDoc.mockResolvedValue(undefined);
      mockAddDoc.mockResolvedValue({ id: "audit-id" });

      await reactivateUser("user-123", "admin-uid");

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ isActive: true, status: "active" })
      );
    });
  });

  describe("deleteUser", () => {
    it("deletes user and logs audit", async () => {
      mockGetDoc.mockResolvedValue(
        createMockDocSnap(true, { email: "test@example.com", displayName: "Test" })
      );
      mockDeleteDoc.mockResolvedValue(undefined);
      mockAddDoc.mockResolvedValue({ id: "audit-id" });

      await deleteUser("user-123", "admin-uid");

      expect(mockDeleteDoc).toHaveBeenCalled();
    });

    it("throws error when user not found", async () => {
      mockGetDoc.mockResolvedValue(createMockDocSnap(false));

      await expect(deleteUser("nonexistent", "admin")).rejects.toThrow("User not found");
    });
  });

  describe("getAllUsers", () => {
    it("returns all users", async () => {
      mockGetDocs.mockResolvedValue(
        createMockQuerySnapshot([
          {
            id: "user-1",
            data: {
              email: "user1@example.com",
              displayName: "User 1",
              role: "admin",
              isActive: true,
              createdAt: { toDate: () => new Date() },
            },
          },
          {
            id: "user-2",
            data: {
              email: "user2@example.com",
              displayName: "User 2",
              role: "viewer",
              isActive: true,
              createdAt: { toDate: () => new Date() },
            },
          },
        ])
      );

      const result = await getAllUsers();

      expect(result).toHaveLength(2);
      expect(result[0].uid).toBe("user-1");
      expect(result[1].uid).toBe("user-2");
    });

    it("returns empty array on error", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mockGetDocs.mockRejectedValue(new Error("Firestore error"));

      const result = await getAllUsers();

      expect(result).toEqual([]);
      consoleError.mockRestore();
    });
  });

  describe("canAccessDevelopment", () => {
    it("returns false for null user", () => {
      expect(canAccessDevelopment(null, "dev-1")).toBe(false);
    });

    it("returns false for inactive user", () => {
      const user = {
        uid: "user-1",
        email: "test@example.com",
        role: "editor" as UserRole,
        status: "inactive" as const,
        isActive: false,
        createdAt: new Date(),
      };
      expect(canAccessDevelopment(user, "dev-1")).toBe(false);
    });

    it("returns true for admin regardless of allowedDevelopments", () => {
      const admin = {
        uid: "admin-1",
        email: "admin@example.com",
        role: "admin" as UserRole,
        status: "active" as const,
        isActive: true,
        allowedDevelopments: ["dev-2"],
        createdAt: new Date(),
      };
      expect(canAccessDevelopment(admin, "dev-1")).toBe(true);
    });

    it("returns true when no allowedDevelopments restriction", () => {
      const user = {
        uid: "user-1",
        email: "test@example.com",
        role: "editor" as UserRole,
        status: "active" as const,
        isActive: true,
        createdAt: new Date(),
      };
      expect(canAccessDevelopment(user, "any-dev")).toBe(true);
    });

    it("returns true when development is in allowedDevelopments", () => {
      const user = {
        uid: "user-1",
        email: "test@example.com",
        role: "editor" as UserRole,
        status: "active" as const,
        isActive: true,
        allowedDevelopments: ["dev-1", "dev-2"],
        createdAt: new Date(),
      };
      expect(canAccessDevelopment(user, "dev-1")).toBe(true);
    });

    it("returns false when development is not in allowedDevelopments", () => {
      const user = {
        uid: "user-1",
        email: "test@example.com",
        role: "editor" as UserRole,
        status: "active" as const,
        isActive: true,
        allowedDevelopments: ["dev-1", "dev-2"],
        createdAt: new Date(),
      };
      expect(canAccessDevelopment(user, "dev-3")).toBe(false);
    });
  });

  // ==================== Invite Tests ====================

  describe("getInviteByToken", () => {
    it("returns invite when token is valid and not expired", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      mockGetDocs.mockResolvedValue(
        createMockQuerySnapshot([
          {
            id: "invite-1",
            data: {
              email: "new@example.com",
              role: "editor",
              token: "valid-token",
              invitedBy: "admin-uid",
              invitedByEmail: "admin@example.com",
              status: "pending",
              createdAt: { toDate: () => new Date() },
              expiresAt: { toDate: () => futureDate },
            },
          },
        ])
      );

      const result = await getInviteByToken("valid-token");

      expect(result).not.toBeNull();
      expect(result?.token).toBe("valid-token");
      expect(result?.status).toBe("pending");
    });

    it("returns null and marks expired invite", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      mockGetDocs.mockResolvedValue(
        createMockQuerySnapshot([
          {
            id: "invite-1",
            data: {
              email: "new@example.com",
              role: "editor",
              token: "expired-token",
              status: "pending",
              createdAt: { toDate: () => new Date() },
              expiresAt: { toDate: () => pastDate },
            },
          },
        ])
      );
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await getInviteByToken("expired-token");

      expect(result).toBeNull();
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { status: "expired" }
      );
    });

    it("returns null when no invite found", async () => {
      mockGetDocs.mockResolvedValue(createMockQuerySnapshot([]));

      const result = await getInviteByToken("invalid-token");

      expect(result).toBeNull();
    });
  });

  describe("getPendingInviteByEmail", () => {
    it("returns pending invite for email", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      mockGetDocs.mockResolvedValue(
        createMockQuerySnapshot([
          {
            id: "invite-1",
            data: {
              email: "pending@example.com",
              role: "viewer",
              token: "some-token",
              status: "pending",
              createdAt: { toDate: () => new Date() },
              expiresAt: { toDate: () => futureDate },
            },
          },
        ])
      );

      const result = await getPendingInviteByEmail("pending@example.com");

      expect(result).not.toBeNull();
      expect(result?.email).toBe("pending@example.com");
    });

    it("returns null when no pending invite", async () => {
      mockGetDocs.mockResolvedValue(createMockQuerySnapshot([]));

      const result = await getPendingInviteByEmail("noinvite@example.com");

      expect(result).toBeNull();
    });
  });

  describe("cancelInvite", () => {
    it("cancels invite and logs audit", async () => {
      mockGetDoc.mockResolvedValue(
        createMockDocSnap(true, { email: "test@example.com", role: "editor" })
      );
      mockUpdateDoc.mockResolvedValue(undefined);
      mockAddDoc.mockResolvedValue({ id: "audit-id" });

      await cancelInvite("invite-123", "admin-uid");

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { status: "cancelled" }
      );
    });

    it("throws error when invite not found", async () => {
      mockGetDoc.mockResolvedValue(createMockDocSnap(false));

      await expect(cancelInvite("nonexistent", "admin")).rejects.toThrow("Invite not found");
    });
  });

  describe("deleteInvite", () => {
    it("deletes invite document", async () => {
      mockDeleteDoc.mockResolvedValue(undefined);

      await deleteInvite("invite-123");

      expect(mockDeleteDoc).toHaveBeenCalled();
    });
  });

  // ==================== Notification Tests ====================

  describe("createNotification", () => {
    it("creates notification and returns id", async () => {
      mockAddDoc.mockResolvedValue({ id: "notif-123" });

      const result = await createNotification({
        userId: "user-1",
        type: "system",
        title: "Test",
        message: "Test message",
      });

      expect(result).toBe("notif-123");
      expect(mockAddDoc).toHaveBeenCalled();
    });
  });

  describe("getUserNotifications", () => {
    it("returns notifications for user", async () => {
      mockGetDocs.mockResolvedValue(
        createMockQuerySnapshot([
          {
            id: "notif-1",
            data: {
              userId: "user-1",
              type: "system",
              title: "Notification 1",
              message: "Message 1",
              read: false,
              createdAt: { toDate: () => new Date() },
            },
          },
          {
            id: "notif-2",
            data: {
              userId: "user-1",
              type: "invite_accepted",
              title: "Notification 2",
              message: "Message 2",
              read: true,
              createdAt: { toDate: () => new Date() },
            },
          },
        ])
      );

      const result = await getUserNotifications("user-1");

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe("Notification 1");
    });

    it("returns empty array on error", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mockGetDocs.mockRejectedValue(new Error("Error"));

      const result = await getUserNotifications("user-1");

      expect(result).toEqual([]);
      consoleError.mockRestore();
    });
  });

  describe("getUnreadNotificationCount", () => {
    it("returns count of unread notifications", async () => {
      mockGetDocs.mockResolvedValue(createMockQuerySnapshot([
        { id: "1", data: {} },
        { id: "2", data: {} },
        { id: "3", data: {} },
      ]));

      const result = await getUnreadNotificationCount("user-1");

      expect(result).toBe(3);
    });

    it("returns 0 on error", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mockGetDocs.mockRejectedValue(new Error("Error"));

      const result = await getUnreadNotificationCount("user-1");

      expect(result).toBe(0);
      consoleError.mockRestore();
    });
  });

  describe("markNotificationAsRead", () => {
    it("marks notification as read", async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      await markNotificationAsRead("notif-123");

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { read: true }
      );
    });
  });

  describe("markAllNotificationsAsRead", () => {
    it("marks all unread notifications as read", async () => {
      mockGetDocs.mockResolvedValue(
        createMockQuerySnapshot([
          { id: "notif-1", data: { read: false } },
          { id: "notif-2", data: { read: false } },
        ])
      );
      mockUpdateDoc.mockResolvedValue(undefined);

      await markAllNotificationsAsRead("user-1");

      expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
    });
  });

  // ==================== Utility Tests ====================

  describe("isSystemAdminEmail", () => {
    it("returns true for admin emails", () => {
      expect(isSystemAdminEmail("jcnasher@gmail.com")).toBe(true);
      expect(isSystemAdminEmail("jcnasher@outlook.com")).toBe(true);
      expect(isSystemAdminEmail("JCNASHER@GMAIL.COM")).toBe(true); // Case insensitive
    });

    it("returns false for non-admin emails", () => {
      expect(isSystemAdminEmail("regular@example.com")).toBe(false);
      expect(isSystemAdminEmail("user@gmail.com")).toBe(false);
    });
  });
});
