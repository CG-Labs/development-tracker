import type { Unit, ConstructionStatus, SalesStatus } from "../types";

interface UnitDetailModalProps {
  unit: Unit;
  developmentName: string;
  onClose: () => void;
}

const constructionBadgeClasses: Record<ConstructionStatus, string> = {
  Complete: "badge badge-complete",
  "In Progress": "badge badge-progress",
  "Not Started": "badge badge-notstarted",
};

const salesBadgeClasses: Record<SalesStatus, string> = {
  Sold: "badge badge-sold",
  "Sale Agreed": "badge badge-agreed",
  Reserved: "badge badge-reserved",
  Available: "badge badge-available",
};

const constructionProgress: Record<ConstructionStatus, number> = {
  "Not Started": 0,
  "In Progress": 50,
  Complete: 100,
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
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

export function UnitDetailModal({
  unit,
  developmentName,
  onClose,
}: UnitDetailModalProps) {
  const progress = constructionProgress[unit.constructionStatus];

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
              Unit {unit.unitNumber}
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
              <DetailItem label="Type" value={unit.type} />
              <DetailItem label="Bedrooms" value={String(unit.bedrooms)} mono />
              <DetailItem label="List Price" value={formatPrice(unit.listPrice)} mono highlight />
              {unit.soldPrice && (
                <DetailItem label="Sold Price" value={formatPrice(unit.soldPrice)} mono highlight="gold" />
              )}
            </div>
          </section>

          {/* Status */}
          <section>
            <SectionHeader title="Current Status" />
            <div className="grid grid-cols-2 gap-4">
              <StatusCard
                label="Construction"
                status={unit.constructionStatus}
                badgeClass={constructionBadgeClasses[unit.constructionStatus]}
              />
              <StatusCard
                label="Sales"
                status={unit.salesStatus}
                badgeClass={salesBadgeClasses[unit.salesStatus]}
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

          {/* Documentation Checklist */}
          <section>
            <SectionHeader title="Documentation" />
            <div className="bg-[var(--bg-deep)] rounded-lg p-5 border border-[var(--border-subtle)] space-y-4">
              <ChecklistItem
                label="Contract Signed"
                checked={unit.documentation.contractSigned}
              />
              <ChecklistItem
                label="Loan Approved"
                checked={unit.documentation.loanApproved}
              />
              <ChecklistItem
                label="BCMS Submitted"
                checked={unit.documentation.bcmsSubmitted}
              />
            </div>
          </section>

          {/* Important Dates */}
          <section>
            <SectionHeader title="Key Dates" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DateItem label="Start Date" value={formatDate(unit.startDate)} />
              <DateItem label="Completion" value={formatDate(unit.completionDate)} />
              <DateItem label="Snag Date" value={formatDate(unit.snagDate)} />
              <DateItem label="Close Date" value={formatDate(unit.closeDate)} />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 glass border-t border-[var(--border-subtle)] px-6 py-4 rounded-b-xl">
          <button onClick={onClose} className="btn-secondary w-full">
            Close
          </button>
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

function ChecklistItem({
  label,
  checked,
}: {
  label: string;
  checked: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`checkbox-custom ${checked ? "checked" : ""}`}
      >
        {checked && (
          <svg className="w-3 h-3 text-[var(--bg-deep)]" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      <span
        className={`font-display ${
          checked ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
        }`}
      >
        {label}
      </span>
      {checked && (
        <span className="ml-auto font-mono text-xs text-[var(--accent-emerald)]">
          Complete
        </span>
      )}
    </div>
  );
}

function DateItem({ label, value }: { label: string; value: string }) {
  const isEmpty = value === "—";

  return (
    <div className="bg-[var(--bg-deep)] rounded-lg p-4 border border-[var(--border-subtle)]">
      <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
        {label}
      </p>
      <p
        className={`font-mono font-semibold ${
          isEmpty ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
