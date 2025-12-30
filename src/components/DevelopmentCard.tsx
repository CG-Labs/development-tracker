import { Link } from "react-router-dom";
import type { Development } from "../types";

interface DevelopmentCardProps {
  development: Development;
  index: number;
}

export function DevelopmentCard({ development, index }: DevelopmentCardProps) {
  const sold = development.units.filter((u) => u.salesStatus === "Sold").length;
  const available = development.units.filter(
    (u) => u.salesStatus === "Available"
  ).length;
  const reserved = development.units.filter(
    (u) => u.salesStatus === "Reserved"
  ).length;
  const saleAgreed = development.units.filter(
    (u) => u.salesStatus === "Sale Agreed"
  ).length;

  const complete = development.units.filter(
    (u) => u.constructionStatus === "Complete"
  ).length;
  const inProgress = development.units.filter(
    (u) => u.constructionStatus === "In Progress"
  ).length;

  const completionPercentage = Math.round(
    (complete / development.totalUnits) * 100
  );

  const soldPercentage = Math.round((sold / development.totalUnits) * 100);

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
          label="Sold"
          value={sold}
          colorClass="text-[var(--accent-gold-bright)]"
          bgClass="bg-[rgba(245,158,11,0.1)]"
        />
        <SalesMetric
          label="Agreed"
          value={saleAgreed}
          colorClass="text-[var(--accent-purple)]"
          bgClass="bg-[rgba(139,92,246,0.1)]"
        />
        <SalesMetric
          label="Reserved"
          value={reserved}
          colorClass="text-[var(--accent-orange)]"
          bgClass="bg-[rgba(249,115,22,0.1)]"
        />
        <SalesMetric
          label="Available"
          value={available}
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
            {complete} complete
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
            Sales Progress
          </span>
          <span className="font-mono text-sm font-bold text-[var(--accent-gold-bright)]">
            {soldPercentage}%
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill progress-gold"
            style={{ width: `${soldPercentage}%` }}
          />
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
