/**
 * User Service - Complete User Management
 *
 * Handles:
 * - User profiles
 * - Magic link invites with tokens
 * - Role-based access control
 * - Notifications
 * - Audit logging
 */

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
import type { UserRole, UserProfile, UserInvite, UserNotification, UserStatus } from "../types/roles";
import { ROLE_INFO } from "../types/roles";
import { sendInviteEmail, sendInviteAcceptedEmail } from "./emailService";

const USERS_COLLECTION = "users";
const INVITES_COLLECTION = "invites";
const NOTIFICATIONS_COLLECTION = "notifications";
const AUDIT_LOGS_COLLECTION = "auditLogs";

// Admin emails - these users will automatically be assigned admin role on first signup
const ADMIN_EMAILS = ["jcnasher@gmail.com", "jcnasher@outlook.com"];

/**
 * Generate a cryptographically secure random token
 */
function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Convert Firestore timestamp to Date
 */
function timestampToDate(timestamp: Timestamp | undefined): Date | undefined {
  return timestamp?.toDate();
}

// ==================== User Profile Functions ====================

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
      status: (data.status as UserStatus) || "active",
      isActive: data.isActive !== false,
      allowedDevelopments: data.allowedDevelopments || undefined,
      invitedBy: data.invitedBy,
      invitedAt: timestampToDate(data.invitedAt),
      createdAt: timestampToDate(data.createdAt) || new Date(),
      lastLogin: timestampToDate(data.lastLogin),
    };
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
}

/**
 * Get user profile by email
 */
export async function getUserProfileByEmail(email: string): Promise<UserProfile | null> {
  try {
    const q = query(collection(db, USERS_COLLECTION), where("email", "==", email.toLowerCase()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const docSnap = snapshot.docs[0];
    const data = docSnap.data();
    return {
      uid: docSnap.id,
      email: data.email,
      displayName: data.displayName,
      role: data.role as UserRole,
      status: (data.status as UserStatus) || "active",
      isActive: data.isActive !== false,
      allowedDevelopments: data.allowedDevelopments || undefined,
      invitedBy: data.invitedBy,
      invitedAt: timestampToDate(data.invitedAt),
      createdAt: timestampToDate(data.createdAt) || new Date(),
      lastLogin: timestampToDate(data.lastLogin),
    };
  } catch (error) {
    console.error("Error getting user by email:", error);
    return null;
  }
}

/**
 * Check if an email is an admin email
 */
function isAdminEmail(email: string): boolean {
  const normalizedEmail = email.toLowerCase();
  return ADMIN_EMAILS.some((adminEmail) => normalizedEmail === adminEmail.toLowerCase());
}

/**
 * Create a new user profile from an accepted invite
 */
export async function createUserFromInvite(
  uid: string,
  email: string,
  displayName: string,
  invite: UserInvite
): Promise<UserProfile> {
  const userProfile = {
    uid,
    email: email.toLowerCase(),
    displayName,
    role: invite.role,
    status: "active" as UserStatus,
    isActive: true,
    allowedDevelopments: invite.allowedDevelopments || null,
    invitedBy: invite.invitedBy,
    invitedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
  };

  const docRef = doc(db, USERS_COLLECTION, uid);
  await setDoc(docRef, userProfile);

  // Mark invite as accepted
  await markInviteAsAccepted(invite.id);

  // Create notification for the admin who invited
  await createNotification({
    userId: invite.invitedBy,
    type: "invite_accepted",
    title: "Invitation Accepted",
    message: `${displayName} has accepted your invite and joined DevTracker as ${ROLE_INFO[invite.role].label}`,
    data: { newUserId: uid, newUserEmail: email },
  });

  // Send email notification to admin (queued)
  if (invite.invitedByEmail) {
    await sendInviteAcceptedEmail({
      toEmail: invite.invitedByEmail,
      adminName: invite.invitedByName || "Admin",
      newUserName: displayName,
      newUserEmail: email,
      role: ROLE_INFO[invite.role].label,
    });
  }

  // Log audit event
  await logAuditEvent({
    action: "invite_accepted",
    userId: uid,
    userEmail: email,
    details: {
      invitedBy: invite.invitedBy,
      role: invite.role,
      allowedDevelopments: invite.allowedDevelopments,
    },
  });

  return {
    uid,
    email: email.toLowerCase(),
    displayName,
    role: invite.role,
    status: "active",
    isActive: true,
    allowedDevelopments: invite.allowedDevelopments,
    invitedBy: invite.invitedBy,
    invitedAt: new Date(),
    createdAt: new Date(),
    lastLogin: new Date(),
  };
}

/**
 * Create admin user profile (for hardcoded admin emails only)
 */
export async function createAdminUserProfile(
  uid: string,
  email: string,
  displayName?: string
): Promise<UserProfile> {
  if (!isAdminEmail(email)) {
    throw new Error("Not authorized to create admin profile");
  }

  const userProfile = {
    uid,
    email: email.toLowerCase(),
    displayName: displayName || email.split("@")[0],
    role: "admin" as UserRole,
    status: "active" as UserStatus,
    isActive: true,
    allowedDevelopments: null,
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
  };

  const docRef = doc(db, USERS_COLLECTION, uid);
  await setDoc(docRef, userProfile);

  await logAuditEvent({
    action: "admin_created",
    userId: uid,
    userEmail: email,
    details: { displayName },
  });

  return {
    uid,
    email: email.toLowerCase(),
    displayName: displayName || email.split("@")[0],
    role: "admin",
    status: "active",
    isActive: true,
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
    await updateDoc(docRef, { lastLogin: serverTimestamp() });
  } catch (error) {
    console.error("Error updating last login:", error);
  }
}

/**
 * Update a user's role
 */
export async function updateUserRole(
  uid: string,
  newRole: UserRole,
  performedBy: string
): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  const userDoc = await getDoc(docRef);

  if (!userDoc.exists()) {
    throw new Error("User not found");
  }

  const oldRole = userDoc.data().role;
  await updateDoc(docRef, { role: newRole });

  await logAuditEvent({
    action: "user_role_changed",
    userId: uid,
    userEmail: userDoc.data().email,
    performedBy,
    details: { oldRole, newRole },
  });
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  uid: string,
  updates: {
    displayName?: string;
    role?: UserRole;
    allowedDevelopments?: string[] | null;
  },
  performedBy: string
): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  const userDoc = await getDoc(docRef);

  if (!userDoc.exists()) {
    throw new Error("User not found");
  }

  const oldData = userDoc.data();
  const updateData: Record<string, unknown> = {};

  if (updates.displayName !== undefined) {
    updateData.displayName = updates.displayName;
  }
  if (updates.role !== undefined) {
    updateData.role = updates.role;
  }
  if (updates.allowedDevelopments !== undefined) {
    updateData.allowedDevelopments =
      updates.allowedDevelopments && updates.allowedDevelopments.length > 0
        ? updates.allowedDevelopments
        : null;
  }

  await updateDoc(docRef, updateData);

  await logAuditEvent({
    action: "user_edited",
    userId: uid,
    userEmail: oldData.email,
    performedBy,
    details: { changes: updates, previousValues: oldData },
  });
}

