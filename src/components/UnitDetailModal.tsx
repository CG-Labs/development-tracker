import { useState, useEffect } from "react";
import type { Unit, ConstructionStatus, SalesStatus, PurchaserType, IncentiveStatus, UnitDates } from "../types";
import type { AuditChange } from "../types/auditLog";
import type { Note } from "../types/note";
import type { IncentiveScheme } from "../types/incentive";
import type { DevelopmentCompany } from "../types/company";
import { logChange } from "../services/auditLogService";
import { addNote, updateNote, deleteNote, subscribeToNotes } from "../services/notesService";
import { getActiveSchemes, checkUnitEligibility, formatBenefitValue, calculateTotalBenefitValue } from "../services/incentiveService";
import { getActiveCompanies } from "../services/companyService";
import { useAuth } from "../contexts/AuthContext";

interface UnitDetailModalProps {
  unit: Unit;
  developmentName: string;
  developmentId?: string;
  onClose: () => void;
  onSave?: (updatedUnit: Unit) => void;
}

const constructionBadgeClasses: Record<ConstructionStatus, string> = {
  Complete: "badge badge-complete",
  "In Progress": "badge badge-progress",
  "Not Started": "badge badge-notstarted",
};

const salesBadgeClasses: Record<SalesStatus, string> = {
  "Not Released": "badge badge-notstarted",
  "For Sale": "badge badge-available",
  "Under Offer": "badge badge-reserved",
  "Contracted": "badge badge-agreed",
  "Complete": "badge badge-sold",
};

const constructionProgress: Record<ConstructionStatus, number> = {
  "Not Started": 0,
  "In Progress": 50,
  Complete: 100,
};

