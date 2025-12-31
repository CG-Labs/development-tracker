import { useState } from "react";
import type { Unit, ConstructionStatus, SalesStatus, PurchaserType } from "../types";

interface UnitDetailModalProps {
  unit: Unit;
  developmentName: string;
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
  onClose,
  onSave,
}: UnitDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUnit, setEditedUnit] = useState<Unit>({ ...unit });
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const progress = constructionProgress[unit.constructionStatus];

  const handleSave = () => {
    if (onSave) {
      onSave(editedUnit);
    }
    setSaveMessage("Unit saved successfully!");
    setTimeout(() => {
      setSaveMessage(null);
      setIsEditing(false);
    }, 1500);
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

        {/* Save Message */}
        {saveMessage && (
          <div className="mx-6 mt-4 p-3 bg-[var(--accent-emerald)] bg-opacity-20 border border-[var(--accent-emerald)] rounded-lg">
            <p className="text-[var(--accent-emerald)] font-mono text-sm text-center">
              {saveMessage}
            </p>
          </div>
        )}

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

          {/* Status */}
          <section>
            <SectionHeader title="Current Status" />
            <div className="grid grid-cols-2 gap-4">
              <StatusCard
                label="Construction"
                status={displayUnit.constructionStatus}
                badgeClass={constructionBadgeClasses[displayUnit.constructionStatus]}
              />
              <StatusCard
                label="Sales"
                status={displayUnit.salesStatus}
                badgeClass={salesBadgeClasses[displayUnit.salesStatus]}
              />
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
              <DocumentationItem
                label="BCMS Received"
                completed={displayUnit.documentation.bcmsReceived}
                date={displayUnit.documentation.bcmsReceivedDate}
                isEditing={isEditing}
                onToggle={(val) => updateDocumentation("bcmsReceived", val)}
                onDateChange={(val) => updateDocumentation("bcmsReceivedDate", val)}
              />
              <DocumentationItem
                label="Land Registry Map Approved"
                completed={displayUnit.documentation.landRegistryApproved}
                date={displayUnit.documentation.landRegistryApprovedDate}
                isEditing={isEditing}
                onToggle={(val) => updateDocumentation("landRegistryApproved", val)}
                onDateChange={(val) => updateDocumentation("landRegistryApprovedDate", val)}
              />
              <DocumentationItem
                label="Homebond Warranty Received"
                completed={displayUnit.documentation.homebondReceived}
                date={displayUnit.documentation.homebondReceivedDate}
                isEditing={isEditing}
                onToggle={(val) => updateDocumentation("homebondReceived", val)}
                onDateChange={(val) => updateDocumentation("homebondReceivedDate", val)}
              />
            </div>
          </section>

          {/* Sales Documentation */}
          <section>
            <SectionHeader title="Sales Documentation" />
            <div className="bg-[var(--bg-deep)] rounded-lg p-5 border border-[var(--border-subtle)] space-y-3">
              <DocumentationItem
                label="SAN (Sales Advice Notice) Approved"
                completed={displayUnit.documentation.sanApproved}
                date={displayUnit.documentation.sanApprovedDate}
                isEditing={isEditing}
                onToggle={(val) => updateDocumentation("sanApproved", val)}
                onDateChange={(val) => updateDocumentation("sanApprovedDate", val)}
              />
              <DocumentationItem
                label="Contract Issued"
                completed={displayUnit.documentation.contractIssued}
                date={displayUnit.documentation.contractIssuedDate}
                isEditing={isEditing}
                onToggle={(val) => updateDocumentation("contractIssued", val)}
                onDateChange={(val) => updateDocumentation("contractIssuedDate", val)}
              />
              <DocumentationItem
                label="Contract Signed"
                completed={displayUnit.documentation.contractSigned}
                date={displayUnit.documentation.contractSignedDate}
                isEditing={isEditing}
                onToggle={(val) => updateDocumentation("contractSigned", val)}
                onDateChange={(val) => updateDocumentation("contractSignedDate", val)}
              />
              <DocumentationItem
                label="Sale Closed"
                completed={displayUnit.documentation.saleClosed}
                date={displayUnit.documentation.saleClosedDate}
                isEditing={isEditing}
                onToggle={(val) => updateDocumentation("saleClosed", val)}
                onDateChange={(val) => updateDocumentation("saleClosedDate", val)}
              />
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

          {/* Important Dates */}
          <section>
            <SectionHeader title="Key Dates" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DateItem
                label="Start Date"
                value={formatDate(displayUnit.startDate)}
                isEditing={isEditing}
                dateValue={formatDateForInput(editedUnit.startDate)}
                onChange={(val) => updateField("startDate", val || undefined)}
              />
              <DateItem
                label="Completion"
                value={formatDate(displayUnit.completionDate)}
                isEditing={isEditing}
                dateValue={formatDateForInput(editedUnit.completionDate)}
                onChange={(val) => updateField("completionDate", val || undefined)}
              />
              <DateItem
                label="Snag Date"
                value={formatDate(displayUnit.snagDate)}
                isEditing={isEditing}
                dateValue={formatDateForInput(editedUnit.snagDate)}
                onChange={(val) => updateField("snagDate", val || undefined)}
              />
              <DateItem
                label="Close Date"
                value={formatDate(displayUnit.closeDate)}
                isEditing={isEditing}
                dateValue={formatDateForInput(editedUnit.closeDate)}
                onChange={(val) => updateField("closeDate", val || undefined)}
              />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 glass border-t border-[var(--border-subtle)] px-6 py-4 rounded-b-xl">
          {isEditing ? (
            <div className="flex gap-3">
              <button onClick={handleCancel} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={handleSave} className="btn-primary flex-1">
                Save Changes
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

function StatusCard({
  label,
  status,
  badgeClass,
}: {
  label: string;
  status: string;
  badgeClass: string;
}) {
  return (
    <div className="bg-[var(--bg-deep)] rounded-lg p-4 border border-[var(--border-subtle)]">
      <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-2">
        {label}
      </p>
      <span className={badgeClass}>{status}</span>
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

function DocumentationItem({
  label,
  completed,
  date,
  isEditing,
  onToggle,
  onDateChange,
}: {
  label: string;
  completed: boolean;
  date?: string;
  isEditing?: boolean;
  onToggle?: (value: boolean) => void;
  onDateChange?: (value: string | undefined) => void;
}) {
  const formattedDate = date
    ? new Date(date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "-";

  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-b-0">
      <div className="flex items-center gap-3">
        {isEditing ? (
          <button
            onClick={() => onToggle?.(!completed)}
            className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
              completed ? "bg-[var(--accent-emerald)]" : "bg-[var(--accent-rose)]"
            }`}
          >
            {completed ? (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        ) : completed ? (
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
        <span className={`font-mono text-xs font-semibold ${completed ? "text-[var(--accent-emerald)]" : "text-[var(--accent-rose)]"}`}>
          {completed ? "Yes" : "No"}
        </span>
        {isEditing ? (
          <input
            type="date"
            value={date?.split("T")[0] || ""}
            onChange={(e) => onDateChange?.(e.target.value || undefined)}
            className="input text-xs py-1 px-2 w-32"
          />
        ) : (
          <span className="font-mono text-xs text-[var(--text-muted)] min-w-[90px] text-right">
            {formattedDate}
          </span>
        )}
      </div>
    </div>
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