/**
 * Deactivate a user
 */
export async function deactivateUser(uid: string, performedBy: string): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  const userDoc = await getDoc(docRef);

  if (!userDoc.exists()) {
    throw new Error("User not found");
  }

  await updateDoc(docRef, {
    isActive: false,
    status: "inactive",
  });

  await logAuditEvent({
    action: "user_deactivated",
    userId: uid,
    userEmail: userDoc.data().email,
    performedBy,
    details: {},
  });
}

/**
 * Reactivate a user
 */
export async function reactivateUser(uid: string, performedBy: string): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  const userDoc = await getDoc(docRef);

  if (!userDoc.exists()) {
    throw new Error("User not found");
  }

  await updateDoc(docRef, {
    isActive: true,
    status: "active",
  });

  await logAuditEvent({
    action: "user_reactivated",
    userId: uid,
    userEmail: userDoc.data().email,
    performedBy,
    details: {},
  });
}

/**
 * Delete a user
 */
export async function deleteUser(uid: string, performedBy: string): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, uid);
  const userDoc = await getDoc(docRef);

  if (!userDoc.exists()) {
    throw new Error("User not found");
  }

  const userData = userDoc.data();
  await deleteDoc(docRef);

  await logAuditEvent({
    action: "user_deleted",
    userId: uid,
    userEmail: userData.email,
    performedBy,
    details: { deletedUserData: userData },
  });
}

/**
 * Get all users
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
        status: (data.status as UserStatus) || "active",
        isActive: data.isActive !== false,
        allowedDevelopments: data.allowedDevelopments || undefined,
        invitedBy: data.invitedBy,
        invitedAt: timestampToDate(data.invitedAt),
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
 * Check if a user can access a specific development
 */