const purchaserTypeBadgeClasses: Record<PurchaserType, string> = {
  Private: "badge badge-complete",
  Council: "badge badge-progress",
  AHB: "badge badge-reserved",
  Other: "badge badge-notstarted",
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateForInput(dateStr?: string): string {
  if (!dateStr) return "";
  return dateStr.split("T")[0];
}

export function UnitDetailModal({
  unit,
  developmentName,
  developmentId,
  onClose,
  onSave,
}: UnitDetailModalProps) {
  const { currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedUnit, setEditedUnit] = useState<Unit>({ ...unit });
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  // Incentive state
  const [incentiveSchemes, setIncentiveSchemes] = useState<IncentiveScheme[]>([]);
  const [selectedScheme, setSelectedScheme] = useState<IncentiveScheme | null>(null);

  // Companies state
  const [companies, setCompanies] = useState<DevelopmentCompany[]>([]);

  const progress = constructionProgress[unit.constructionStatus];

  // Subscribe to notes for this unit
  useEffect(() => {
    const unsubscribe = subscribeToNotes(
      unit.unitNumber,
      setNotes,
      (error) => {
        console.error("Notes subscription error:", error);
        setSaveMessage("Error loading notes. Check console for details.");
        setTimeout(() => setSaveMessage(null), 5000);
      }
    );
    return () => unsubscribe();
  }, [unit.unitNumber]);

  // Load incentive schemes
  useEffect(() => {
    getActiveSchemes()
      .then((schemes) => {
        setIncentiveSchemes(schemes);
        // Find selected scheme if unit has one
        if (unit.appliedIncentive) {
          const scheme = schemes.find((s) => s.id === unit.appliedIncentive);
          setSelectedScheme(scheme || null);
        }
      })
      .catch(console.error);
  }, [unit.appliedIncentive]);

  // Load development companies
  useEffect(() => {
    getActiveCompanies()
      .then(setCompanies)
      .catch(console.error);
  }, []);

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;

    if (!currentUser) {
      setSaveMessage("You must be logged in to add notes.");
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    if (!developmentId) {
      setSaveMessage("Error: Development ID not found.");
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    setIsAddingNote(true);
    try {
      await addNote({
        unitId: unit.unitNumber,
        developmentId,
        content: newNoteContent.trim(),
        userId: currentUser.uid,
        userEmail: currentUser.email || "",
        userName: currentUser.displayName || undefined,
      });

      // Log to audit
      await logChange({
        userId: currentUser.uid,
        userEmail: currentUser.email || "",
        userName: currentUser.displayName || "",
        action: "note_added",
        entityType: "note",
        entityId: unit.unitNumber,
        changes: [{ field: "content", oldValue: null, newValue: newNoteContent.trim() }],
        developmentId,
        developmentName,
        unitNumber: unit.unitNumber,
      });

      setNewNoteContent("");
      setSaveMessage("Note added successfully!");
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (error) {
      console.error("Failed to add note:", error);
      setSaveMessage("Failed to add note. Please try again.");
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleEditNote = async (noteId: string) => {
    if (!currentUser || !editingNoteContent.trim()) return;

    try {
      const originalNote = notes.find((n) => n.id === noteId);
      await updateNote(noteId, editingNoteContent.trim());

      // Log to audit
      await logChange({
        userId: currentUser.uid,
        userEmail: currentUser.email || "",
        userName: currentUser.displayName || "",
        action: "note_edited",
        entityType: "note",
        entityId: unit.unitNumber,
        changes: [{ field: "content", oldValue: originalNote?.content, newValue: editingNoteContent.trim() }],
        developmentId,
        developmentName,
        unitNumber: unit.unitNumber,
      });

      setEditingNoteId(null);
      setEditingNoteContent("");
      setSaveMessage("Note updated successfully!");
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (error) {
      console.error("Failed to update note:", error);
      setSaveMessage("Failed to update note. Please try again.");
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!currentUser) return;

    try {
      const originalNote = notes.find((n) => n.id === noteId);
      await deleteNote(noteId);

      // Log to audit
      await logChange({
        userId: currentUser.uid,
        userEmail: currentUser.email || "",
        userName: currentUser.displayName || "",
        action: "note_deleted",
        entityType: "note",
        entityId: unit.unitNumber,
        changes: [{ field: "content", oldValue: originalNote?.content, newValue: null }],
        developmentId,
        developmentName,
        unitNumber: unit.unitNumber,
      });

      setDeletingNoteId(null);
      setSaveMessage("Note deleted successfully!");
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (error) {
      console.error("Failed to delete note:", error);
      setSaveMessage("Failed to delete note. Please try again.");
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const formatNoteTimestamp = (date: Date): string => {
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Compare two values for changes
  const compareValues = (oldVal: unknown, newVal: unknown): boolean => {
    if (oldVal === newVal) return false;
    if (oldVal === undefined && newVal === "") return false;
    if (oldVal === "" && newVal === undefined) return false;
    if (oldVal === null && newVal === undefined) return false;
    if (oldVal === undefined && newVal === null) return false;
    return true;
  };

  // Get changes between original and edited unit
  const getChanges = (): AuditChange[] => {
    const changes: AuditChange[] = [];
    const fieldsToCheck: (keyof Unit)[] = [
      "address", "purchaserType", "purchaserName", "purchaserPhone", "purchaserEmail",
      "partV", "constructionStatus", "salesStatus", "listPrice", "soldPrice",
      "appliedIncentive", "incentiveStatus",
      "developerCompanyId", "constructionUnitType", "constructionPhase"
    ];

    fieldsToCheck.forEach((field) => {
      if (compareValues(unit[field], editedUnit[field])) {
        changes.push({
          field,
          oldValue: unit[field],
          newValue: editedUnit[field],
        });
      }
    });

    // Check documentation fields (new date-based fields)
    const docFields: (keyof Unit["documentation"])[] = [
      "bcmsSubmitDate", "bcmsApprovedDate",
      "homebondSubmitDate", "homebondApprovedDate",
      "berApprovedDate", "fcComplianceReceivedDate",
      "sanApprovedDate", "contractIssuedDate",
      "contractSignedDate", "saleClosedDate"
    ];

    docFields.forEach((field) => {
      if (compareValues(unit.documentation[field], editedUnit.documentation[field])) {
        changes.push({
          field: `documentation.${field}`,
          oldValue: unit.documentation[field],
          newValue: editedUnit.documentation[field],
        });
      }
    });

    // Check key dates fields
    const keyDateFields: (keyof UnitDates)[] = [
      "plannedBcms", "actualBcms", "plannedClose", "actualClose"
    ];

    keyDateFields.forEach((field) => {
      if (compareValues(unit.keyDates?.[field], editedUnit.keyDates?.[field])) {
        changes.push({
          field: `keyDates.${field}`,
          oldValue: unit.keyDates?.[field],
          newValue: editedUnit.keyDates?.[field],
        });
      }
    });

    return changes;
  };

  const handleSave = async () => {
    if (!currentUser) return;

    const changes = getChanges();

    if (changes.length === 0) {
      setSaveMessage("No changes to save");
      setTimeout(() => setSaveMessage(null), 1500);
      return;
    }

    setIsSaving(true);

    try {
      // Log the changes to Firestore
      await logChange({
        userId: currentUser.uid,
        userEmail: currentUser.email || "",
        userName: currentUser.displayName || "",
        action: "update",
        entityType: "unit",
        entityId: unit.unitNumber,
        changes,
        developmentId,
        developmentName,
        unitNumber: unit.unitNumber,
      });

      // Call the onSave callback if provided
      if (onSave) {
        onSave(editedUnit);
      }

      setSaveMessage("Changes saved and logged successfully!");
      setTimeout(() => {
        setSaveMessage(null);
        setIsEditing(false);
      }, 1500);
    } catch (error) {
      console.error("Failed to save changes:", error);
      setSaveMessage("Failed to save changes. Please try again.");
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedUnit({ ...unit });
    setIsEditing(false);
  };

  const updateField = <K extends keyof Unit>(field: K, value: Unit[K]) => {
    setEditedUnit((prev) => ({ ...prev, [field]: value }));
  };

  const updateDocumentation = <K extends keyof Unit["documentation"]>(
    field: K,
    value: Unit["documentation"][K]
  ) => {
    setEditedUnit((prev) => ({
      ...prev,
      documentation: { ...prev.documentation, [field]: value },
    }));
  };

  const updateKeyDates = <K extends keyof UnitDates>(
    field: K,
    value: UnitDates[K]
  ) => {
    setEditedUnit((prev) => ({
      ...prev,
      keyDates: { ...prev.keyDates, [field]: value },
    }));
  };

  const displayUnit = isEditing ? editedUnit : unit;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 modal-backdrop animate-fade-in" />

      {/* Modal */}
      <div
        className="relative card-elevated max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in-up"
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
              {developmentName}
            </p>
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">
              Unit {displayUnit.unitNumber}
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Unit Details */}
          <section>
            <SectionHeader title="Unit Details" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DetailItem label="Type" value={displayUnit.type} />
              <DetailItem label="Bedrooms" value={String(displayUnit.bedrooms)} mono />
              <DetailItem label="List Price" value={formatPrice(displayUnit.listPrice)} mono highlight />
              {displayUnit.soldPrice && (
                <DetailItem label="Sold Price" value={formatPrice(displayUnit.soldPrice)} mono highlight="gold" />
              )}
            </div>
            {/* Address */}
            <div className="mt-4 bg-[var(--bg-deep)] rounded-lg p-4 border border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[var(--accent-cyan)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedUnit.address || ""}
                    onChange={(e) => updateField("address", e.target.value)}
                    className="input flex-1"
                    placeholder="Enter address"
                  />
                ) : (
                  <span className="font-display text-sm text-[var(--text-primary)]">
                    {displayUnit.address || "No address specified"}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Developer Details */}
          <section>
            <SectionHeader title="Developer Details" />
            <div className="bg-[var(--bg-deep)] rounded-lg p-5 border border-[var(--border-subtle)] space-y-4">
              {/* Developer Company */}
              <div>
                <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Developer Company
                </p>
                {isEditing ? (
                  <select
                    value={editedUnit.developerCompanyId || ""}
                    onChange={(e) => updateField("developerCompanyId", e.target.value || undefined)}
                    className="select w-full"
                  >
                    <option value="">-- Select Company --</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[var(--accent-purple)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="font-display text-sm text-[var(--text-primary)]">
                      {companies.find((c) => c.id === displayUnit.developerCompanyId)?.name || "Not assigned"}
                    </span>
                  </div>
                )}
              </div>

              {/* Construction Unit Type */}
              <div>
                <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Construction Unit Type
                </p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedUnit.constructionUnitType || ""}
                    onChange={(e) => updateField("constructionUnitType", e.target.value || undefined)}
                    className="input w-full"
                    placeholder="e.g., Type A, Standard, Premium"
                  />
                ) : (
                  <span className="font-display text-sm text-[var(--text-primary)]">
                    {displayUnit.constructionUnitType || "—"}
                  </span>
                )}
              </div>

              {/* Construction Phase */}
              <div>
                <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Construction Phase
                </p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedUnit.constructionPhase || ""}
                    onChange={(e) => updateField("constructionPhase", e.target.value || undefined)}
                    className="input w-full"
                    placeholder="e.g., Phase 1, Phase 2A"
                  />
                ) : (
                  <span className="font-display text-sm text-[var(--text-primary)]">
                    {displayUnit.constructionPhase || "—"}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Status */}
          <section>
            <SectionHeader title="Current Status" />
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--bg-deep)] rounded-lg p-4 border border-[var(--border-subtle)]">
                <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Construction
                </p>
                {isEditing ? (
                  <select
                    value={editedUnit.constructionStatus}
                    onChange={(e) => updateField("constructionStatus", e.target.value as ConstructionStatus)}
                    className="select w-full"
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Complete">Complete</option>
                  </select>
                ) : (
                  <span className={constructionBadgeClasses[displayUnit.constructionStatus]}>
                    {displayUnit.constructionStatus}
                  </span>
                )}
              </div>
              <div className="bg-[var(--bg-deep)] rounded-lg p-4 border border-[var(--border-subtle)]">
                <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Sales
                </p>
                {isEditing ? (
                  <select
                    value={editedUnit.salesStatus}
                    onChange={(e) => updateField("salesStatus", e.target.value as SalesStatus)}
                    className="select w-full"
                  >
                    <option value="Not Released">Not Released</option>
                    <option value="For Sale">For Sale</option>
                    <option value="Under Offer">Under Offer</option>
                    <option value="Contracted">Contracted</option>
                    <option value="Complete">Complete</option>
                  </select>
                ) : (
                  <span className={salesBadgeClasses[displayUnit.salesStatus]}>
                    {displayUnit.salesStatus}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Construction Progress */}
          <section>
            <SectionHeader title="Construction Progress" />
            <div className="bg-[var(--bg-deep)] rounded-lg p-5 border border-[var(--border-subtle)]">
              <div className="flex justify-between items-center mb-3">
                <span className="font-display text-sm text-[var(--text-secondary)]">
                  Progress
                </span>
                <span className="font-mono text-lg font-bold text-[var(--text-primary)]">
                  {progress}%
                </span>
              </div>
              <div className="progress-bar h-3">
                <div
                  className={`progress-fill ${
                    progress === 100
                      ? "progress-emerald"
                      : progress > 0
                      ? "progress-gold"
                      : ""
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between mt-3">
                <ProgressMarker label="Not Started" active={progress === 0} />
                <ProgressMarker label="In Progress" active={progress === 50} />
                <ProgressMarker label="Complete" active={progress === 100} />
              </div>
            </div>
          </section>

          {/* Completion Documentation */}
          <section>
            <SectionHeader title="Completion Documentation" />
            <div className="bg-[var(--bg-deep)] rounded-lg p-5 border border-[var(--border-subtle)] space-y-3">
              <AutoDocItem
                label="BCMS Submit"
                date={displayUnit.documentation.bcmsSubmitDate}
                isEditing={isEditing}
                onDateChange={(val) => updateDocumentation("bcmsSubmitDate", val)}
              />
              <AutoDocItem
                label="BCMS Approved"
                date={displayUnit.documentation.bcmsApprovedDate}
                isEditing={isEditing}
                onDateChange={(val) => updateDocumentation("bcmsApprovedDate", val)}
              />
              <AutoDocItem
                label="Homebond Submit"
                date={displayUnit.documentation.homebondSubmitDate}
                isEditing={isEditing}
                onDateChange={(val) => updateDocumentation("homebondSubmitDate", val)}
              />
              <AutoDocItem
                label="Homebond Approved"
                date={displayUnit.documentation.homebondApprovedDate}
                isEditing={isEditing}
                onDateChange={(val) => updateDocumentation("homebondApprovedDate", val)}
              />
              <AutoDocItem
                label="BER Approved"
                date={displayUnit.documentation.berApprovedDate}
                isEditing={isEditing}
                onDateChange={(val) => updateDocumentation("berApprovedDate", val)}
              />
              <AutoDocItem
                label="FC Compliance Letter Received"
                date={displayUnit.documentation.fcComplianceReceivedDate}
                isEditing={isEditing}
                onDateChange={(val) => updateDocumentation("fcComplianceReceivedDate", val)}
              />
            </div>
          </section>

          {/* Sales Documentation */}
          <section>
            <SectionHeader title="Sales Documentation" />
            <div className="bg-[var(--bg-deep)] rounded-lg p-5 border border-[var(--border-subtle)] space-y-3">
              <AutoDocItem
                label="SAN (Sales Advice Notice) Approved"
                date={displayUnit.documentation.sanApprovedDate}
                isEditing={isEditing}
                onDateChange={(val) => updateDocumentation("sanApprovedDate", val)}
              />
              <AutoDocItem
                label="Contract Issued"
                date={displayUnit.documentation.contractIssuedDate}
                isEditing={isEditing}
                onDateChange={(val) => updateDocumentation("contractIssuedDate", val)}
              />
              <AutoDocItem
                label="Contract Signed"
                date={displayUnit.documentation.contractSignedDate}
                isEditing={isEditing}
                onDateChange={(val) => updateDocumentation("contractSignedDate", val)}
              />
              <AutoDocItem
                label="Sale Closed"
                date={displayUnit.documentation.saleClosedDate}
                isEditing={isEditing}
                onDateChange={(val) => updateDocumentation("saleClosedDate", val)}
              />
            </div>
          </section>

          {/* Incentive Scheme */}
          <section>
            <SectionHeader title="Incentive Scheme" />
            <div className="bg-[var(--bg-deep)] rounded-lg p-5 border border-[var(--border-subtle)] space-y-4">
              {/* Scheme Selection */}
              <div>
                <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Select Incentive Scheme
                </p>
                {isEditing ? (
                  <select
                    value={editedUnit.appliedIncentive || ""}
                    onChange={(e) => {
                      const schemeId = e.target.value;
                      updateField("appliedIncentive", schemeId || undefined);
                      const scheme = incentiveSchemes.find((s) => s.id === schemeId);
                      setSelectedScheme(scheme || null);
                      if (!schemeId) {
                        updateField("incentiveStatus", undefined);
                      }
                    }}
                    className="select w-full"
                  >
                    <option value="">None</option>
                    {incentiveSchemes.map((scheme) => (
                      <option key={scheme.id} value={scheme.id}>
                        {scheme.name} ({formatBenefitValue(calculateTotalBenefitValue(scheme), scheme.benefits[0]?.currency || "EUR")})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-display text-sm text-[var(--text-primary)]">
                    {selectedScheme?.name || "No incentive applied"}
                  </span>
                )}
              </div>

              {/* Show scheme details if selected */}
              {(displayUnit.appliedIncentive && selectedScheme) && (
                <>
                  {/* Benefits Breakdown */}
                  <div>
                    <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
                      Benefits
                    </p>
                    <div className="space-y-2">
                      {selectedScheme.benefits.map((benefit, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-[var(--text-secondary)]">{benefit.type}</span>
                          <span className="font-mono text-[var(--accent-emerald)]">
                            {formatBenefitValue(benefit.value, benefit.currency)}
                          </span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                        <span className="font-display text-sm font-semibold text-[var(--text-primary)]">Total</span>
                        <span className="font-mono text-lg font-bold text-[var(--accent-gold-bright)]">
                          {formatBenefitValue(calculateTotalBenefitValue(selectedScheme), selectedScheme.benefits[0]?.currency || "EUR")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Eligibility Check */}
                  <div>
                    <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
                      Requirements
                    </p>
                    {(() => {
                      const eligibility = checkUnitEligibility(displayUnit, selectedScheme);
                      return (
                        <div className="space-y-2">
                          {eligibility.requirementsMet.map((req, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                req.met ? "bg-[var(--accent-emerald)]" : "bg-[var(--accent-rose)]"
                              }`}>
                                {req.met ? (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-[var(--text-primary)]">{req.description}</p>
                                {!req.met && req.reason && (
                                  <p className="text-xs text-[var(--accent-rose)] mt-0.5">{req.reason}</p>
                                )}
                              </div>
                            </div>
                          ))}
                          <div className={`mt-3 p-3 rounded-lg ${
                            eligibility.eligible
                              ? "bg-[var(--accent-emerald)]/10 border border-[var(--accent-emerald)]/20"
                              : "bg-[var(--accent-rose)]/10 border border-[var(--accent-rose)]/20"
                          }`}>
                            <p className={`text-sm font-semibold ${
                              eligibility.eligible ? "text-[var(--accent-emerald)]" : "text-[var(--accent-rose)]"
                            }`}>
                              {eligibility.eligible ? "Eligible for this incentive" : "Not eligible - requirements not met"}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Incentive Status */}
                  <div>
                    <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
                      Incentive Status
                    </p>
                    {isEditing ? (
                      <select
                        value={editedUnit.incentiveStatus || ""}
                        onChange={(e) => updateField("incentiveStatus", (e.target.value || undefined) as IncentiveStatus | undefined)}
                        className="select w-full"
                      >
                        <option value="">None</option>
                        <option value="eligible">Eligible</option>
                        <option value="applied">Applied</option>
                        <option value="claimed">Claimed</option>
                        <option value="expired">Expired</option>
                      </select>
                    ) : (
                      <span className={`badge ${
                        displayUnit.incentiveStatus === "claimed" ? "badge-complete" :
                        displayUnit.incentiveStatus === "applied" ? "badge-progress" :
                        displayUnit.incentiveStatus === "eligible" ? "badge-available" :
                        displayUnit.incentiveStatus === "expired" ? "badge-notstarted" :
                        "badge-notstarted"
                      }`}>
                        {displayUnit.incentiveStatus || "Not Set"}
                      </span>
                    )}
                  </div>
                </>
              )}

              {/* No scheme selected message */}
              {!displayUnit.appliedIncentive && !isEditing && (
                <p className="text-sm text-[var(--text-muted)] italic">
                  No incentive scheme applied to this unit
                </p>
              )}
            </div>
          </section>

          {/* Purchaser Information */}
          <section>
            <SectionHeader title="Purchaser Information" />
            <div className="bg-[var(--bg-deep)] rounded-lg p-5 border border-[var(--border-subtle)] space-y-4">
              {/* Purchaser Type & Part V */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Purchaser Type
                  </p>
                  {isEditing ? (
                    <select
                      value={editedUnit.purchaserType || "Private"}
                      onChange={(e) => updateField("purchaserType", e.target.value as PurchaserType)}
                      className="select w-full"
                    >
                      <option value="Private">Private</option>
                      <option value="Council">Council</option>
                      <option value="AHB">AHB</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <span className={purchaserTypeBadgeClasses[displayUnit.purchaserType || "Private"]}>
                      {displayUnit.purchaserType || "Private"}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Part V
                  </p>
                  {isEditing ? (
                    <select
                      value={editedUnit.partV ? "yes" : "no"}
                      onChange={(e) => updateField("partV", e.target.value === "yes")}
                      className="select w-full"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  ) : (
                    <span className={`badge ${displayUnit.partV ? "badge-complete" : "badge-notstarted"}`}>
                      {displayUnit.partV ? "Yes" : "No"}
                    </span>
                  )}
                </div>
              </div>

              {/* Purchaser Name */}
              <div>
                <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Purchaser Name
                </p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedUnit.purchaserName || ""}
                    onChange={(e) => updateField("purchaserName", e.target.value)}
                    className="input w-full"
                    placeholder="Enter purchaser name"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="font-display text-sm text-[var(--text-primary)]">
                      {displayUnit.purchaserName || "—"}
                    </span>
                  </div>
                )}
              </div>

              {/* Purchaser Phone */}
              <div>
                <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Phone
                </p>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editedUnit.purchaserPhone || ""}
                    onChange={(e) => updateField("purchaserPhone", e.target.value)}
                    className="input w-full"
                    placeholder="Enter phone number"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {displayUnit.purchaserPhone ? (
                      <a href={`tel:${displayUnit.purchaserPhone}`} className="font-mono text-sm text-[var(--accent-cyan)] hover:underline">
                        {displayUnit.purchaserPhone}
                      </a>
                    ) : (
                      <span className="font-mono text-sm text-[var(--text-muted)]">—</span>
                    )}
                  </div>
                )}
              </div>

              {/* Purchaser Email */}
              <div>
                <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Email
                </p>
                {isEditing ? (
                  <input
                    type="email"
                    value={editedUnit.purchaserEmail || ""}
                    onChange={(e) => updateField("purchaserEmail", e.target.value)}
                    className="input w-full"
                    placeholder="Enter email address"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {displayUnit.purchaserEmail ? (
                      <a href={`mailto:${displayUnit.purchaserEmail}`} className="font-mono text-sm text-[var(--accent-cyan)] hover:underline">
                        {displayUnit.purchaserEmail}
                      </a>
                    ) : (
                      <span className="font-mono text-sm text-[var(--text-muted)]">—</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Key Dates */}
          <section>
            <SectionHeader title="Key Dates" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DateItem
                label="Planned BCMS"
                value={formatDate(displayUnit.keyDates?.plannedBcms)}
                isEditing={isEditing}
                dateValue={formatDateForInput(editedUnit.keyDates?.plannedBcms)}
                onChange={(val) => updateKeyDates("plannedBcms", val || undefined)}
              />
              <DateItem
                label="Actual BCMS"
                value={formatDate(displayUnit.keyDates?.actualBcms)}
                isEditing={isEditing}
                dateValue={formatDateForInput(editedUnit.keyDates?.actualBcms)}
                onChange={(val) => updateKeyDates("actualBcms", val || undefined)}
              />
              <DateItem
                label="Planned Close"
                value={formatDate(displayUnit.keyDates?.plannedClose)}
                isEditing={isEditing}
                dateValue={formatDateForInput(editedUnit.keyDates?.plannedClose)}
                onChange={(val) => updateKeyDates("plannedClose", val || undefined)}
              />
              <DateItem
                label="Actual Close"
                value={formatDate(displayUnit.keyDates?.actualClose)}
                isEditing={isEditing}
                dateValue={formatDateForInput(editedUnit.keyDates?.actualClose)}
                onChange={(val) => updateKeyDates("actualClose", val || undefined)}
              />
            </div>
          </section>

          {/* Notes & Comments Section */}
          <section>
            <SectionHeader title={`Notes & Comments ${notes.length > 0 ? `(${notes.length})` : ""}`} />

            {/* Add New Note */}
            <div className="bg-[var(--bg-deep)] rounded-lg p-4 border border-[var(--border-subtle)] mb-4">
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value.slice(0, 1000))}
                placeholder="Add a note..."
                className="input w-full min-h-[80px] resize-none"
                disabled={isAddingNote}
              />
              <div className="flex items-center justify-between mt-3">
                <span className="font-mono text-xs text-[var(--text-muted)]">
                  {newNoteContent.length}/1000
                </span>
                <button
                  onClick={handleAddNote}
                  disabled={!newNoteContent.trim() || isAddingNote}
                  className="btn-primary text-sm py-2 px-4 disabled:opacity-50"
                >
                  {isAddingNote ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Adding...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Note
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Notes List */}
            {notes.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-10 h-10 mx-auto text-[var(--text-muted)] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-[var(--text-muted)] text-sm">No notes yet. Be the first to add one!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {notes.map((note) => {
                  const isOwnNote = currentUser?.uid === note.userId;
                  const isEditingThis = editingNoteId === note.id;
                  const isDeletingThis = deletingNoteId === note.id;

                  return (
                    <div
                      key={note.id}
                      className={`p-4 rounded-lg border transition-all ${
                        isOwnNote
                          ? "bg-[var(--accent-cyan)]/5 border-[var(--accent-cyan)]/20 ml-8"
                          : "bg-[var(--bg-deep)] border-[var(--border-subtle)] mr-8"
                      }`}
                    >
                      {/* Note Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            isOwnNote
                              ? "bg-[var(--accent-cyan)] text-white"
                              : "bg-[var(--accent-purple)] text-white"
                          }`}>
                            {(note.userName || note.userEmail || "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-display text-sm font-medium text-[var(--text-primary)]">
                              {note.userName || note.userEmail}
                              {isOwnNote && <span className="text-[var(--accent-cyan)] ml-1">(You)</span>}
                            </p>
                            <p className="font-mono text-[10px] text-[var(--text-muted)]">
                              {formatNoteTimestamp(note.timestamp)}
                              {note.edited && (
                                <span className="ml-2 italic">(edited)</span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Actions - only show for own notes */}
                        {isOwnNote && !isEditingThis && !isDeletingThis && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setEditingNoteContent(note.content);
                              }}
                              className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/10 transition-all"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeletingNoteId(note.id)}
                              className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--accent-rose)] hover:bg-[var(--accent-rose)]/10 transition-all"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Note Content or Edit Mode */}
                      {isEditingThis ? (
                        <div className="mt-3">
                          <textarea
                            value={editingNoteContent}
                            onChange={(e) => setEditingNoteContent(e.target.value.slice(0, 1000))}
                            className="input w-full min-h-[60px] resize-none"
                          />
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-mono text-xs text-[var(--text-muted)]">
                              {editingNoteContent.length}/1000
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingNoteId(null);
                                  setEditingNoteContent("");
                                }}
                                className="px-3 py-1.5 text-sm rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleEditNote(note.id)}
                                disabled={!editingNoteContent.trim()}
                                className="btn-primary text-sm py-1.5 px-3 disabled:opacity-50"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : isDeletingThis ? (
                        <div className="mt-3 p-3 rounded-lg bg-[var(--accent-rose)]/10 border border-[var(--accent-rose)]/20">
                          <p className="text-[var(--text-primary)] text-sm mb-3">
                            Are you sure you want to delete this note?
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setDeletingNoteId(null)}
                              className="px-3 py-1.5 text-sm rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="px-3 py-1.5 text-sm rounded bg-[var(--accent-rose)] text-white hover:opacity-90 transition-all"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[var(--text-secondary)] text-sm whitespace-pre-wrap">
                          {note.content}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 glass border-t border-[var(--border-subtle)] px-6 py-4 rounded-b-xl">
          {/* Save Message - shown in footer for visibility */}
          {saveMessage && (
            <div className={`mb-3 p-3 rounded-lg text-center ${
              saveMessage.includes("Failed") || saveMessage.includes("Error")
                ? "bg-red-500/20 border border-red-500 text-red-400"
                : "bg-[var(--accent-emerald)]/20 border border-[var(--accent-emerald)] text-[var(--accent-emerald)]"
            }`}>
              <p className="font-mono text-sm">{saveMessage}</p>
            </div>
          )}
          {isEditing ? (
            <div className="flex gap-3">
              <button onClick={handleCancel} disabled={isSaving} className="btn-secondary flex-1 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={isSaving} className="btn-primary flex-1 disabled:opacity-50">
                {isSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1">
                Close
              </button>
              <button onClick={() => setIsEditing(true)} className="btn-primary flex-1">
                Edit Unit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h3 className="font-display text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
        {title}
      </h3>
      <div className="flex-1 h-px bg-[var(--border-subtle)]" />
    </div>
  );
}

function DetailItem({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean | "gold";
}) {
  const valueClass = highlight === "gold"
    ? "text-[var(--accent-gold-bright)]"
    : highlight
    ? "text-[var(--accent-cyan)]"
    : "text-[var(--text-primary)]";

  return (
    <div className="bg-[var(--bg-deep)] rounded-lg p-4 border border-[var(--border-subtle)]">
      <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={`${mono ? "font-mono" : "font-display"} font-semibold ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function ProgressMarker({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`font-mono text-xs ${
        active
          ? "text-[var(--accent-cyan)] font-semibold"
          : "text-[var(--text-muted)]"
      }`}
    >
      {label}
    </span>
  );
}

function DateItem({
  label,
  value,
  isEditing,
  dateValue,
  onChange,
}: {
  label: string;
  value: string;
  isEditing?: boolean;
  dateValue?: string;
  onChange?: (value: string | undefined) => void;
}) {
  const isEmpty = value === "—";

  return (
    <div className="bg-[var(--bg-deep)] rounded-lg p-4 border border-[var(--border-subtle)]">
      <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
        {label}
      </p>
      {isEditing ? (
        <input
          type="date"
          value={dateValue || ""}
          onChange={(e) => onChange?.(e.target.value || undefined)}
          className="input w-full text-sm py-1"
        />
      ) : (
        <p
          className={`font-mono font-semibold ${
            isEmpty ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]"
          }`}
        >
          {value}
        </p>
      )}
    </div>
  );
}

/**
 * Auto Documentation Item - Yes/No is automatically derived from date
 * When a date exists, it shows "Yes ✓ - [date]"
 * When no date, it shows "No ✗"
 * In edit mode, only shows date picker (Yes/No updates automatically)
 */
function AutoDocItem({
  label,
  date,
  isEditing,
  onDateChange,
}: {
  label: string;
  date?: string;
  isEditing?: boolean;
  onDateChange?: (value: string | undefined) => void;
}) {
  const hasDate = date && date.trim() !== "";
  const formattedDate = hasDate
    ? new Date(date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-b-0">
      <div className="flex items-center gap-3">
        {hasDate ? (
          <div className="w-5 h-5 rounded-full bg-[var(--accent-emerald)] flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full bg-[var(--accent-rose)] flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        <span className="font-display text-sm text-[var(--text-primary)]">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {isEditing ? (
          <input
            type="date"
            value={date?.split("T")[0] || ""}
            onChange={(e) => onDateChange?.(e.target.value || undefined)}
            className="input text-xs py-1 px-2 w-32"
          />
        ) : (
          <span className={`font-mono text-xs ${hasDate ? "text-[var(--accent-emerald)]" : "text-[var(--accent-rose)]"}`}>
            {hasDate ? `Yes - ${formattedDate}` : "No"}
          </span>
        )}
      </div>
    </div>
  );
}
