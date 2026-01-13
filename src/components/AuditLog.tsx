import { useState, useEffect, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  getAuditLogs,
  getAllUsers,
  formatAuditValue,
  downloadCSV,
  type GetAuditLogsResult,
} from "../services/auditLogService";
import type { AuditLogEntry, AuditLogFilters, AuditAction } from "../types/auditLog";
import { developments } from "../data/realDevelopments";
import { useAuth } from "../contexts/AzureAuthContext";

const actionBadgeClasses: Record<AuditAction, string> = {
  create: "badge badge-complete",
  update: "badge badge-progress",
  delete: "badge badge-notstarted",
  bulk_update: "badge badge-reserved",
  note_added: "badge badge-available",
  note_edited: "badge badge-agreed",
  note_deleted: "badge badge-notstarted",
};

const actionLabels: Record<AuditAction, string> = {
  create: "Create",
  update: "Update",
  delete: "Delete",
  bulk_update: "Bulk Update",
  note_added: "Note Added",
  note_edited: "Note Edited",
  note_deleted: "Note Deleted",
};

function formatDateTime(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AuditLog() {
  const { can } = useAuth();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<{ id: string; email: string; name: string }[]>([]);
  const [continuationToken, setContinuationToken] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedDevelopment, setSelectedDevelopment] = useState("");
  const [selectedAction, setSelectedAction] = useState("");

  const loadLogs = useCallback(async (resetPagination = true) => {
    try {
      setLoading(true);
      setError(null);

      const activeFilters: AuditLogFilters = {};
      if (startDate) activeFilters.startDate = new Date(startDate);
      if (endDate) activeFilters.endDate = new Date(endDate);
      if (selectedUser) activeFilters.userId = selectedUser;
      if (selectedDevelopment) activeFilters.developmentId = selectedDevelopment;
      if (selectedAction) activeFilters.action = selectedAction as AuditAction;

      const result: GetAuditLogsResult = await getAuditLogs(
        activeFilters,
        50,
        resetPagination ? undefined : continuationToken
      );

      if (resetPagination) {
        setEntries(result.entries);
      } else {
        setEntries((prev) => [...prev, ...result.entries]);
      }
      setContinuationToken(result.continuationToken);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      setError("Failed to load audit logs. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedUser, selectedDevelopment, selectedAction, continuationToken]);

  const loadMoreLogs = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const activeFilters: AuditLogFilters = {};
      if (startDate) activeFilters.startDate = new Date(startDate);
      if (endDate) activeFilters.endDate = new Date(endDate);
      if (selectedUser) activeFilters.userId = selectedUser;
      if (selectedDevelopment) activeFilters.developmentId = selectedDevelopment;
      if (selectedAction) activeFilters.action = selectedAction as AuditAction;

      const result = await getAuditLogs(activeFilters, 50, continuationToken);
      setEntries((prev) => [...prev, ...result.entries]);
      setContinuationToken(result.continuationToken);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error("Failed to load more logs:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Initial load on mount - loadLogs excluded from deps intentionally (only run once on mount)
  useEffect(() => {
    loadLogs(true);
    getAllUsers().then(setUsers).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Permission guard - redirect unauthorized users (must be after all hooks)
  if (!can("viewAuditLog")) {
    return <Navigate to="/" replace />;
  }

  const applyFilters = () => {
    loadLogs(true);
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedUser("");
    setSelectedDevelopment("");
    setSelectedAction("");
    loadLogs(true);
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExport = () => {
    if (entries.length === 0) return;
    const date = new Date().toISOString().split("T")[0];
    downloadCSV(entries, `audit-log-${date}.csv`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[var(--accent-cyan)] hover:text-[var(--text-primary)] text-sm font-medium mb-3 transition-colors group"
          >
            <svg
              className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-gradient-to-b from-[var(--accent-cyan)] to-[var(--accent-purple)] rounded-full" />
            <div>
              <h2 className="font-display text-3xl font-bold text-[var(--text-primary)]">
                Audit Log
              </h2>
              <p className="font-mono text-sm text-[var(--text-muted)]">
                Track all changes made to units and developments
              </p>
            </div>
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={entries.length === 0}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Start Date */}
          <div>
            <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
            />
          </div>

          {/* User Filter */}
          <div>
            <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              User
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="select"
            >
              <option value="">All Users</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </select>
          </div>

          {/* Development Filter */}
          <div>
            <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Development
            </label>
            <select
              value={selectedDevelopment}
              onChange={(e) => setSelectedDevelopment(e.target.value)}
              className="select"
            >
              <option value="">All Developments</option>
              {developments.map((dev) => (
                <option key={dev.id} value={dev.id}>
                  {dev.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Action
            </label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="select"
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="bulk_update">Bulk Update</option>
              <option value="note_added">Note Added</option>
              <option value="note_edited">Note Edited</option>
              <option value="note_deleted">Note Deleted</option>
            </select>
          </div>

          {/* Filter Buttons */}
          <div className="flex items-end gap-2">
            <button onClick={applyFilters} className="btn-primary flex-1">
              Apply
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="card p-12 text-center">
          <svg className="animate-spin w-8 h-8 mx-auto text-[var(--accent-cyan)]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 text-[var(--text-secondary)]">Loading audit logs...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-12 text-center">
          <svg className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-[var(--text-secondary)]">No audit logs found</p>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            Changes will appear here when units are edited
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--bg-deep)] border-b border-[var(--border-subtle)]">
                  <th className="px-4 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider w-8">

                  </th>
                  <th className="px-4 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Date/Time
                  </th>
                  <th className="px-4 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="px-4 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Changes
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => {
                  const isExpanded = expandedRows.has(entry.id);
                  return (
                    <>
                      <tr
                        key={entry.id}
                        onClick={() => entry.changes.length > 0 && toggleRow(entry.id)}
                        className={`table-row ${entry.changes.length > 0 ? "cursor-pointer" : ""}`}
                        style={{
                          animation: `fadeInUp 0.3s ease-out forwards`,
                          animationDelay: `${index * 0.02}s`,
                          opacity: 0,
                        }}
                      >
                        <td className="px-4 py-4">
                          {entry.changes.length > 0 && (
                            <svg
                              className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isExpanded ? "rotate-90" : ""}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="font-mono text-sm text-[var(--text-primary)]">
                            {formatDateTime(entry.timestamp)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm text-[var(--text-primary)]">{entry.userName || "Unknown"}</p>
                            <p className="font-mono text-xs text-[var(--text-muted)]">{entry.userEmail}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={actionBadgeClasses[entry.action]}>
                            {actionLabels[entry.action]}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="text-sm text-[var(--text-primary)]">
                              {entry.developmentName || "-"}
                            </p>
                            {entry.unitNumber && (
                              <p className="font-mono text-xs text-[var(--text-muted)]">
                                Unit: {entry.unitNumber}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-mono text-sm text-[var(--text-secondary)]">
                            {entry.changes.length} field{entry.changes.length !== 1 ? "s" : ""} changed
                          </span>
                        </td>
                      </tr>
                      {isExpanded && entry.changes.length > 0 && (
                        <tr key={`${entry.id}-details`} className="bg-[var(--bg-deep)]">
                          <td colSpan={6} className="px-8 py-4">
                            <div className="space-y-2">
                              <p className="font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
                                Change Details
                              </p>
                              <div className="grid gap-2">
                                {entry.changes.map((change, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-4 p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]"
                                  >
                                    <span className="font-mono text-sm text-[var(--accent-cyan)] min-w-[150px]">
                                      {change.field}
                                    </span>
                                    <span className="font-mono text-sm text-[var(--text-muted)] line-through">
                                      {formatAuditValue(change.oldValue)}
                                    </span>
                                    <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                    <span className="font-mono text-sm text-[var(--accent-emerald)]">
                                      {formatAuditValue(change.newValue)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="p-4 border-t border-[var(--border-subtle)] text-center">
              <button
                onClick={loadMoreLogs}
                disabled={loadingMore}
                className="btn-primary disabled:opacity-50"
              >
                {loadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          )}

          {/* Results count */}
          <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-deep)]">
            <p className="font-mono text-sm text-[var(--text-muted)] text-center">
              Showing <span className="text-[var(--accent-cyan)]">{entries.length}</span> entries
              {hasMore && " (more available)"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
