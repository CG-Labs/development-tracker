import { useState } from "react";
import { developments } from "../data/realDevelopments";
import { exportUnitsToExcel, exportAllUnitsToExcel } from "../services/excelExportService";

interface ExportModalProps {
  onClose: () => void;
}

export function ExportModal({ onClose }: ExportModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  const activeDevelopments = developments.filter((d) => d.status === "Active");

  const isAllSelected = activeDevelopments.length > 0 &&
    activeDevelopments.every((d) => selectedIds.has(d.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(activeDevelopments.map((d) => d.id)));
    }
  };

  const toggleDevelopment = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const handleExport = async () => {
    if (selectedIds.size === 0) return;

    setIsExporting(true);
    try {
      if (selectedIds.size === 1) {
        // Export single development
        const id = Array.from(selectedIds)[0];
        exportUnitsToExcel(id);
      } else {
        // Export multiple developments
        const selectedDevelopments = developments.filter((d) => selectedIds.has(d.id));
        exportAllUnitsToExcel(selectedDevelopments);
      }
      onClose();
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export units. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const getTotalUnits = () => {
    return developments
      .filter((d) => selectedIds.has(d.id))
      .reduce((sum, d) => sum + d.units.length, 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="w-full max-w-lg card p-6 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--accent-cyan)]/10">
              <svg className="w-5 h-5 text-[var(--accent-cyan)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">
                Export Units
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                Select developments to export to Excel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-deep)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Select All */}
        <div className="mb-4 pb-4 border-b border-[var(--border-subtle)]">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-[var(--bg-deep)] transition-colors"
          >
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                isAllSelected
                  ? "bg-[var(--accent-cyan)] border-[var(--accent-cyan)]"
                  : "border-[var(--border-subtle)] hover:border-[var(--accent-cyan)]"
              }`}
            >
              {isAllSelected && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="font-medium text-[var(--text-primary)]">
              Select All Active Developments
            </span>
          </button>
        </div>

        {/* Development List */}
        <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
          {activeDevelopments.map((dev) => {
            const isSelected = selectedIds.has(dev.id);
            return (
              <button
                key={dev.id}
                onClick={() => toggleDevelopment(dev.id)}
                className={`flex items-center gap-3 w-full p-3 rounded-lg transition-colors ${
                  isSelected
                    ? "bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30"
                    : "hover:bg-[var(--bg-deep)] border border-transparent"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-[var(--accent-cyan)] border-[var(--accent-cyan)]"
                      : "border-[var(--border-subtle)]"
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-[var(--text-primary)]">{dev.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {dev.projectNumber} &middot; {dev.units.length} units
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
          <div className="text-sm text-[var(--text-muted)]">
            {selectedIds.size > 0 ? (
              <span>
                <span className="text-[var(--accent-cyan)] font-medium">{selectedIds.size}</span> development{selectedIds.size !== 1 ? "s" : ""} selected
                {" "}&middot;{" "}
                <span className="text-[var(--text-primary)]">{getTotalUnits()}</span> units
              </span>
            ) : (
              <span>No developments selected</span>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={selectedIds.size === 0 || isExporting}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export to Excel
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
