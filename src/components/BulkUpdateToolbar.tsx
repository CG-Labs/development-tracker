interface BulkUpdateToolbarProps {
  selectedCount: number;
  onBulkUpdate: () => void;
  onClearSelection: () => void;
}

export function BulkUpdateToolbar({
  selectedCount,
  onBulkUpdate,
  onClearSelection,
}: BulkUpdateToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-fade-in-up"
      style={{ animationDuration: "0.2s" }}
    >
      <div className="glass border border-[var(--accent-cyan)]/30 rounded-xl px-6 py-4 shadow-2xl shadow-[var(--accent-cyan)]/10">
        <div className="flex items-center gap-6">
          {/* Selection count */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent-cyan)]/20 flex items-center justify-center">
              <span className="font-mono text-lg font-bold text-[var(--accent-cyan)]">
                {selectedCount}
              </span>
            </div>
            <div>
              <p className="font-display text-sm font-medium text-[var(--text-primary)]">
                {selectedCount === 1 ? "unit" : "units"} selected
              </p>
              <p className="font-mono text-xs text-[var(--text-muted)]">
                Ready for bulk update
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-10 bg-[var(--border-subtle)]" />

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBulkUpdate}
              className="btn-primary flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Bulk Update
            </button>

            <button
              onClick={onClearSelection}
              className="btn-secondary flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
