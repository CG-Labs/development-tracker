import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAllUsers, updateUserRole } from "../services/userService";
import { useAuth } from "../contexts/AuthContext";
import type { UserProfile, UserRole } from "../types/roles";
import { ROLE_INFO } from "../types/roles";

export function UserManagement() {
  const { can, currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      const allUsers = await getAllUsers();
      setUsers(allUsers);
      setError(null);
    } catch (err) {
      console.error("Error loading users:", err);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(uid: string, newRole: UserRole) {
    if (uid === currentUser?.uid) {
      alert("You cannot change your own role");
      return;
    }

    setUpdatingUserId(uid);
    try {
      await updateUserRole(uid, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      console.error("Error updating role:", err);
      alert("Failed to update user role");
    } finally {
      setUpdatingUserId(null);
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
    editor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    viewer: "bg-gray-500/20 text-gray-400 border-gray-500/30",
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
              Manage user roles and permissions
            </p>
          </div>
        </div>
        <button
          onClick={loadUsers}
          disabled={loading}
          className="btn-secondary flex items-center gap-2"
        >
          <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
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

      {/* Users Table */}
      {!loading && users.length > 0 && (
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
                    Created
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
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center">
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
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                        {formatDate(user.lastLogin)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isCurrentUser ? (
                          <span className="text-xs text-[var(--text-muted)]">Cannot modify</span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={user.role}
                              onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                              disabled={isUpdating}
                              className="text-sm bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none disabled:opacity-50"
                            >
                              <option value="viewer">Viewer</option>
                              <option value="editor">Editor</option>
                              <option value="admin">Admin</option>
                            </select>
                            {isUpdating && (
                              <div className="w-4 h-4 border-2 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && users.length === 0 && !error && (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <p>No users found</p>
        </div>
      )}

      {/* Stats */}
      {!loading && users.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="font-mono text-2xl font-bold text-red-400">
              {users.filter((u) => u.role === "admin").length}
            </p>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Admins</p>
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
    </div>
  );
}
