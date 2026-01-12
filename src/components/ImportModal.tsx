import { useState, useRef, useCallback, useEffect } from "react";
import {
  importUnitsFromExcel,
  applyImportChanges,
  formatFieldName,
  formatValue,
  type ImportResult,
  type ImportRow,
} from "../services/excelImportService";
import { useAuth } from "../contexts/AuthContext";

interface ImportModalProps {
  onClose: () => void;
  onComplete: () => void;
  developmentId?: string;
  developmentName?: string;
}

type ImportStep = "upload" | "preview" | "applying" | "complete";

export function ImportModal({ onClose, onComplete, developmentName }: ImportModalProps) {
  const { currentUser } = useAuth();
  const [step, setStep] = useState<ImportStep>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [applyProgress, setApplyProgress] = useState(0);
  const [applyResult, setApplyResult] = useState<{ success: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selection state
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());

  // Initialize selection when importResult changes
  useEffect(() => {
    if (importResult?.valid) {
      // Select all units by default
      setSelectedUnits(new Set(importResult.valid.map((row) => row.unitNumber)));
    }
  }, [importResult]);

  // Selection helpers
  const totalUnits = importResult?.valid.length || 0;
  const selectedCount = selectedUnits.size;
  const allSelected = selectedCount === totalUnits && totalUnits > 0;
  const noneSelected = selectedCount === 0;
  const someSelected = selectedCount > 0 && selectedCount < totalUnits;

  const toggleUnit = (unitNumber: string) => {
    setSelectedUnits((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(unitNumber)) {
        newSet.delete(unitNumber);
      } else {
        newSet.add(unitNumber);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (importResult?.valid) {
      setSelectedUnits(new Set(importResult.valid.map((row) => row.unitNumber)));
    }
  };

  const deselectAll = () => {
    setSelectedUnits(new Set());
  };

  const selectUpdatesOnly = () => {
    if (importResult?.valid) {
      // Select only units that have changes (updates to existing data)
      const updatesOnly = importResult.valid
        .filter((row) => row.changes.length > 0)
        .map((row) => row.unitNumber);
      setSelectedUnits(new Set(updatesOnly));
    }
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith(".xlsx")) {
      processFile(droppedFile);
    } else {
      setError("Please upload an Excel file (.xlsx)");
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith(".xlsx")) {
        processFile(selectedFile);
      } else {
        setError("Please upload an Excel file (.xlsx)");
      }
    }
  }, []);

  const processFile = async (fileToProcess: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await importUnitsFromExcel(fileToProcess);
      setImportResult(result);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyChanges = async () => {
    if (!importResult || !currentUser) return;

    // Filter to only selected units
    const unitsToImport = importResult.valid.filter((row) =>
      selectedUnits.has(row.unitNumber)
    );

    if (unitsToImport.length === 0) {
      setError("Please select at least one unit to import");
      return;
    }

    setStep("applying");
    setApplyProgress(0);

    try {
      const result = await applyImportChanges(
        unitsToImport,
        currentUser.uid,
        currentUser.email || "",
        currentUser.displayName || undefined
      );

      setApplyProgress(100);
      setApplyResult(result);
      setStep("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply changes");
      setStep("preview");
    }
  };

  const handleComplete = () => {
    onComplete();
    // Reload the page to reflect the changes since data is stored in memory
    window.location.reload();
  };

  const handleReset = () => {
    setImportResult(null);
    setError(null);
    setApplyResult(null);
    setSelectedUnits(new Set());
    setStep("upload");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Get selected rows for import
  const getSelectedRows = (): ImportRow[] => {
    if (!importResult?.valid) return [];
    return importResult.valid.filter((row) => selectedUnits.has(row.unitNumber));
  };

  // Count total changes for selected units
  const selectedChangesCount = getSelectedRows().reduce(
    (total, row) => total + row.changes.length,
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 modal-backdrop animate-fade-in" />

      <div
        className="relative card-elevated max-w-4xl w-full max-h-[90vh] overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative corners */}
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-[var(--accent-cyan)] opacity-40 rounded-tl-xl" />
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-[var(--accent-cyan)] opacity-40 rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-[var(--accent-cyan)] opacity-40 rounded-bl-xl" />
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-[var(--accent-cyan)] opacity-40 rounded-br-xl" />

        {/* Header */}
        <div className="sticky top-0 z-10 glass border-b border-[var(--border-subtle)] px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div>
            <p className="font-mono text-xs text-[var(--accent-cyan)] uppercase tracking-wider">
              Excel Import
            </p>
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">
              {developmentName ? `Import ${developmentName} Units` : "Import Units"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg border border-[var(--border-subtle)] hover:border-[var(--accent-cyan)] hover:bg-[rgba(6,214,214,0.1)] transition-all group"
            aria-label="Close modal"
          >
            <svg
              className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--accent-cyan)] transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-[var(--accent-rose)]/10 border border-[var(--accent-rose)]/20 rounded-lg">
              <p className="text-[var(--accent-rose)] font-mono text-sm">{error}</p>
            </div>
          )}

          {/* Step: Upload */}
          {step === "upload" && (
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                isDragging
                  ? "border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/5"
                  : "border-[var(--border-subtle)] hover:border-[var(--accent-cyan)]/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isProcessing ? (
                <div className="flex flex-col items-center gap-4">
                  <svg className="animate-spin w-12 h-12 text-[var(--accent-cyan)]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-[var(--text-secondary)]">Processing file...</p>
                </div>
              ) : (
                <>
                  <svg
                    className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-[var(--text-primary)] font-display text-lg mb-2">
                    Drag and drop your Excel file here
                  </p>
                  <p className="text-[var(--text-muted)] text-sm mb-4">or</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-primary"
                  >
                    Browse Files
                  </button>
                  <p className="text-[var(--text-muted)] text-xs mt-4">
                    Only .xlsx files are supported
                  </p>
                </>
              )}
            </div>
          )}

          {/* Step: Preview */}
          {step === "preview" && importResult && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryCard label="Total Rows" value={importResult.summary.total} color="cyan" />
                <SummaryCard label="Will Update" value={importResult.summary.changed} color="emerald" />
                <SummaryCard label="Unchanged" value={importResult.summary.unchanged} color="gray" />
                <SummaryCard label="Errors" value={importResult.summary.errors} color="rose" />
              </div>

              {/* Errors Section */}
              {importResult.errors.length > 0 && (
                <div className="bg-[var(--accent-rose)]/5 border border-[var(--accent-rose)]/20 rounded-lg p-4">
                  <h3 className="font-display text-sm font-semibold text-[var(--accent-rose)] mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Errors ({importResult.errors.length})
                  </h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {importResult.errors.map((error, index) => (
                      <div key={index} className="text-sm text-[var(--text-secondary)]">
                        <span className="text-[var(--accent-rose)] font-mono">Row {error.row}:</span>{" "}
                        {error.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Changes Preview with Selection */}
              {importResult.valid.length > 0 && (
                <div className="bg-[var(--bg-deep)] rounded-lg border border-[var(--border-subtle)] overflow-hidden">
                  {/* Selection Controls Header */}
                  <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-card)]">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <h3 className="font-display text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                          <svg className="w-5 h-5 text-[var(--accent-emerald)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          Changes Preview
                        </h3>
                        <span className="font-mono text-sm text-[var(--accent-cyan)]">
                          {selectedCount} of {totalUnits} units selected
                        </span>
                      </div>

                      {/* Quick Selection Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={selectAll}
                          disabled={allSelected}
                          className="px-3 py-1.5 text-xs font-mono rounded border border-[var(--border-subtle)] hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          Select All
                        </button>
                        <button
                          onClick={selectUpdatesOnly}
                          className="px-3 py-1.5 text-xs font-mono rounded border border-[var(--border-subtle)] hover:border-[var(--accent-emerald)] hover:text-[var(--accent-emerald)] transition-all"
                        >
                          Updates Only
                        </button>
                        <button
                          onClick={deselectAll}
                          disabled={noneSelected}
                          className="px-3 py-1.5 text-xs font-mono rounded border border-[var(--border-subtle)] hover:border-[var(--accent-rose)] hover:text-[var(--accent-rose)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="max-h-80 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-[var(--bg-card)] sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left w-12">
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={allSelected}
                                ref={(el) => {
                                  if (el) {
                                    el.indeterminate = someSelected;
                                  }
                                }}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 rounded border-[var(--border-subtle)] text-[var(--accent-cyan)] focus:ring-[var(--accent-cyan)] focus:ring-offset-0 bg-[var(--bg-deep)]"
                              />
                            </label>
                          </th>
                          <th className="px-4 py-2 text-left font-mono text-xs text-[var(--text-muted)] uppercase">Unit</th>
                          <th className="px-4 py-2 text-left font-mono text-xs text-[var(--text-muted)] uppercase">Field</th>
                          <th className="px-4 py-2 text-left font-mono text-xs text-[var(--text-muted)] uppercase">Old Value</th>
                          <th className="px-4 py-2 text-center font-mono text-xs text-[var(--text-muted)] uppercase w-10"></th>
                          <th className="px-4 py-2 text-left font-mono text-xs text-[var(--text-muted)] uppercase">New Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.valid.map((row) =>
                          row.changes.map((change, changeIndex) => {
                            const isSelected = selectedUnits.has(row.unitNumber);
                            return (
                              <tr
                                key={`${row.unitNumber}-${changeIndex}`}
                                className={`border-t border-[var(--border-subtle)] transition-all ${
                                  isSelected
                                    ? "bg-transparent"
                                    : "bg-[var(--bg-deep)]/50 opacity-50"
                                }`}
                              >
                                <td className="px-3 py-2">
                                  {changeIndex === 0 && (
                                    <label className="flex items-center cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleUnit(row.unitNumber)}
                                        className="w-4 h-4 rounded border-[var(--border-subtle)] text-[var(--accent-cyan)] focus:ring-[var(--accent-cyan)] focus:ring-offset-0 bg-[var(--bg-deep)]"
                                      />
                                    </label>
                                  )}
                                </td>
                                <td className="px-4 py-2">
                                  <span className={`font-mono text-sm ${isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] line-through"}`}>
                                    {row.unitNumber}
                                  </span>
                                  {changeIndex === 0 && row.warnings.length > 0 && (
                                    <span className="ml-2 text-[var(--accent-gold-bright)]" title={row.warnings.join(", ")}>
                                      ⚠️
                                    </span>
                                  )}
                                </td>
                                <td className={`px-4 py-2 text-sm ${isSelected ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)]"}`}>
                                  {formatFieldName(change.field)}
                                </td>
                                <td className="px-4 py-2">
                                  <span className={`font-mono text-sm ${isSelected ? "text-[var(--accent-rose)]" : "text-[var(--text-muted)]"}`}>
                                    {formatValue(change.oldValue)}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <svg className={`w-4 h-4 mx-auto ${isSelected ? "text-[var(--accent-cyan)]" : "text-[var(--text-muted)]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                  </svg>
                                </td>
                                <td className="px-4 py-2">
                                  <span className={`font-mono text-sm ${isSelected ? "text-[var(--accent-emerald)]" : "text-[var(--text-muted)]"}`}>
                                    {formatValue(change.newValue)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Selection Summary Footer */}
                  {!allSelected && selectedCount > 0 && (
                    <div className="px-4 py-2 border-t border-[var(--border-subtle)] bg-[var(--accent-gold-bright)]/10">
                      <p className="text-xs font-mono text-[var(--accent-gold-bright)]">
                        {totalUnits - selectedCount} unit(s) will be skipped
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Warnings */}
              {importResult.valid.some((row) => row.warnings.length > 0) && (
                <div className="bg-[var(--accent-gold-bright)]/10 border border-[var(--accent-gold-bright)]/20 rounded-lg p-4">
                  <h3 className="font-display text-sm font-semibold text-[var(--accent-gold-bright)] mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Warnings
                  </h3>
                  <div className="space-y-1">
                    {importResult.valid
                      .filter((row) => row.warnings.length > 0)
                      .map((row) =>
                        row.warnings.map((warning, idx) => (
                          <p key={`${row.unitNumber}-${idx}`} className="text-sm text-[var(--text-secondary)]">
                            <span className="font-mono text-[var(--accent-gold-bright)]">{row.unitNumber}:</span>{" "}
                            {warning}
                          </p>
                        ))
                      )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step: Applying */}
          {step === "applying" && (
            <div className="text-center py-12">
              <svg className="animate-spin w-16 h-16 mx-auto text-[var(--accent-cyan)] mb-6" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-[var(--text-primary)] font-display text-lg mb-4">Applying changes...</p>
              <div className="w-64 mx-auto bg-[var(--bg-deep)] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[var(--accent-cyan)] h-full transition-all duration-300"
                  style={{ width: `${applyProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Step: Complete */}
          {step === "complete" && applyResult && (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto bg-[var(--accent-emerald)]/20 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-[var(--accent-emerald)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-[var(--text-primary)] font-display text-2xl font-bold mb-2">
                Import Complete!
              </h3>
              <p className="text-[var(--text-secondary)] mb-6">
                Successfully updated <span className="text-[var(--accent-emerald)] font-bold">{applyResult.success}</span> units
                {applyResult.failed > 0 && (
                  <>, <span className="text-[var(--accent-rose)] font-bold">{applyResult.failed}</span> failed</>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 glass border-t border-[var(--border-subtle)] px-6 py-4 rounded-b-xl">
          <div className="flex gap-3 justify-end items-center">
            {step === "upload" && (
              <button onClick={onClose} className="btn-secondary">
                Cancel
              </button>
            )}

            {step === "preview" && (
              <>
                <button onClick={handleReset} className="btn-secondary">
                  Upload Different File
                </button>
                <button
                  onClick={handleApplyChanges}
                  disabled={selectedCount === 0}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {selectedCount === 0 ? (
                    "Select Units to Import"
                  ) : selectedCount === totalUnits ? (
                    `Import All (${selectedChangesCount} Changes)`
                  ) : (
                    `Import ${selectedCount} Selected (${selectedChangesCount} Changes)`
                  )}
                </button>
              </>
            )}

            {step === "complete" && (
              <button onClick={handleComplete} className="btn-primary">
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "cyan" | "emerald" | "gray" | "rose";
}) {
  const colorClasses = {
    cyan: "text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 border-[var(--accent-cyan)]/20",
    emerald: "text-[var(--accent-emerald)] bg-[var(--accent-emerald)]/10 border-[var(--accent-emerald)]/20",
    gray: "text-[var(--text-muted)] bg-[var(--text-muted)]/10 border-[var(--text-muted)]/20",
    rose: "text-[var(--accent-rose)] bg-[var(--accent-rose)]/10 border-[var(--accent-rose)]/20",
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <p className="font-mono text-2xl font-bold">{value}</p>
      <p className="text-xs uppercase tracking-wider opacity-80">{label}</p>
    </div>
  );
}
