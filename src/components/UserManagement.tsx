import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  getAllUsers,
  deactivateUser,
  reactivateUser,
  updateUserProfile,
  createUserInvite,
  getAllInvites,
  cancelInvite,
  resendInvite,
} from "../services/userService";
import { useAuth } from "../contexts/AuthContext";
import type { UserProfile, UserRole, UserInvite } from "../types/roles";
import { ROLE_INFO } from "../types/roles";
import { developments } from "../data/realDevelopments";

type TabType = "users" | "invites";

export function UserManagement() {
  const { can, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("users");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [invites, setInvites] = useState<UserInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Invite form state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("viewer");
  const [inviteDevs, setInviteDevs] = useState<string[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Edit user modal state
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("viewer");
  const [editDevs, setEditDevs] = useState<string[]>([]);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [allUsers, allInvites] = await Promise.all([
        getAllUsers(),
        getAllInvites(),
      ]);
      setUsers(allUsers);
      setInvites(allInvites);
      setError(null);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(user: UserProfile) {
    if (!currentUser) return;

    if (user.uid === currentUser.uid) {
      alert("You cannot deactivate your own account");
      return;
    }

    const action = user.isActive ? "deactivate" : "reactivate";
    if (!confirm(`Are you sure you want to ${action} ${user.email}?`)) {
      return;
    }

    setUpdatingUserId(user.uid);
    try {
      if (user.isActive) {
        await deactivateUser(user.uid, currentUser.uid);
      } else {
        await reactivateUser(user.uid, currentUser.uid);
      }
      setUsers((prev) =>
        prev.map((u) => (u.uid === user.uid ? { ...u, isActive: !user.isActive } : u))
      );
    } catch (err) {
      console.error("Error updating user status:", err);
      alert(`Failed to ${action} user`);
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;

    setInviteLoading(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      const newInvite = await createUserInvite(
        inviteEmail,
        inviteRole,
        currentUser.uid,
        currentUser.email || "",
        currentUser.displayName || undefined,
        inviteName || undefined,
        inviteDevs.length > 0 ? inviteDevs : undefined
      );
      setInvites((prev) => [newInvite, ...prev]);
      setInviteSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("viewer");
      setInviteDevs([]);
      // Close modal after short delay to show success
      setTimeout(() => {
        setShowInviteForm(false);
        setInviteSuccess(null);
      }, 2000);
    } catch (err) {
      console.error("Error creating invite:", err);
      setInviteError(err instanceof Error ? err.message : "Failed to create invite");
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleCancelInvite(invite: UserInvite) {
    if (!currentUser) return;

    if (!confirm(`Cancel invite for ${invite.email}?`)) {
      return;
    }

    try {
      await cancelInvite(invite.id, currentUser.uid);
      setInvites((prev) =>
        prev.map((i) => (i.id === invite.id ? { ...i, status: "cancelled" as const } : i))
      );
    } catch (err) {
      console.error("Error cancelling invite:", err);
      alert("Failed to cancel invite");
    }
  }

  async function handleResendInvite(invite: UserInvite) {
    if (!currentUser) return;

    try {
      const newInvite = await resendInvite(invite.id, currentUser.uid);
      setInvites((prev) => prev.map((i) => (i.id === invite.id ? newInvite : i)));
      alert(`Invite resent for ${invite.email}`);
    } catch (err) {
      console.error("Error resending invite:", err);
      alert("Failed to resend invite");
    }
  }

  function openEditModal(user: UserProfile) {
    setEditingUser(user);
    setEditName(user.displayName || "");
    setEditRole(user.role);
    setEditDevs(user.allowedDevelopments || []);
  }

  async function handleSaveEdit() {
    if (!editingUser || !currentUser) return;

    setEditLoading(true);
    try {
      const updates: {
        displayName?: string;
        role?: UserRole;
        allowedDevelopments?: string[] | null;
      } = {
        displayName: editName,
      };

      // Only update role and developments for other users
      if (editingUser.uid !== currentUser.uid) {
        updates.role = editRole;
        updates.allowedDevelopments = editDevs.length > 0 ? editDevs : null;
      }

      await updateUserProfile(editingUser.uid, updates, currentUser.uid);

      setUsers((prev) =>
        prev.map((u) =>
          u.uid === editingUser.uid
            ? {
                ...u,
                displayName: editName,
                role: editingUser.uid !== currentUser.uid ? editRole : u.role,
                allowedDevelopments: editingUser.uid !== currentUser.uid ? (editDevs.length > 0 ? editDevs : undefined) : u.allowedDevelopments,
              }
            : u
        )
      );
      setEditingUser(null);
    } catch (err) {
      console.error("Error updating user:", err);
      alert("Failed to update user");
    } finally {
      setEditLoading(false);
    }
  }

  function formatDate(date: Date | undefined): string {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const roleColors: Record<UserRole, string> = {
    admin: "bg-red-500/20 text-red-400 border-red-500/30",
    manager: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    editor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    viewer: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    accepted: "bg-green-500/20 text-green-400 border-green-500/30",
    expired: "bg-red-500/20 text-red-400 border-red-500/30",
    cancelled: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };

  if (!can("manageUsers")) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-full bg-[var(--bg-card)] flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-2">
          Access Denied
        </h2>
        <p className="text-[var(--text-secondary)] mb-6">
          You don't have permission to manage users.
        </p>
        <Link to="/" className="btn-primary">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const pendingInvites = invites.filter((i) => i.status === "pending");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
              User Management
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Manage users, invitations, and access control
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInviteForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Invite User
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--bg-deep)] rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 rounded-md font-mono text-sm font-medium transition-all ${
            activeTab === "users"
              ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("invites")}
          className={`px-4 py-2 rounded-md font-mono text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === "invites"
              ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          Invites
          {pendingInvites.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">
              {pendingInvites.length}
            </span>
          )}
        </button>
      </div>

      {/* Role Legend */}
      <div className="card p-4">
        <h3 className="font-display text-sm font-semibold text-[var(--text-secondary)] mb-3">Role Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.entries(ROLE_INFO) as [UserRole, typeof ROLE_INFO.admin][]).map(([role, info]) => (
            <div key={role} className="flex items-start gap-3">
              <span className={`px-2 py-1 text-xs font-medium rounded border ${roleColors[role]}`}>
                {info.label}
              </span>
              <p className="text-xs text-[var(--text-muted)]">{info.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="card p-4 border-red-500/30 bg-red-500/10">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Users Tab */}
      {!loading && activeTab === "users" && users.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--bg-deep)] border-b border-[var(--border-subtle)]">
                  <th className="px-6 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Access
                  </th>
                  <th className="px-6 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-4 text-right font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isCurrentUser = user.uid === currentUser?.uid;
                  const isUpdating = updatingUserId === user.uid;

                  return (
                    <tr
                      key={user.uid}
                      className={`border-b border-[var(--border-subtle)] ${
                        isCurrentUser ? "bg-[var(--accent-cyan)]/5" : ""
                      } ${!user.isActive ? "opacity-60" : ""}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            user.isActive
                              ? "bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)]"
                              : "bg-gray-500"
                          }`}>
                            <span className="font-display text-sm font-bold text-white">
                              {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-[var(--text-primary)]">
                              {user.displayName || "No name"}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs text-[var(--accent-cyan)]">(You)</span>
                              )}
                            </p>
                            <p className="text-sm text-[var(--text-muted)]">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded border ${roleColors[user.role]}`}>
                          {ROLE_INFO[user.role].label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded border ${
                          user.isActive
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        }`}>
                          {user.isActive ? "Active" : "Deactivated"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-[var(--text-muted)]">
                          {!user.allowedDevelopments || user.allowedDevelopments.length === 0
                            ? "All developments"
                            : `${user.allowedDevelopments.length} development${user.allowedDevelopments.length > 1 ? "s" : ""}`}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                        {formatDate(user.lastLogin)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isCurrentUser && (
                            <>
                              <button
                                onClick={() => openEditModal(user)}
                                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-cyan)] hover:bg-[var(--bg-deep)] transition-colors"
                                title="Edit user"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleToggleActive(user)}
                                disabled={isUpdating}
                                className={`p-2 rounded-lg transition-colors ${
                                  user.isActive
                                    ? "text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10"
                                    : "text-[var(--text-muted)] hover:text-green-400 hover:bg-green-500/10"
                                }`}
                                title={user.isActive ? "Deactivate user" : "Reactivate user"}
                              >
                                {user.isActive ? (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                              </button>
                            </>
                          )}
                          {isCurrentUser && (
                            <span className="text-xs text-[var(--text-muted)]">Cannot modify</span>
                          )}
                          {isUpdating && (
                            <div className="w-4 h-4 border-2 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invites Tab */}
      {!loading && activeTab === "invites" && (
        <div className="card overflow-hidden">
          {invites.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[var(--bg-deep)] border-b border-[var(--border-subtle)]">
                    <th className="px-6 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Invited By
                    </th>
                    <th className="px-6 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-6 py-4 text-right font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((invite) => (
                    <tr key={invite.id} className="border-b border-[var(--border-subtle)]">
                      <td className="px-6 py-4 text-[var(--text-primary)]">
                        {invite.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded border ${roleColors[invite.role]}`}>
                          {ROLE_INFO[invite.role].label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded border capitalize ${statusColors[invite.status]}`}>
                          {invite.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                        {invite.invitedByEmail}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                        {formatDate(invite.expiresAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {invite.status === "pending" && (
                            <button
                              onClick={() => handleResendInvite(invite)}
                              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-cyan)] hover:bg-[var(--bg-deep)] transition-colors"
                              title="Resend invite"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                          )}
                          {invite.status === "pending" && (
                            <button
                              onClick={() => handleCancelInvite(invite)}
                              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Cancel invite"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-[var(--text-muted)]">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p>No invitations yet</p>
              <button
                onClick={() => setShowInviteForm(true)}
                className="mt-4 text-[var(--accent-cyan)] hover:underline"
              >
                Invite your first user
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && activeTab === "users" && users.length === 0 && !error && (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <p>No users found</p>
        </div>
      )}

      {/* Stats */}
      {!loading && users.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="card p-4 text-center">
            <p className="font-mono text-2xl font-bold text-[var(--text-primary)]">
              {users.length}
            </p>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Total Users</p>
          </div>
          <div className="card p-4 text-center">
            <p className="font-mono text-2xl font-bold text-green-400">
              {users.filter((u) => u.isActive).length}
            </p>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Active</p>
          </div>
          <div className="card p-4 text-center">
            <p className="font-mono text-2xl font-bold text-red-400">
              {users.filter((u) => u.role === "admin").length}
            </p>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Admins</p>
          </div>
          <div className="card p-4 text-center">
            <p className="font-mono text-2xl font-bold text-purple-400">
              {users.filter((u) => u.role === "manager").length}
            </p>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Managers</p>
          </div>
          <div className="card p-4 text-center">
            <p className="font-mono text-2xl font-bold text-blue-400">
              {users.filter((u) => u.role === "editor").length}
            </p>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Editors</p>
          </div>
          <div className="card p-4 text-center">
            <p className="font-mono text-2xl font-bold text-gray-400">
              {users.filter((u) => u.role === "viewer").length}
            </p>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Viewers</p>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">
                Invite User
              </h2>
              <button
                onClick={() => setShowInviteForm(false)}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-deep)] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  Name (Optional)
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="input w-full"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="input w-full"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="select w-full"
                >
                  <option value="viewer">Viewer - View only access</option>
                  <option value="editor">Editor - Can edit data</option>
                  <option value="manager">Manager - Can manage users</option>
                  <option value="admin">Admin - Full access</option>
                </select>
              </div>

              <div>
                <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  Development Access
                </label>
                <div className="max-h-40 overflow-y-auto space-y-2 p-3 bg-[var(--bg-deep)] rounded-lg border border-[var(--border-subtle)]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inviteDevs.length === 0}
                      onChange={() => setInviteDevs([])}
                      className="rounded border-[var(--border-subtle)]"
                    />
                    <span className="text-sm text-[var(--text-primary)]">All developments</span>
                  </label>
                  <div className="h-px bg-[var(--border-subtle)] my-2" />
                  {developments.map((dev) => (
                    <label key={dev.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={inviteDevs.includes(dev.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setInviteDevs([...inviteDevs, dev.id]);
                          } else {
                            setInviteDevs(inviteDevs.filter((id) => id !== dev.id));
                          }
                        }}
                        className="rounded border-[var(--border-subtle)]"
                      />
                      <span className="text-sm text-[var(--text-secondary)]">{dev.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Leave as "All developments" or select specific ones
                </p>
              </div>

              {inviteError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">{inviteError}</p>
                </div>
              )}

              {inviteSuccess && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-green-400">{inviteSuccess}</p>
                </div>
              )}

              {!inviteSuccess && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowInviteForm(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {inviteLoading && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    Send Invitation
                  </button>
                </div>
              )}
            </form>

            <div className="mt-4 p-3 bg-[var(--bg-deep)] rounded-lg">
              <p className="text-xs text-[var(--text-muted)]">
                An email with a magic link will be sent to the user. They can click the link to create their account.
                The invitation expires in 7 days.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">
                Edit User
              </h2>
              <button
                onClick={() => setEditingUser(null)}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-deep)] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={editingUser.email}
                  disabled
                  className="input w-full opacity-50 cursor-not-allowed"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input w-full"
                  placeholder="John Doe"
                />
              </div>

              {editingUser.uid !== currentUser?.uid && (
                <>
                  <div>
                    <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                      Role
                    </label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as UserRole)}
                      className="select w-full"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                      Development Access
                    </label>
                    <div className="max-h-40 overflow-y-auto space-y-2 p-3 bg-[var(--bg-deep)] rounded-lg border border-[var(--border-subtle)]">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editDevs.length === 0}
                          onChange={() => setEditDevs([])}
                          className="rounded border-[var(--border-subtle)]"
                        />
                        <span className="text-sm text-[var(--text-primary)]">All developments</span>
                      </label>
                      <div className="h-px bg-[var(--border-subtle)] my-2" />
                      {developments.map((dev) => (
                        <label key={dev.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editDevs.includes(dev.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditDevs([...editDevs, dev.id]);
                              } else {
                                setEditDevs(editDevs.filter((id) => id !== dev.id));
                              }
                            }}
                            className="rounded border-[var(--border-subtle)]"
                          />
                          <span className="text-sm text-[var(--text-secondary)]">{dev.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={editLoading}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {editLoading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
