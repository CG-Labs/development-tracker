/**
 * Cleanup Script - Remove Orphan Users
 *
 * This script can be imported and called from the browser console
 * when logged in as an admin to clean up specific orphan users.
 *
 * Usage (in browser console):
 * 1. Navigate to the app while logged in as admin
 * 2. Run: import('/src/scripts/cleanupOrphanUsers.ts').then(m => m.cleanupOrphanUser('patrick.kennedy@columbia.je'))
 *
 * Or call the exported function from a component/service.
 */

import { deleteUserByEmail } from "../services/userService";

/**
 * Clean up a specific orphan user by email
 */
export async function cleanupOrphanUser(
  email: string,
  performedBy: string = "system"
): Promise<{ success: boolean; message: string }> {
  console.log(`Attempting to clean up orphan user: ${email}`);

  try {
    const deleted = await deleteUserByEmail(email, performedBy);

    if (deleted) {
      return {
        success: true,
        message: `Successfully deleted orphan user: ${email}`,
      };
    } else {
      return {
        success: false,
        message: `User not found or already deleted: ${email}`,
      };
    }
  } catch (error) {
    console.error("Error cleaning up orphan user:", error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * List of known orphan users to clean up
 */
export const KNOWN_ORPHAN_USERS = [
  "patrick.kennedy@columbia.je",
];

/**
 * Clean up all known orphan users
 */
export async function cleanupAllOrphanUsers(
  performedBy: string = "system"
): Promise<{ email: string; success: boolean; message: string }[]> {
  const results = [];

  for (const email of KNOWN_ORPHAN_USERS) {
    const result = await cleanupOrphanUser(email, performedBy);
    results.push({ email, ...result });
  }

  return results;
}