export function canAccessDevelopment(
  user: UserProfile | null,
  developmentId: string
): boolean {
  if (!user) return false;
  if (!user.isActive) return false;
  if (user.role === "admin") return true; // Admins can access everything
  if (!user.allowedDevelopments || user.allowedDevelopments.length === 0) return true;
  return user.allowedDevelopments.includes(developmentId);
}

// ==================== Invite Functions ====================

/**
 * Create a new invite with magic link token
 */
export async function createUserInvite(
  email: string,
  role: UserRole,
  invitedBy: string,
  invitedByEmail: string,
  invitedByName?: string,
  inviteeName?: string,
  allowedDevelopments?: string[]
): Promise<UserInvite> {
  const normalizedEmail = email.toLowerCase();

  // Check if user already exists
  const existingUser = await getUserProfileByEmail(normalizedEmail);
  if (existingUser) {
    throw new Error("A user with this email already exists");
  }

  // Check if there's already a pending invite
  const existingInvite = await getPendingInviteByEmail(normalizedEmail);
  if (existingInvite) {
    throw new Error("There is already a pending invite for this email. Cancel it first or resend.");
  }

  // Generate secure token
  const token = generateSecureToken();

  // Set expiration to 7 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const inviteData = {
    email: normalizedEmail,
    role,
    allowedDevelopments: allowedDevelopments?.length ? allowedDevelopments : null,
    token,
    invitedBy,
    invitedByEmail,
    invitedByName,
    status: "pending" as const,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
  };

  const docRef = await addDoc(collection(db, INVITES_COLLECTION), inviteData);

  // Send invite email
  await sendInviteEmail({
    toEmail: normalizedEmail,
    inviteeName,
    inviterName: invitedByName || "An administrator",
    inviterEmail: invitedByEmail,
    role: ROLE_INFO[role].label,
    token,
    expiresAt,
  });

  // Log audit event
  await logAuditEvent({
    action: "user_invited",
    performedBy: invitedBy,
    details: { email: normalizedEmail, role, allowedDevelopments },
  });

  return {
    id: docRef.id,
    email: normalizedEmail,
    role,
    allowedDevelopments,
    token,
    invitedBy,
    invitedByEmail,
    invitedByName,
    status: "pending",
    createdAt: new Date(),
    expiresAt,
  };
}

/**
 * Get invite by token
 */
export async function getInviteByToken(token: string): Promise<UserInvite | null> {
  try {
    const q = query(
      collection(db, INVITES_COLLECTION),
      where("token", "==", token),
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
      await updateDoc(doc(db, INVITES_COLLECTION, docSnap.id), { status: "expired" });
      return null;
    }

    return {
      id: docSnap.id,
      email: data.email,
      role: data.role as UserRole,
      allowedDevelopments: data.allowedDevelopments || undefined,
      token: data.token,
      invitedBy: data.invitedBy,
      invitedByEmail: data.invitedByEmail,
      invitedByName: data.invitedByName,
      status: data.status,
      createdAt: timestampToDate(data.createdAt) || new Date(),
      expiresAt,
    };
  } catch (error) {
    console.error("Error getting invite by token:", error);
    return null;
  }
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
      await updateDoc(doc(db, INVITES_COLLECTION, docSnap.id), { status: "expired" });
      return null;
    }

    return {
      id: docSnap.id,
      email: data.email,
      role: data.role as UserRole,
      allowedDevelopments: data.allowedDevelopments || undefined,
      token: data.token,
      invitedBy: data.invitedBy,
      invitedByEmail: data.invitedByEmail,
      invitedByName: data.invitedByName,
      status: data.status,
      createdAt: timestampToDate(data.createdAt) || new Date(),
      expiresAt,
    };
  } catch (error) {
    console.error("Error getting pending invite:", error);
    return null;
  }
}

/**
 * Get all invites
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
        token: data.token,
        invitedBy: data.invitedBy,
        invitedByEmail: data.invitedByEmail,
        invitedByName: data.invitedByName,
        status: data.status,
        createdAt: timestampToDate(data.createdAt) || new Date(),
        expiresAt: timestampToDate(data.expiresAt) || new Date(),
        acceptedAt: timestampToDate(data.acceptedAt),
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
    acceptedAt: serverTimestamp(),
  });
}

/**
 * Cancel an invite
 */
