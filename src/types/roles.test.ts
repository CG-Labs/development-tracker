import { describe, it, expect } from "vitest";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getPermissionsForRole,
  getRoleLevel,
  hasHigherOrEqualRole,
  ROLE_PERMISSIONS,
  ROLE_INFO,
  type UserRole,
  type Permission,
} from "./roles";

describe("roles module", () => {
  // ==================== hasPermission Tests ====================

  describe("hasPermission", () => {
    describe("returns false for undefined role", () => {
      it("returns false when role is undefined", () => {
        expect(hasPermission(undefined, "viewUnit")).toBe(false);
        expect(hasPermission(undefined, "manageUsers")).toBe(false);
      });
    });

    describe("admin permissions", () => {
      it("admin has all permissions", () => {
        const allPermissions = Object.keys(ROLE_PERMISSIONS) as Permission[];
        allPermissions.forEach((permission) => {
          expect(hasPermission("admin", permission)).toBe(true);
        });
      });
    });

    describe("manager permissions", () => {
      it("manager has expected permissions", () => {
        // Should have
        expect(hasPermission("manager", "viewDevelopment")).toBe(true);
        expect(hasPermission("manager", "editUnit")).toBe(true);
        expect(hasPermission("manager", "viewUnit")).toBe(true);
        expect(hasPermission("manager", "bulkUpdate")).toBe(true);
        expect(hasPermission("manager", "exportData")).toBe(true);
        expect(hasPermission("manager", "addNotes")).toBe(true);
        expect(hasPermission("manager", "viewNotes")).toBe(true);
        expect(hasPermission("manager", "generateReports")).toBe(true);
        expect(hasPermission("manager", "viewReports")).toBe(true);
      });

      it("manager does not have admin-only permissions", () => {
        expect(hasPermission("manager", "manageUsers")).toBe(false);
        expect(hasPermission("manager", "viewUsers")).toBe(false);
        expect(hasPermission("manager", "createDevelopment")).toBe(false);
        expect(hasPermission("manager", "editDevelopment")).toBe(false);
        expect(hasPermission("manager", "archiveDevelopment")).toBe(false);
        expect(hasPermission("manager", "createUnit")).toBe(false);
        expect(hasPermission("manager", "deleteUnit")).toBe(false);
        expect(hasPermission("manager", "importData")).toBe(false);
        expect(hasPermission("manager", "deleteNotes")).toBe(false);
        expect(hasPermission("manager", "viewAuditLog")).toBe(false);
        expect(hasPermission("manager", "manageSettings")).toBe(false);
      });
    });

    describe("editor permissions", () => {
      it("editor has expected permissions", () => {
        expect(hasPermission("editor", "viewDevelopment")).toBe(true);
        expect(hasPermission("editor", "editUnit")).toBe(true);
        expect(hasPermission("editor", "viewUnit")).toBe(true);
        expect(hasPermission("editor", "bulkUpdate")).toBe(true);
        expect(hasPermission("editor", "addNotes")).toBe(true);
        expect(hasPermission("editor", "viewNotes")).toBe(true);
      });

      it("editor does not have manager or admin permissions", () => {
        expect(hasPermission("editor", "manageUsers")).toBe(false);
        expect(hasPermission("editor", "exportData")).toBe(false);
        expect(hasPermission("editor", "generateReports")).toBe(false);
        expect(hasPermission("editor", "viewReports")).toBe(false);
        expect(hasPermission("editor", "viewAuditLog")).toBe(false);
      });
    });

    describe("viewer permissions", () => {
      it("viewer has read-only permissions", () => {
        expect(hasPermission("viewer", "viewDevelopment")).toBe(true);
        expect(hasPermission("viewer", "viewUnit")).toBe(true);
        expect(hasPermission("viewer", "viewNotes")).toBe(true);
      });

      it("viewer does not have any write permissions", () => {
        expect(hasPermission("viewer", "editUnit")).toBe(false);
        expect(hasPermission("viewer", "addNotes")).toBe(false);
        expect(hasPermission("viewer", "bulkUpdate")).toBe(false);
        expect(hasPermission("viewer", "manageUsers")).toBe(false);
        expect(hasPermission("viewer", "generateReports")).toBe(false);
      });
    });
  });

  // ==================== hasAnyPermission Tests ====================

  describe("hasAnyPermission", () => {
    it("returns false for undefined role", () => {
      expect(hasAnyPermission(undefined, ["viewUnit", "editUnit"])).toBe(false);
    });

    it("returns true if user has any of the permissions", () => {
      expect(hasAnyPermission("viewer", ["viewUnit", "editUnit"])).toBe(true);
      expect(hasAnyPermission("editor", ["manageUsers", "editUnit"])).toBe(true);
    });

    it("returns false if user has none of the permissions", () => {
      expect(hasAnyPermission("viewer", ["editUnit", "manageUsers"])).toBe(false);
      expect(hasAnyPermission("editor", ["manageUsers", "viewAuditLog"])).toBe(false);
    });

    it("returns true for admin with any permissions", () => {
      expect(hasAnyPermission("admin", ["manageUsers", "viewAuditLog"])).toBe(true);
    });

    it("handles empty permissions array", () => {
      expect(hasAnyPermission("admin", [])).toBe(false);
    });
  });

  // ==================== hasAllPermissions Tests ====================

  describe("hasAllPermissions", () => {
    it("returns false for undefined role", () => {
      expect(hasAllPermissions(undefined, ["viewUnit"])).toBe(false);
    });

    it("returns true if user has all permissions", () => {
      expect(hasAllPermissions("admin", ["viewUnit", "editUnit", "manageUsers"])).toBe(true);
      expect(hasAllPermissions("editor", ["viewUnit", "editUnit", "addNotes"])).toBe(true);
    });

    it("returns false if user is missing any permission", () => {
      expect(hasAllPermissions("manager", ["viewUnit", "manageUsers"])).toBe(false);
      expect(hasAllPermissions("editor", ["editUnit", "exportData"])).toBe(false);
    });

    it("handles empty permissions array", () => {
      expect(hasAllPermissions("viewer", [])).toBe(true);
    });

    it("handles single permission", () => {
      expect(hasAllPermissions("viewer", ["viewUnit"])).toBe(true);
      expect(hasAllPermissions("viewer", ["editUnit"])).toBe(false);
    });
  });

  // ==================== getPermissionsForRole Tests ====================

  describe("getPermissionsForRole", () => {
    it("returns all permissions for admin", () => {
      const adminPermissions = getPermissionsForRole("admin");
      const allPermissions = Object.keys(ROLE_PERMISSIONS) as Permission[];

      expect(adminPermissions.length).toBe(allPermissions.length);
      allPermissions.forEach((permission) => {
        expect(adminPermissions).toContain(permission);
      });
    });

    it("returns correct permissions for manager", () => {
      const managerPermissions = getPermissionsForRole("manager");

      expect(managerPermissions).toContain("viewDevelopment");
      expect(managerPermissions).toContain("editUnit");
      expect(managerPermissions).toContain("viewUnit");
      expect(managerPermissions).toContain("bulkUpdate");
      expect(managerPermissions).toContain("exportData");
      expect(managerPermissions).toContain("addNotes");
      expect(managerPermissions).toContain("viewNotes");
      expect(managerPermissions).toContain("generateReports");
      expect(managerPermissions).toContain("viewReports");

      expect(managerPermissions).not.toContain("manageUsers");
      expect(managerPermissions).not.toContain("viewAuditLog");
    });

    it("returns correct permissions for editor", () => {
      const editorPermissions = getPermissionsForRole("editor");

      expect(editorPermissions).toContain("viewDevelopment");
      expect(editorPermissions).toContain("editUnit");
      expect(editorPermissions).toContain("viewUnit");
      expect(editorPermissions).toContain("bulkUpdate");
      expect(editorPermissions).toContain("addNotes");
      expect(editorPermissions).toContain("viewNotes");

      expect(editorPermissions).not.toContain("generateReports");
      expect(editorPermissions).not.toContain("exportData");
    });

    it("returns minimal permissions for viewer", () => {
      const viewerPermissions = getPermissionsForRole("viewer");

      expect(viewerPermissions).toContain("viewDevelopment");
      expect(viewerPermissions).toContain("viewUnit");
      expect(viewerPermissions).toContain("viewNotes");

      // Should only have view permissions
      expect(viewerPermissions.length).toBe(3);
    });

    it("returns permissions as array", () => {
      const permissions = getPermissionsForRole("admin");
      expect(Array.isArray(permissions)).toBe(true);
    });
  });

  // ==================== getRoleLevel Tests ====================

  describe("getRoleLevel", () => {
    it("returns 0 for admin (highest privilege)", () => {
      expect(getRoleLevel("admin")).toBe(0);
    });

    it("returns 1 for manager", () => {
      expect(getRoleLevel("manager")).toBe(1);
    });

    it("returns 2 for editor", () => {
      expect(getRoleLevel("editor")).toBe(2);
    });

    it("returns 3 for viewer (lowest privilege)", () => {
      expect(getRoleLevel("viewer")).toBe(3);
    });

    it("maintains correct hierarchy order", () => {
      expect(getRoleLevel("admin")).toBeLessThan(getRoleLevel("manager"));
      expect(getRoleLevel("manager")).toBeLessThan(getRoleLevel("editor"));
      expect(getRoleLevel("editor")).toBeLessThan(getRoleLevel("viewer"));
    });
  });

  // ==================== hasHigherOrEqualRole Tests ====================

  describe("hasHigherOrEqualRole", () => {
    describe("admin comparisons", () => {
      it("admin has higher or equal role than all roles", () => {
        expect(hasHigherOrEqualRole("admin", "admin")).toBe(true);
        expect(hasHigherOrEqualRole("admin", "manager")).toBe(true);
        expect(hasHigherOrEqualRole("admin", "editor")).toBe(true);
        expect(hasHigherOrEqualRole("admin", "viewer")).toBe(true);
      });
    });

    describe("manager comparisons", () => {
      it("manager has higher or equal role than manager, editor, viewer", () => {
        expect(hasHigherOrEqualRole("manager", "manager")).toBe(true);
        expect(hasHigherOrEqualRole("manager", "editor")).toBe(true);
        expect(hasHigherOrEqualRole("manager", "viewer")).toBe(true);
      });

      it("manager does not have higher role than admin", () => {
        expect(hasHigherOrEqualRole("manager", "admin")).toBe(false);
      });
    });

    describe("editor comparisons", () => {
      it("editor has higher or equal role than editor, viewer", () => {
        expect(hasHigherOrEqualRole("editor", "editor")).toBe(true);
        expect(hasHigherOrEqualRole("editor", "viewer")).toBe(true);
      });

      it("editor does not have higher role than admin or manager", () => {
        expect(hasHigherOrEqualRole("editor", "admin")).toBe(false);
        expect(hasHigherOrEqualRole("editor", "manager")).toBe(false);
      });
    });

    describe("viewer comparisons", () => {
      it("viewer only has equal role to viewer", () => {
        expect(hasHigherOrEqualRole("viewer", "viewer")).toBe(true);
      });

      it("viewer does not have higher role than any other role", () => {
        expect(hasHigherOrEqualRole("viewer", "admin")).toBe(false);
        expect(hasHigherOrEqualRole("viewer", "manager")).toBe(false);
        expect(hasHigherOrEqualRole("viewer", "editor")).toBe(false);
      });
    });
  });

  // ==================== ROLE_PERMISSIONS Constant Tests ====================

  describe("ROLE_PERMISSIONS", () => {
    it("has all expected permissions defined", () => {
      const expectedPermissions: Permission[] = [
        "manageUsers",
        "viewUsers",
        "createDevelopment",
        "editDevelopment",
        "archiveDevelopment",
        "viewDevelopment",
        "createUnit",
        "editUnit",
        "deleteUnit",
        "viewUnit",
        "bulkUpdate",
        "importData",
        "exportData",
        "addNotes",
        "deleteNotes",
        "viewNotes",
        "generateReports",
        "viewReports",
        "viewAuditLog",
        "manageSettings",
      ];

      expectedPermissions.forEach((permission) => {
        expect(ROLE_PERMISSIONS[permission]).toBeDefined();
        expect(Array.isArray(ROLE_PERMISSIONS[permission])).toBe(true);
      });
    });

    it("admin-only permissions have only admin", () => {
      const adminOnlyPermissions: Permission[] = [
        "manageUsers",
        "viewUsers",
        "createDevelopment",
        "editDevelopment",
        "archiveDevelopment",
        "createUnit",
        "deleteUnit",
        "importData",
        "deleteNotes",
        "viewAuditLog",
        "manageSettings",
      ];

      adminOnlyPermissions.forEach((permission) => {
        expect(ROLE_PERMISSIONS[permission]).toEqual(["admin"]);
      });
    });

    it("view permissions include viewer role", () => {
      expect(ROLE_PERMISSIONS.viewDevelopment).toContain("viewer");
      expect(ROLE_PERMISSIONS.viewUnit).toContain("viewer");
      expect(ROLE_PERMISSIONS.viewNotes).toContain("viewer");
    });
  });

  // ==================== ROLE_INFO Constant Tests ====================

  describe("ROLE_INFO", () => {
    it("has info for all roles", () => {
      const roles: UserRole[] = ["admin", "manager", "editor", "viewer"];

      roles.forEach((role) => {
        expect(ROLE_INFO[role]).toBeDefined();
        expect(ROLE_INFO[role].label).toBeDefined();
        expect(ROLE_INFO[role].description).toBeDefined();
        expect(ROLE_INFO[role].color).toBeDefined();
      });
    });

    it("has correct labels", () => {
      expect(ROLE_INFO.admin.label).toBe("Administrator");
      expect(ROLE_INFO.manager.label).toBe("Manager");
      expect(ROLE_INFO.editor.label).toBe("Editor");
      expect(ROLE_INFO.viewer.label).toBe("Viewer");
    });

    it("has non-empty descriptions", () => {
      expect(ROLE_INFO.admin.description.length).toBeGreaterThan(0);
      expect(ROLE_INFO.manager.description.length).toBeGreaterThan(0);
      expect(ROLE_INFO.editor.description.length).toBeGreaterThan(0);
      expect(ROLE_INFO.viewer.description.length).toBeGreaterThan(0);
    });

    it("has valid colors", () => {
      expect(ROLE_INFO.admin.color).toBe("red");
      expect(ROLE_INFO.manager.color).toBe("purple");
      expect(ROLE_INFO.editor.color).toBe("blue");
      expect(ROLE_INFO.viewer.color).toBe("gray");
    });
  });

  // ==================== Role Hierarchy Integration Tests ====================

  describe("Role Hierarchy Integration", () => {
    it("permission count decreases down the hierarchy", () => {
      const adminCount = getPermissionsForRole("admin").length;
      const managerCount = getPermissionsForRole("manager").length;
      const editorCount = getPermissionsForRole("editor").length;
      const viewerCount = getPermissionsForRole("viewer").length;

      expect(adminCount).toBeGreaterThan(managerCount);
      expect(managerCount).toBeGreaterThan(editorCount);
      expect(editorCount).toBeGreaterThan(viewerCount);
    });

    it("higher roles have all permissions of lower roles", () => {
      const viewerPerms = getPermissionsForRole("viewer");
      const editorPerms = getPermissionsForRole("editor");
      const managerPerms = getPermissionsForRole("manager");
      const adminPerms = getPermissionsForRole("admin");

      // Viewer permissions should be subset of editor
      viewerPerms.forEach((perm) => {
        expect(editorPerms).toContain(perm);
      });

      // Editor permissions should be subset of manager
      editorPerms.forEach((perm) => {
        expect(managerPerms).toContain(perm);
      });

      // Manager permissions should be subset of admin
      managerPerms.forEach((perm) => {
        expect(adminPerms).toContain(perm);
      });
    });
  });
});
