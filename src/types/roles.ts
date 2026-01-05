export type UserRole = "admin" | "editor" | "viewer";

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  allowedDevelopments?: string[]; // Array of development IDs user can access, empty/undefined means all
}

export interface UserInvite {
  id: string;
  email: string;
  role: UserRole;
  allowedDevelopments?: string[];
  invitedBy: string;
  invitedByEmail: string;
  createdAt: Date;
  expiresAt: Date;
  status: "pending" | "accepted" | "expired";
}

// Permission types
export type Permission =
  // User management
  | "manageUsers"
  // Development management
  | "createDevelopment"
  | "editDevelopment"
  | "archiveDevelopment"
  // Unit management
  | "createUnit"
  | "editUnit"
  | "deleteUnit"
  // Bulk operations
  | "bulkUpdate"
  | "importData"
  | "exportData"
  // Notes
  | "addNotes"
  | "deleteNotes"
  // Reports
  | "generateReports"
  // Audit
  | "viewAuditLog";

// Role-based permissions mapping
export const ROLE_PERMISSIONS: Record<Permission, UserRole[]> = {
  // User management - Admin only
  manageUsers: ["admin"],

  // Development management - Admin only
  createDevelopment: ["admin"],
  editDevelopment: ["admin"],
  archiveDevelopment: ["admin"],

  // Unit management
  createUnit: ["admin", "editor"],
  editUnit: ["admin", "editor"],
  deleteUnit: ["admin"],

  // Bulk operations
  bulkUpdate: ["admin", "editor"],
  importData: ["admin"],
  exportData: ["admin", "editor"],

  // Notes
  addNotes: ["admin", "editor"],
  deleteNotes: ["admin"],

  // Reports - All roles can generate reports
  generateReports: ["admin", "editor", "viewer"],

  // Audit log - Admin only
  viewAuditLog: ["admin"],
};

/**
 * Check if a user role has a specific permission
 */
export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[permission].includes(role);
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
export const ROLE_INFO: Record<UserRole, { label: string; description: string }> = {
  admin: {
    label: "Administrator",
    description: "Full access to all features including user management",
  },
  editor: {
    label: "Editor",
    description: "Can edit units, add notes, and export data",
  },
  viewer: {
    label: "Viewer",
    description: "Read-only access to view data and generate reports",
  },
};