export async function cancelInvite(inviteId: string, performedBy: string): Promise<void> {
  const docRef = doc(db, INVITES_COLLECTION, inviteId);
  const inviteDoc = await getDoc(docRef);

  if (!inviteDoc.exists()) {
    throw new Error("Invite not found");
  }

  const inviteData = inviteDoc.data();
  await updateDoc(docRef, { status: "cancelled" });

  await logAuditEvent({
    action: "invite_cancelled",
    performedBy,
    details: { email: inviteData.email, role: inviteData.role },
  });
}

/**
 * Resend an invite (generates new token and expiry)
 */
export async function resendInvite(inviteId: string, performedBy: string): Promise<UserInvite> {
  const docRef = doc(db, INVITES_COLLECTION, inviteId);
  const inviteDoc = await getDoc(docRef);

  if (!inviteDoc.exists()) {
    throw new Error("Invite not found");
  }

  const data = inviteDoc.data();

  // Generate new token
  const newToken = generateSecureToken();
  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + 7);

  await updateDoc(docRef, {
    token: newToken,
    expiresAt: Timestamp.fromDate(newExpiresAt),
    status: "pending",
  });

  // Send new invite email
  await sendInviteEmail({
    toEmail: data.email,
    inviterName: data.invitedByName,
    inviterEmail: data.invitedByEmail,
    role: ROLE_INFO[data.role as UserRole].label,
    token: newToken,
    expiresAt: newExpiresAt,
  });

  await logAuditEvent({
    action: "invite_resent",
    performedBy,
    details: { email: data.email, role: data.role },
  });

  return {
    id: inviteId,
    email: data.email,
    role: data.role as UserRole,
    allowedDevelopments: data.allowedDevelopments || undefined,
    token: newToken,
    invitedBy: data.invitedBy,
    invitedByEmail: data.invitedByEmail,
    invitedByName: data.invitedByName,
    status: "pending",
    createdAt: timestampToDate(data.createdAt) || new Date(),
    expiresAt: newExpiresAt,
  };
}

/**
 * Delete an invite completely
 */
export async function deleteInvite(inviteId: string): Promise<void> {
  const docRef = doc(db, INVITES_COLLECTION, inviteId);
  await deleteDoc(docRef);
}

// ==================== Notification Functions ====================

/**
 * Create a notification
 */
export async function createNotification(params: {
  userId: string;
  type: UserNotification["type"];
  title: string;
  message: string;
  data?: Record<string, unknown>;
}): Promise<string> {
  const notification = {
    ...params,
    read: false,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), notification);
  return docRef.id;
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(userId: string): Promise<UserNotification[]> {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data,
        read: data.read,
        createdAt: timestampToDate(data.createdAt) || new Date(),
      };
    });
  } catch (error) {
    console.error("Error getting notifications:", error);
    return [];
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where("userId", "==", userId),
      where("read", "==", false)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
  await updateDoc(docRef, { read: true });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where("userId", "==", userId),
    where("read", "==", false)
  );
  const querySnapshot = await getDocs(q);

  const updates = querySnapshot.docs.map((docSnap) =>
    updateDoc(doc(db, NOTIFICATIONS_COLLECTION, docSnap.id), { read: true })
  );

  await Promise.all(updates);
}

// ==================== Audit Logging ====================

/**
 * Log an audit event
 */
async function logAuditEvent(params: {
  action: string;
  userId?: string;
  userEmail?: string;
  performedBy?: string;
  details: Record<string, unknown>;
}): Promise<void> {
  try {
    await addDoc(collection(db, AUDIT_LOGS_COLLECTION), {
      ...params,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error logging audit event:", error);
  }
}

// ==================== Cleanup Functions ====================

/**
 * Delete orphan user by email
 */
export async function deleteUserByEmail(
  email: string,
  performedBy: string
): Promise<boolean> {
  try {
    const user = await getUserProfileByEmail(email);
    if (user) {
      await deleteUser(user.uid, performedBy);
      return true;
    }

    // Also check invites
    const invite = await getPendingInviteByEmail(email);
    if (invite) {
      await deleteInvite(invite.id);
    }

    return false;
  } catch (error) {
    console.error("Error deleting user by email:", error);
    return false;
  }
}

/**
 * Check if email is a system admin email
 */
export function isSystemAdminEmail(email: string): boolean {
  return isAdminEmail(email);
}
