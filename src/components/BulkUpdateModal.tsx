import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  applyBulkUpdate,
  getChangeDescription,
  hasAnyChanges,
  isSensitiveChange,
  exportErrorsToCsv,
  getErrorTypeLabel,
  type BulkUpdateChanges,
  type BulkUpdateResult,
} from "../services/bulkUpdateService";
import type { ConstructionStatus, SalesStatus, PurchaserType } from "../types";

interface BulkUpdateModalProps {
  developmentId: string;
  developmentName: string;
  selectedUnits: string[];
  onClose: () => void;
  onComplete: () => void;
}

type TabType = "status" | "purchaser" | "completion" | "sales";

export function BulkUpdateModal({
  developmentId,
  developmentName,
  selectedUnits,
  onClose,
  onComplete,
}: BulkUpdateModalProps) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("status");
  const [isApplying, setIsApplying] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [result, setResult] = useState<BulkUpdateResult | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  // Form state
  const [changes, setChanges] = useState<BulkUpdateChanges>({});

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: "status",
      label: "Status",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: "purchaser",
      label: "Purchaser",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      id: "completion",
      label: "Completion",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: "sales",
      label: "Sales Docs",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
  ];

  const handleApply = async () => {
    if (!currentUser || !hasAnyChanges(changes)) return;

    // Check if confirmation is needed
    if (!showConfirmation && isSensitiveChange(changes, selectedUnits.length)) {
      setShowConfirmation(true);
      return;
    }

    setIsApplying(true);
    try {
      const applyResult = await applyBulkUpdate(
        developmentId,
        selectedUnits,
        changes,
        currentUser.uid,
        currentUser.email || "",
        currentUser.displayName || undefined
      );
      setResult(applyResult);
    } catch (error) {
      console.error("Bulk update failed:", error);
    } finally {
      setIsApplying(false);
    }
  };

  const handleComplete = () => {
    onComplete();
    onClose();
    window.location.reload();
  };

  const changeDescriptions = getChangeDescription(changes);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 modal-backdrop animate-fade-in" />

      <div
        className="relative card-elevated max-w-2xl w-full max-h-[90vh] overflow-hidden animate-fade-in-up"
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
              Bulk Update
            </p>
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">
              Update {selectedUnits.length} Units
            </h2>
            <p className="font-mono text-xs text-[var(--text-muted)] mt-1">
              {developmentName}
            </p>
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
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Result view */}
          {result && (
            <div className="py-4">
              {/* Success Summary */}
              <div className="text-center mb-6">
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                  result.failed === 0
                    ? "bg-[var(--accent-emerald)]/20"
                    : result.success === 0
                    ? "bg-[var(--accent-rose)]/20"
                    : "bg-[var(--accent-gold-bright)]/20"
                }`}>
                  {result.failed === 0 ? (
                    <svg className="w-8 h-8 text-[var(--accent-emerald)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : result.success === 0 ? (
                    <svg className="w-8 h-8 text-[var(--accent-rose)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-[var(--accent-gold-bright)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                </div>
                <h3 className="font-display text-xl font-bold text-[var(--text-primary)] mb-2">
                  Bulk Update {result.failed === 0 ? "Complete" : result.success === 0 ? "Failed" : "Partial Success"}
                </h3>
              </div>

              {/* Success count */}
              {result.success > 0 && (
                <div className="flex items-center gap-3 p-4 bg-[var(--accent-emerald)]/10 border border-[var(--accent-emerald)]/30 rounded-lg mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[var(--accent-emerald)]/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[var(--accent-emerald)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-display font-semibold text-[var(--accent-emerald)]">
                      {result.success} {result.success === 1 ? "unit" : "units"} updated successfully
                    </p>
                    <p className="font-mono text-xs text-[var(--text-muted)]">
                      Changes applied and saved
                    </p>
                  </div>
                </div>
              )}

              {/* Error section */}
              {result.failed > 0 && (
                <div className="bg-[var(--accent-rose)]/10 border border-[var(--accent-rose)]/30 rounded-lg overflow-hidden">
                  {/* Error header */}
                  <button
                    onClick={() => setShowErrorDetails(!showErrorDetails)}
                    className="w-full flex items-center justify-between p-4 hover:bg-[var(--accent-rose)]/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[var(--accent-rose)]/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-[var(--accent-rose)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className="font-display font-semibold text-[var(--accent-rose)]">
                          {result.failed} {result.failed === 1 ? "unit" : "units"} failed to update
                        </p>
                        <p className="font-mono text-xs text-[var(--text-muted)]">
                          Click to {showErrorDetails ? "hide" : "view"} details
                        </p>
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-[var(--accent-rose)] transition-transform ${showErrorDetails ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Error details */}
                  {showErrorDetails && (
                    <div className="border-t border-[var(--accent-rose)]/20">
                      {/* Export button */}
                      <div className="p-3 bg-[var(--bg-deep)]/50 flex justify-end">
                        <button
                          onClick={() => exportErrorsToCsv(result.errors)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-display bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)] transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Export Errors to CSV
                        </button>
                      </div>

                      {/* Error table */}
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-[var(--bg-deep)]/50 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                Development
                              </th>
                              <th className="px-4 py-2 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                Unit
                              </th>
                              <th className="px-4 py-2 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                Reason
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-subtle)]">
                            {result.errors.map((error, index) => (
                              <tr key={index} className="hover:bg-[var(--accent-rose)]/5">
                                <td className="px-4 py-3 text-[var(--text-secondary)]">
                                  {error.developmentName}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="font-mono text-[var(--text-primary)]">
                                    {error.unitNumber}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-start gap-2">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                      error.errorType === 'unit_not_found'
                                        ? 'bg-amber-500/20 text-amber-400'
                                        : error.errorType === 'invalid_status' || error.errorType === 'invalid_date'
                                        ? 'bg-orange-500/20 text-orange-400'
                                        : error.errorType === 'storage_error'
                                        ? 'bg-red-500/20 text-red-400'
                                        : 'bg-gray-500/20 text-gray-400'
                                    }`}>
                                      {getErrorTypeLabel(error.errorType)}
                                    </span>
                                    <span className="text-[var(--text-secondary)] text-xs">
                                      {error.reason}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Done button */}
              <div className="mt-6 text-center">
                <button onClick={handleComplete} className="btn-primary">
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Confirmation dialog */}
          {showConfirmation && !result && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto bg-[var(--accent-gold-bright)]/20 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-[var(--accent-gold-bright)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="font-display text-xl font-bold text-[var(--text-primary)] mb-2">
                Confirm Bulk Update
              </h3>
              <p className="text-[var(--text-secondary)] mb-4">
                You are about to update <span className="text-[var(--accent-cyan)] font-bold">{selectedUnits.length}</span> units.
                This action cannot be undone.
              </p>
              <div className="bg-[var(--bg-deep)] rounded-lg p-4 mb-6 text-left max-w-md mx-auto">
                <p className="font-mono text-xs text-[var(--text-muted)] uppercase mb-2">Changes to apply:</p>
                <ul className="space-y-1">
                  {changeDescriptions.map((desc, i) => (
                    <li key={i} className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
                      <svg className="w-4 h-4 text-[var(--accent-cyan)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      {desc}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setShowConfirmation(false)} className="btn-secondary">
                  Go Back
                </button>
                <button onClick={handleApply} disabled={isApplying} className="btn-primary">
                  {isApplying ? "Applying..." : "Confirm Update"}
                </button>
              </div>
            </div>
          )}

          {/* Form view */}
          {!result && !showConfirmation && (
            <>
              {/* Tabs */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-display text-sm transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/30"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-deep)]"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="space-y-6">
                {activeTab === "status" && (
                  <div className="space-y-4">
                    <FormField label="Construction Status">
                      <select
                        value={changes.constructionStatus || ""}
                        onChange={(e) =>
                          setChanges({
                            ...changes,
                            constructionStatus: e.target.value ? (e.target.value as ConstructionStatus) : undefined,
                          })
                        }
                        className="select"
                      >
                        <option value="">— No change —</option>
                        <option value="Not Started">Not Started</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Complete">Complete</option>
                      </select>
                    </FormField>

                    <FormField label="Sales Status">
                      <select
                        value={changes.salesStatus || ""}
                        onChange={(e) =>
                          setChanges({
                            ...changes,
                            salesStatus: e.target.value ? (e.target.value as SalesStatus) : undefined,
                          })
                        }
                        className="select"
                      >
                        <option value="">— No change —</option>
                        <option value="Not Released">Not Released</option>
                        <option value="For Sale">For Sale</option>
                        <option value="Under Offer">Under Offer</option>
                        <option value="Contracted">Contracted</option>
                        <option value="Complete">Complete</option>
                      </select>
                    </FormField>
                  </div>
                )}

                {activeTab === "purchaser" && (
                  <div className="space-y-4">
                    <FormField label="Purchaser Type">
                      <select
                        value={changes.purchaserType || ""}
                        onChange={(e) =>
                          setChanges({
                            ...changes,
                            purchaserType: e.target.value ? (e.target.value as PurchaserType) : undefined,
                          })
                        }
                        className="select"
                      >
                        <option value="">— No change —</option>
                        <option value="Private">Private</option>
                        <option value="Council">Council</option>
                        <option value="AHB">AHB</option>
                        <option value="Other">Other</option>
                      </select>
                    </FormField>

                    <FormField label="Part V">
                      <select
                        value={changes.partV === undefined ? "" : changes.partV ? "yes" : "no"}
                        onChange={(e) =>
                          setChanges({
                            ...changes,
                            partV: e.target.value === "" ? undefined : e.target.value === "yes",
                          })
                        }
                        className="select"
                      >
                        <option value="">— No change —</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </FormField>

                    <p className="text-xs text-[var(--text-muted)] italic">
                      Note: Purchaser Name, Phone, and Email cannot be bulk updated as they are unique per unit.
                    </p>
                  </div>
                )}

                {activeTab === "completion" && (
                  <div className="space-y-4">
                    <CheckboxDateField
                      label="BCMS Received"
                      checked={changes.bcmsReceived}
                      date={changes.bcmsReceivedDate}
                      onCheckedChange={(checked) => setChanges({ ...changes, bcmsReceived: checked })}
                      onDateChange={(date) => setChanges({ ...changes, bcmsReceivedDate: date })}
                    />

                    <CheckboxDateField
                      label="Land Registry Approved"
                      checked={changes.landRegistryApproved}
                      date={changes.landRegistryApprovedDate}
                      onCheckedChange={(checked) => setChanges({ ...changes, landRegistryApproved: checked })}
                      onDateChange={(date) => setChanges({ ...changes, landRegistryApprovedDate: date })}
                    />

                    <CheckboxDateField
                      label="Homebond Received"
                      checked={changes.homebondReceived}
                      date={changes.homebondReceivedDate}
                      onCheckedChange={(checked) => setChanges({ ...changes, homebondReceived: checked })}
                      onDateChange={(date) => setChanges({ ...changes, homebondReceivedDate: date })}
                    />
                  </div>
                )}

                {activeTab === "sales" && (
                  <div className="space-y-4">
                    <CheckboxDateField
                      label="SAN Approved"
                      checked={changes.sanApproved}
                      date={changes.sanApprovedDate}
                      onCheckedChange={(checked) => setChanges({ ...changes, sanApproved: checked })}
                      onDateChange={(date) => setChanges({ ...changes, sanApprovedDate: date })}
                    />

                    <CheckboxDateField
                      label="Contract Issued"
                      checked={changes.contractIssued}
                      date={changes.contractIssuedDate}
                      onCheckedChange={(checked) => setChanges({ ...changes, contractIssued: checked })}
                      onDateChange={(date) => setChanges({ ...changes, contractIssuedDate: date })}
                    />

                    <CheckboxDateField
                      label="Contract Signed"
                      checked={changes.contractSigned}
                      date={changes.contractSignedDate}
                      onCheckedChange={(checked) => setChanges({ ...changes, contractSigned: checked })}
                      onDateChange={(date) => setChanges({ ...changes, contractSignedDate: date })}
                    />

                    <CheckboxDateField
                      label="Sale Closed"
                      checked={changes.saleClosed}
                      date={changes.saleClosedDate}
                      onCheckedChange={(checked) => setChanges({ ...changes, saleClosed: checked })}
                      onDateChange={(date) => setChanges({ ...changes, saleClosedDate: date })}
                    />
                  </div>
                )}

                {/* Preview section */}
                {hasAnyChanges(changes) && (
                  <div className="mt-6 p-4 bg-[var(--bg-deep)] rounded-lg border border-[var(--border-subtle)]">
                    <h4 className="font-display text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-[var(--accent-cyan)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Preview - This will update {selectedUnits.length} units:
                    </h4>
                    <ul className="space-y-1">
                      {changeDescriptions.map((desc, i) => (
                        <li key={i} className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
                          <svg className="w-4 h-4 text-[var(--accent-emerald)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {desc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!result && !showConfirmation && (
          <div className="sticky bottom-0 glass border-t border-[var(--border-subtle)] px-6 py-4 rounded-b-xl">
            <div className="flex gap-3 justify-end">
              <button onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={!hasAnyChanges(changes) || isApplying}
                className="btn-primary disabled:opacity-50"
              >
                {isApplying ? "Applying..." : `Apply to ${selectedUnits.length} Units`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

function CheckboxDateField({
  label,
  checked,
  date,
  onCheckedChange,
  onDateChange,
}: {
  label: string;
  checked: boolean | undefined;
  date: string | undefined;
  onCheckedChange: (checked: boolean | undefined) => void;
  onDateChange: (date: string | undefined) => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
          {label}
        </label>
        <select
          value={checked === undefined ? "" : checked ? "yes" : "no"}
          onChange={(e) => onCheckedChange(e.target.value === "" ? undefined : e.target.value === "yes")}
          className="select"
        >
          <option value="">— No change —</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>
      <div className="flex-1">
        <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
          Date
        </label>
        <input
          type="date"
          value={date || ""}
          onChange={(e) => onDateChange(e.target.value || undefined)}
          className="input"
          disabled={checked !== true}
        />
      </div>
    </div>
  );
}
