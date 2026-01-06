import { useState, useMemo } from "react";
import { developments } from "../data/realDevelopments";

interface DevelopmentOption {
  id: string;
  name: string;
  unitCount: number;
  unitsInLookahead: number;
}

interface ReportDevelopmentSelectorProps {
  title: string;
  onGenerate: (selectedDevelopmentIds: string[]) => void;
  onCancel: () => void;
  getUnitsInLookahead?: (developmentId: string) => number;
}

export function ReportDevelopmentSelector({
  title,
  onGenerate,
  onCancel,
  getUnitsInLookahead,
}: ReportDevelopmentSelectorProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(developments.map((d) => d.id))
  );

  const developmentOptions: DevelopmentOption[] = useMemo(() => {
    return developments
      .filter((d) => d.status === "Active")
      .map((d) => ({
        id: d.id,
        name: d.name,
        unitCount: d.units.length,
        unitsInLookahead: getUnitsInLookahead ? getUnitsInLookahead(d.id) : 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [getUnitsInLookahead]);

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(developmentOptions.map((d) => d.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleGenerate = () => {
    onGenerate(Array.from(selectedIds));
  };

  const selectedCount = selectedIds.size;
  const totalUnitsSelected = developmentOptions
    .filter((d) => selectedIds.has(d.id))
    .reduce((sum, d) => sum + (getUnitsInLookahead ? d.unitsInLookahead : d.unitCount), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-[var(--bg-card)] rounded-xl shadow-2xl border border-[var(--border-subtle)] w-full max-w-lg max-h-[80vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">
            {title}
          </h2>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-deep)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Selection Actions */}
        <div className="flex items-center justify-between px-5 py-3 bg-[var(--bg-deep)] border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1.5 rounded-lg font-mono text-xs font-medium text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/10 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-3 py-1.5 rounded-lg font-mono text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
            >
              Deselect All
            </button>
          </div>
          <div className="font-mono text-xs text-[var(--text-muted)]">
            {selectedCount} of {developmentOptions.length} selected
            {totalUnitsSelected > 0 && (
              <span className="ml-2 text-[var(--accent-cyan)]">
                ({totalUnitsSelected} units)
              </span>
            )}
          </div>
        </div>

        {/* Development List */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {developmentOptions.map((dev) => (
              <label
                key={dev.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedIds.has(dev.id)
                    ? "bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30"
                    : "bg-[var(--bg-deep)] border border-transparent hover:border-[var(--border-subtle)]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(dev.id)}
                  onChange={() => handleToggle(dev.id)}
                  className="w-4 h-4 rounded border-[var(--border-subtle)] text-[var(--accent-cyan)] focus:ring-[var(--accent-cyan)] focus:ring-offset-0 bg-[var(--bg-deep)]"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-sm font-medium text-[var(--text-primary)] truncate">
                    {dev.name}
                  </div>
                  <div className="font-mono text-xs text-[var(--text-muted)]">
                    {dev.unitCount} total units
                    {getUnitsInLookahead && dev.unitsInLookahead > 0 && (
                      <span className="ml-2 text-[var(--accent-purple)]">
                        {dev.unitsInLookahead} in report
                      </span>
                    )}
                  </div>
                </div>
                {selectedIds.has(dev.id) && (
                  <svg className="w-5 h-5 text-[var(--accent-cyan)]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-[var(--border-subtle)]">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg font-mono text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-deep)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={selectedCount === 0}
            className={`px-5 py-2 rounded-lg font-mono text-sm font-medium transition-all ${
              selectedCount > 0
                ? "bg-[var(--accent-cyan)] text-[var(--bg-deep)] hover:bg-[var(--accent-cyan-bright)] shadow-lg shadow-[rgba(6,214,214,0.3)]"
                : "bg-[var(--bg-deep)] text-[var(--text-muted)] border border-[var(--border-subtle)] cursor-not-allowed"
            }`}
          >
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
}
