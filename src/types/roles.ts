// User Role Hierarchy (highest to lowest)
// 1. Admin - Full access to everything
// 2. Manager - View reports, edit units, assigned developments only
// 3. Editor - Edit units, assigned developments only
// 4. Viewer - Read-only, assigned developments only

export type UserRole = "admin" | "manager" | "editor" | "viewer";

export type UserStatus = "active" | "inactive" | "pending_invite" | "suspended";

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  status: UserStatus;
  isActive: boolean;
  allowedDevelopments?: string[]; // Array of development IDs, null/empty = all (admin only)
  invitedBy?: string; // UID of user who invited
  invitedAt?: Date;
  createdAt: Date;
  lastLogin?: Date;
  passwordSet?: boolean; // True after user sets password via magic link flow
}

export interface UserInvite {
  id: string;
  email: string;
  role: UserRole;
  allowedDevelopments?: string[];
  token: string; // Unique magic link token
  invitedBy: string; // UID
  invitedByEmail: string;
  invitedByName?: string;
  status: "pending" | "accepted" | "expired" | "cancelled";
  createdAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
}

export interface UserNotification {
  id: string;
  userId: string;
  type: "invite_accepted" | "user_deactivated" | "role_changed" | "system";
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
}

// Permission types
export type Permission =
  // User management
  | "manageUsers"
  | "viewUsers"
  // Development management
  | "createDevelopment"
  | "editDevelopment"
  | "archiveDevelopment"
  | "viewDevelopment"
  // Unit management
  | "createUnit"
  | "editUnit"
  | "deleteUnit"
  | "viewUnit"
  // Bulk operations
  | "bulkUpdate"
  | "importData"
  | "exportData"
  // Notes
  | "addNotes"
  | "deleteNotes"
  | "viewNotes"
  // Reports
  | "generateReports"
  | "viewReports"
  // Audit
  | "viewAuditLog"
  // Settings
  | "manageSettings";

// Role-based permissions mapping
export const ROLE_PERMISSIONS: Record<Permission, UserRole[]> = {
  // User management - Admin only
  manageUsers: ["admin"],
  viewUsers: ["admin"],

  // Development management
  createDevelopment: ["admin"],
  editDevelopment: ["admin"],
  archiveDevelopment: ["admin"],
  viewDevelopment: ["admin", "manager", "editor", "viewer"],

  // Unit management
  createUnit: ["admin"],
  editUnit: ["admin", "manager", "editor"],
  deleteUnit: ["admin"],
  viewUnit: ["admin", "manager", "editor", "viewer"],

  // Bulk operations
  bulkUpdate: ["admin", "manager", "editor"],
  importData: ["admin"],
  exportData: ["admin", "manager"],

  // Notes
  addNotes: ["admin", "manager", "editor"],
  deleteNotes: ["admin"],
  viewNotes: ["admin", "manager", "editor", "viewer"],

  // Reports - Admin and Manager only
  generateReports: ["admin", "manager"],
  viewReports: ["admin", "manager"],

  // Audit log - Admin only
  viewAuditLog: ["admin"],

  // Settings - Admin only
  manageSettings: ["admin"],
};

/**
 * Check if a user role has a specific permission
 */
export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[permission]?.includes(role) ?? false;
}

/**
 * Check if a user role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole | undefined, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Check if a user role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole | undefined, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Get all permissions for a given role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return (Object.entries(ROLE_PERMISSIONS) as [Permission, UserRole[]][])
    .filter(([, roles]) => roles.includes(role))
    .map(([permission]) => permission);
}

/**
 * Role display names and descriptions
 */
export const ROLE_INFO: Record<UserRole, { label: string; description: string; color: string }> = {
  admin: {
    label: "Administrator",
    description: "Full access to all features including user management and settings",
    color: "red",
  },
  manager: {
    label: "Manager",
    description: "View reports, edit units in assigned developments",
    color: "purple",
  },
  editor: {
    label: "Editor",
    description: "Edit units and add notes in assigned developments",
    color: "blue",
  },
  viewer: {
    label: "Viewer",
    description: "Read-only access to assigned developments",
    color: "gray",
  },
};

/**
 * Get role hierarchy level (lower number = higher privilege)
 */
export function getRoleLevel(role: UserRole): number {
  const levels: Record<UserRole, number> = {
    admin: 0,
    manager: 1,
    editor: 2,
    viewer: 3,
  };
  return levels[role];
}

/**
 * Check if roleA has higher or equal privilege than roleB
 */
export function hasHigherOrEqualRole(roleA: UserRole, roleB: UserRole): boolean {
  return getRoleLevel(roleA) <= getRoleLevel(roleB);
}
