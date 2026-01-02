import type { ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";
import type { Permission } from "../types/roles";

interface PermissionGateProps {
  /** Single permission or array of permissions required */
  permission: Permission | Permission[];
  /** If true, requires ALL permissions; if false (default), requires ANY */
  requireAll?: boolean;
  /** Content to show when user has permission */
  children: ReactNode;
  /** Optional content to show when user lacks permission */
  fallback?: ReactNode;
}

/**
 * Conditionally renders children based on user permissions
 *
 * @example
 * // Single permission
 * <PermissionGate permission="editUnit">
 *   <EditButton />
 * </PermissionGate>
 *
 * @example
 * // Multiple permissions (ANY)
 * <PermissionGate permission={["editUnit", "deleteUnit"]}>
 *   <ModifyButton />
 * </PermissionGate>
 *
 * @example
 * // Multiple permissions (ALL required)
 * <PermissionGate permission={["editUnit", "deleteUnit"]} requireAll>
 *   <AdminOnlyButton />
 * </PermissionGate>
 *
 * @example
 * // With fallback
 * <PermissionGate permission="editUnit" fallback={<ViewOnlyMessage />}>
 *   <EditForm />
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  requireAll = false,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { can } = useAuth();

  const permissions = Array.isArray(permission) ? permission : [permission];

  const hasAccess = requireAll
    ? permissions.every((p) => can(p))
    : permissions.some((p) => can(p));

  if (hasAccess) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

/**
 * Hook version for conditional logic in components
 *
 * @example
 * const canEdit = usePermission("editUnit");
 * if (canEdit) {
 *   // Show edit button
 * }
 */
export function usePermission(permission: Permission): boolean {
  const { can } = useAuth();
  return can(permission);
}

/**
 * Hook to check multiple permissions at once
 *
 * @example
 * const { canEdit, canDelete, canManage } = usePermissions({
 *   canEdit: "editUnit",
 *   canDelete: "deleteUnit",
 *   canManage: "manageUsers",
 * });
 */
export function usePermissions<T extends Record<string, Permission>>(
  permissionMap: T
): Record<keyof T, boolean> {
  const { can } = useAuth();

  return Object.fromEntries(
    Object.entries(permissionMap).map(([key, permission]) => [key, can(permission)])
  ) as Record<keyof T, boolean>;
}
