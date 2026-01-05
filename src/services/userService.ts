import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
  where,
  serverTimestamp,
  Timestamp,
  addDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { UserRole, UserProfile, UserInvite } from "../types/roles";

const USERS_COLLECTION = "users";
const INVITES_COLLECTION = "invites";

// Admin emails - these users will automatically be assigned admin role
const ADMIN_EMAILS = [
  "jcnasher@gmail.com",
  "jcnasher@outlook.com",
];

/**
 * Convert Firestore timestamp to Date
 */
function timestampToDate(timestamp: Timestamp | undefined): Date | undefined {
  return timestamp?.toDate();
}

/**
 * Get a user profile by UID
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      uid: docSnap.id,
      email: data.email,
      displayName: data.displayName,
      role: data.role as UserRole,
      createdAt: timestampToDate(data.createdAt) || new Date(),
      lastLogin: timestampToDate(data.lastLogin),
      isActive: data.isActive !== false, // Default to true for backwards compatibility
      allowedDevelopments: data.allowedDevelopments,
    };
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
}

/**
 * Determine the default role for a new user
 */
function getDefaultRole(email: string): UserRole {
  const normalizedEmail = email.toLowerCase();
  if (ADMIN_EMAILS.some((adminEmail) => normalizedEmail === adminEmail.toLowerCase())) {
    return "admin";
  }
  return "viewer";
}

/**
 * Create a new user profile (called on first login)
 * Admin emails get admin role, others default to "viewer"
 * Checks for pending invite to apply role and development access
 */
export async function createUserProfile(
  uid: string,
  email: string,
  displayName?: string
): Promise<UserProfile> {
  // Check for pending invite
  const invite = await getPendingInviteByEmail(email);
  const role = invite?.role || getDefaultRole(email);
  const allowedDevelopments = invite?.allowedDevelopments;

  const userProfile: Omit<UserProfile, "createdAt" | "lastLogin" | "isActive"> & {
    createdAt: ReturnType<typeof serverTimestamp>;
    lastLogin: ReturnType<typeof serverTimestamp>;
    isActive: boolean;
  } = {
    uid,
    email,
    displayName,
    role,
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
    isActive: true,
    allowedDevelopments,
  };

  const docRef = doc(db, USERS_COLLECTION, uid);
  await setDoc(docRef, userProfile);

  // Mark invite as accepted if there was one
  if (invite) {
    await markInviteAsAccepted(invite.id);
  }

  return {
    uid,
    email,
    displayName,
    role,
    createdAt: new Date(),
    lastLogin: new Date(),
    isActive: true,
    allowedDevelopments,
  };
}

/**
 * Update user's last login timestamp
 */
export async function updateLastLogin(uid: string): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(docRef, {
      lastLogin: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating last login:", error);
  }
}

/**
 * Update a user's role (admin only)
 */
export async function updateUserRole(uid: string, newRole: UserRole): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(docRef, {
    role: newRole,
  });
}

/**
 * Update a user's display name
 */
export async function updateUserDisplayName(uid: string, displayName: string): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(docRef, {
    displayName,
  });
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const q = query(collection(db, USERS_COLLECTION), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        uid: docSnap.id,
        email: data.email,
        displayName: data.displayName,
        role: data.role as UserRole,
        createdAt: timestampToDate(data.createdAt) || new Date(),
        lastLogin: timestampToDate(data.lastLogin),
        isActive: data.isActive !== false,
        allowedDevelopments: data.allowedDevelopments,
      };
    });
  } catch (error) {
    console.error("Error getting all users:", error);
    return [];
  }
}

/**
 * Ensure a user profile exists (create if not)
 * Called on login to sync Firebase Auth with Firestore profile
 * Also upgrades admin emails to admin role if they're not already
 */
export async function ensureUserProfile(
  uid: string,
  email: string,
  displayName?: string
): Promise<UserProfile> {
  const existingProfile = await getUserProfile(uid);

  if (existingProfile) {
    // Check if this is an admin email that needs upgrading
    const shouldBeAdmin = getDefaultRole(email) === "admin";
    if (shouldBeAdmin && existingProfile.role !== "admin") {
      await updateUserRole(uid, "admin");
      existingProfile.role = "admin";
    }

    // Update last login
    await updateLastLogin(uid);
    return {
      ...existingProfile,
      lastLogin: new Date(),
    };
  }

  // Create new profile
  return createUserProfile(uid, email, displayName);
}

/**
 * Update user's active status (deactivate/reactivate)
 */
export async function updateUserActiveStatus(uid: string, isActive: boolean): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(docRef, {
    isActive,
  });
}

/**
 * Update user profile (name, email, role)
 */
export async function updateUserProfile(
  uid: string,
  updates: {
    displayName?: string;
    email?: string;
    role?: UserRole;
    allowedDevelopments?: string[];
  }
): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(docRef, updates);
}

