import { useState } from "react";
import { Link } from "react-router-dom";
import { developments } from "../data/realDevelopments";
import type { Development, DevelopmentStatus } from "../types";

type FilterTab = "Active" | "Completed" | "Archived" | "All";

const statusBadgeClasses: Record<DevelopmentStatus, string> = {
  Active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Archived: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export function ManageDevelopments() {
  const [activeTab, setActiveTab] = useState<FilterTab>("Active");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDevelopment, setEditingDevelopment] = useState<Development | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Filter developments based on active tab
  const filteredDevelopments = developments.filter((dev) => {
    if (activeTab === "All") return true;
    return dev.status === activeTab;
  });

  const tabs: FilterTab[] = ["Active", "Completed", "Archived", "All"];

  const getCounts = () => ({
    Active: developments.filter((d) => d.status === "Active").length,
    Completed: developments.filter((d) => d.status === "Completed").length,
    Archived: developments.filter((d) => d.status === "Archived").length,
    All: developments.length,
  });

  const counts = getCounts();

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
              Manage Developments
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Add, edit, or archive development projects
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add New Development
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-[var(--border-subtle)]">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-display text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-[var(--accent-cyan)] text-[var(--accent-cyan)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {tab}
            <span className="ml-2 px-2 py-0.5 rounded-full bg-[var(--bg-deep)] text-xs">
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Development Cards */}
      <div className="grid gap-4">
        {filteredDevelopments.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)]">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p>No {activeTab.toLowerCase()} developments found</p>
          </div>
        ) : (
          filteredDevelopments.map((dev) => (
            <div
              key={dev.id}
              className={`card p-5 ${dev.status === "Archived" ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                      {dev.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
                        statusBadgeClasses[dev.status]
                      }`}
                    >
                      {dev.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-[var(--text-muted)]">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                      {dev.projectNumber}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {dev.totalUnits} units
                    </span>
                    {dev.description && (
                      <span className="text-[var(--text-muted)]">{dev.description}</span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <Link
                    to={`/development/${dev.id}`}
                    className="px-3 py-1.5 text-sm rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-deep)] transition-colors"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => setEditingDevelopment(dev)}
                    className="px-3 py-1.5 text-sm rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-deep)] transition-colors"
                  >
                    Edit Details
                  </button>
                  {dev.status === "Active" && (
                    <button
                      onClick={() => {
                        // In a real app, this would update the status
                        alert(`Mark "${dev.name}" as Complete - Feature coming soon`);
                      }}
                      className="px-3 py-1.5 text-sm rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors"
                    >
                      Mark Complete
                    </button>
                  )}
                  {dev.status !== "Archived" ? (
                    <button
                      onClick={() => {
                        // In a real app, this would archive the development
                        alert(`Archive "${dev.name}" - Feature coming soon`);
                      }}
                      className="px-3 py-1.5 text-sm rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
                    >
                      Archive
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        // In a real app, this would restore the development
                        alert(`Restore "${dev.name}" - Feature coming soon`);
                      }}
                      className="px-3 py-1.5 text-sm rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                    >
                      Restore
                    </button>
                  )}
                  {dev.units.length === 0 && (
                    <button
                      onClick={() => setConfirmDelete(dev.id)}
                      className="px-3 py-1.5 text-sm rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Development Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md card p-6 animate-fade-in">
            <h2 className="font-display text-xl font-bold text-[var(--text-primary)] mb-4">
              Add New Development
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert("Add Development - Feature coming soon. This requires backend integration.");
                setShowAddModal(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Development Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-deep)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none"
                  placeholder="e.g., Riverside Gardens"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Project Number
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-deep)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none"
                  placeholder="e.g., RG-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Description (optional)
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-deep)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none resize-none"
                  placeholder="Brief description of the development..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Development
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Development Modal */}
      {editingDevelopment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md card p-6 animate-fade-in">
            <h2 className="font-display text-xl font-bold text-[var(--text-primary)] mb-4">
              Edit Development
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert("Edit Development - Feature coming soon. This requires backend integration.");
                setEditingDevelopment(null);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Development Name
                </label>
                <input
                  type="text"
                  required
                  defaultValue={editingDevelopment.name}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-deep)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Project Number
                </label>
                <input
                  type="text"
                  required
                  defaultValue={editingDevelopment.projectNumber}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-deep)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Description (optional)
                </label>
                <textarea
                  rows={3}
                  defaultValue={editingDevelopment.description || ""}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-deep)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDevelopment(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm card p-6 animate-fade-in">
            <h2 className="font-display text-xl font-bold text-[var(--text-primary)] mb-2">
              Delete Development?
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              This action cannot be undone. The development will be permanently removed.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert("Delete Development - Feature coming soon. This requires backend integration.");
                  setConfirmDelete(null);
                }}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
