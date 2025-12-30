import { Link } from "react-router-dom";
import type { Development } from "../types";

interface DevelopmentCardProps {
  development: Development;
  index: number;
}

// Format currency in EUR
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function DevelopmentCard({ development, index }: DevelopmentCardProps) {
  const salesComplete = development.units.filter((u) => u.salesStatus === "Complete").length;
  const forSale = development.units.filter(
    (u) => u.salesStatus === "For Sale"
  ).length;
  const underOffer = development.units.filter(
    (u) => u.salesStatus === "Under Offer"
  ).length;
  const contracted = development.units.filter(
    (u) => u.salesStatus === "Contracted"
  ).length;

  const constructionComplete = development.units.filter(
    (u) => u.constructionStatus === "Complete"
  ).length;
  const inProgress = development.units.filter(
    (u) => u.constructionStatus === "In Progress"
  ).length;

  const completionPercentage = Math.round(
    (constructionComplete / development.totalUnits) * 100
  );

  const salesCompletePercentage = Math.round((salesComplete / development.totalUnits) * 100);

  // Financial calculations
  const gdv = development.units.reduce((sum, unit) => {
    const price = (unit as { priceIncVat?: number }).priceIncVat || unit.listPrice || 0;
    return sum + price;
  }, 0);

  const salesRevenue = development.units
    .filter((u) => u.salesStatus === "Complete")
    .reduce((sum, unit) => {
      const price = (unit as { priceIncVat?: number }).priceIncVat || unit.listPrice || 0;
      return sum + price;
    }, 0);

  const salesPercentageOfGdv = gdv > 0 ? Math.round((salesRevenue / gdv) * 100) : 0;

  return (
    <div
      className="card p-6 group animate-fade-in-up relative overflow-hidden"
      style={{
        opacity: 0,
        animationDelay: `${0.1 + index * 0.1}s`
      }}
    >
      {/* Decorative corner elements */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[var(--accent-cyan)] opacity-30 rounded-tl-xl" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[var(--accent-cyan)] opacity-30 rounded-br-xl" />

      {/* Header */}
      <div className="flex justify-between items-start mb-5">
        <div>
          <h3 className="font-display text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-cyan)] transition-colors">
            {development.name}
          </h3>
          <p className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider mt-1">
            {development.projectNumber}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-bold text-[var(--accent-cyan)]">
            {development.totalUnits}
          </p>
          <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
            units
          </p>
        </div>
      </div>

      {/* Sales Status Grid */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <SalesMetric
          label="Complete"
          value={salesComplete}
          colorClass="text-[var(--accent-gold-bright)]"
          bgClass="bg-[rgba(245,158,11,0.1)]"
        />
        <SalesMetric
          label="Contracted"
          value={contracted}
          colorClass="text-[var(--accent-purple)]"
          bgClass="bg-[rgba(139,92,246,0.1)]"
        />
        <SalesMetric
          label="Under Offer"
          value={underOffer}
          colorClass="text-[var(--accent-orange)]"
          bgClass="bg-[rgba(249,115,22,0.1)]"
        />
        <SalesMetric
          label="For Sale"
          value={forSale}
          colorClass="text-[var(--accent-cyan)]"
          bgClass="bg-[rgba(6,214,214,0.1)]"
        />
      </div>

      {/* Construction Progress */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Construction
          </span>
          <span className="font-mono text-sm font-bold text-[var(--text-primary)]">
            {completionPercentage}%
          </span>
        </div>
        <div className="progress-bar">
          <div
            className={`progress-fill ${
              completionPercentage === 100
                ? "progress-emerald"
                : completionPercentage > 50
                ? "progress-gold"
                : "progress-cyan"
            }`}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="font-mono text-[10px] text-[var(--text-muted)]">
            {constructionComplete} complete
          </span>
          <span className="font-mono text-[10px] text-[var(--text-muted)]">
            {inProgress} in progress
          </span>
        </div>
      </div>

      {/* Sales Progress Mini-bar */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Sales Complete
          </span>
          <span className="font-mono text-sm font-bold text-[var(--accent-gold-bright)]">
            {salesCompletePercentage}%
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill progress-gold"
            style={{ width: `${salesCompletePercentage}%` }}
          />
        </div>
      </div>

      {/* Financial Summary */}
      <div className="mb-5 p-4 rounded-lg bg-[var(--bg-deep)] border border-[var(--border-subtle)]">
        <div className="flex items-center gap-2 mb-3">
          <svg
            className="w-4 h-4 text-[var(--accent-emerald)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
            />
          </svg>
          <span className="font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Financial Summary
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-mono text-xs text-[var(--text-muted)]">GDV</span>
            <span className="font-mono text-sm font-bold text-[var(--text-primary)]">
              {formatCurrency(gdv)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-mono text-xs text-[var(--text-muted)]">Sales to Date</span>
            <div className="text-right">
              <span className="font-mono text-sm font-bold text-[var(--accent-emerald)]">
                {formatCurrency(salesRevenue)}
              </span>
              <span className="font-mono text-xs text-[var(--text-muted)] ml-2">
                ({salesPercentageOfGdv}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* View Details Button */}
      <Link
        to={`/development/${development.id}`}
        className="btn-primary w-full block text-center"
      >
        View Details
      </Link>
    </div>
  );
}

function SalesMetric({
  label,
  value,
  colorClass,
  bgClass,
}: {
  label: string;
  value: number;
  colorClass: string;
  bgClass: string;
}) {
  return (
    <div className={`rounded-lg p-2 ${bgClass} text-center`}>
      <p className={`font-mono text-lg font-bold ${colorClass}`}>{value}</p>
      <p className="font-mono text-[9px] text-[var(--text-muted)] uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}
