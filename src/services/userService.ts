import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { UserRole, UserProfile } from "../types/roles";

const USERS_COLLECTION = "users";

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
 */
export async function createUserProfile(
  uid: string,
  email: string,
  displayName?: string
): Promise<UserProfile> {
  const role = getDefaultRole(email);

  const userProfile: Omit<UserProfile, "createdAt" | "lastLogin"> & {
    createdAt: ReturnType<typeof serverTimestamp>;
    lastLogin: ReturnType<typeof serverTimestamp>;
  } = {
    uid,
    email,
    displayName,
    role,
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
  };

  const docRef = doc(db, USERS_COLLECTION, uid);
  await setDoc(docRef, userProfile);

  return {
    uid,
    email,
    displayName,
    role,
    createdAt: new Date(),
    lastLogin: new Date(),
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