/**
 * Update user's allowed developments
 */
export async function updateUserDevelopmentAccess(uid: string, allowedDevelopments: string[]): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(docRef, {
    allowedDevelopments: allowedDevelopments.length > 0 ? allowedDevelopments : null,
  });
}

// ==================== Invite Functions ====================

/**
 * Create a new invite for a user
 */
export async function createUserInvite(
  email: string,
  role: UserRole,
  invitedBy: string,
  invitedByEmail: string,
  allowedDevelopments?: string[]
): Promise<UserInvite> {
  // Check if user already exists
  const existingUsers = await getDocs(
    query(collection(db, USERS_COLLECTION), where("email", "==", email.toLowerCase()))
  );
  if (!existingUsers.empty) {
    throw new Error("A user with this email already exists");
  }

  // Check if there's already a pending invite
  const existingInvite = await getPendingInviteByEmail(email);
  if (existingInvite) {
    throw new Error("There is already a pending invite for this email");
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

  const inviteData = {
    email: email.toLowerCase(),
    role,
    allowedDevelopments: allowedDevelopments?.length ? allowedDevelopments : null,
    invitedBy,
    invitedByEmail,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
    status: "pending" as const,
  };

  const docRef = await addDoc(collection(db, INVITES_COLLECTION), inviteData);

  return {
    id: docRef.id,
    email: email.toLowerCase(),
    role,
    allowedDevelopments,
    invitedBy,
    invitedByEmail,
    createdAt: new Date(),
    expiresAt,
    status: "pending",
  };
}

/**
 * Get pending invite by email
 */
export async function getPendingInviteByEmail(email: string): Promise<UserInvite | null> {
  try {
    const q = query(
      collection(db, INVITES_COLLECTION),
      where("email", "==", email.toLowerCase()),
      where("status", "==", "pending")
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const docSnap = querySnapshot.docs[0];
    const data = docSnap.data();
    const expiresAt = timestampToDate(data.expiresAt) || new Date();

    // Check if expired
    if (expiresAt < new Date()) {
      // Mark as expired
      await updateDoc(doc(db, INVITES_COLLECTION, docSnap.id), { status: "expired" });
      return null;
    }

    return {
      id: docSnap.id,
      email: data.email,
      role: data.role as UserRole,
      allowedDevelopments: data.allowedDevelopments || undefined,
      invitedBy: data.invitedBy,
      invitedByEmail: data.invitedByEmail,
      createdAt: timestampToDate(data.createdAt) || new Date(),
      expiresAt,
      status: data.status,
    };
  } catch (error) {
    console.error("Error getting pending invite:", error);
    return null;
  }
}

/**
 * Get all invites (admin only)
 */
export async function getAllInvites(): Promise<UserInvite[]> {
  try {
    const q = query(collection(db, INVITES_COLLECTION), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        email: data.email,
        role: data.role as UserRole,
        allowedDevelopments: data.allowedDevelopments || undefined,
        invitedBy: data.invitedBy,
        invitedByEmail: data.invitedByEmail,
        createdAt: timestampToDate(data.createdAt) || new Date(),
        expiresAt: timestampToDate(data.expiresAt) || new Date(),
        status: data.status,
      };
    });
  } catch (error) {
    console.error("Error getting all invites:", error);
    return [];
  }
}

/**
 * Mark invite as accepted
 */
async function markInviteAsAccepted(inviteId: string): Promise<void> {
  const docRef = doc(db, INVITES_COLLECTION, inviteId);
  await updateDoc(docRef, {
    status: "accepted",
  });
}

/**
 * Delete an invite
 */
export async function deleteInvite(inviteId: string): Promise<void> {
  const docRef = doc(db, INVITES_COLLECTION, inviteId);
  await deleteDoc(docRef);
}

/**
 * Resend invite (creates a new one with fresh expiration)
 */
export async function resendInvite(inviteId: string): Promise<UserInvite> {
  const docRef = doc(db, INVITES_COLLECTION, inviteId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error("Invite not found");
  }

  const data = docSnap.data();

  // Delete old invite
  await deleteDoc(docRef);

  // Create new invite
  return createUserInvite(
    data.email,
    data.role,
    data.invitedBy,
    data.invitedByEmail,
    data.allowedDevelopments
  );
}

/**
 * Check if a user can access a specific development
 */
export function canAccessDevelopment(user: UserProfile | null, developmentId: string): boolean {
  if (!user) return false;
  if (!user.isActive) return false;
  if (user.role === "admin") return true; // Admins can access everything
  if (!user.allowedDevelopments || user.allowedDevelopments.length === 0) return true; // No restrictions
  return user.allowedDevelopments.includes(developmentId);
}
