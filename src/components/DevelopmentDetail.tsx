import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { developments } from "../data/realDevelopments";
import type { Unit, ConstructionStatus, SalesStatus } from "../types";
import { UnitDetailModal } from "./UnitDetailModal";

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

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

export function DevelopmentDetail() {
  const { id } = useParams<{ id: string }>();
  const development = developments.find((d) => d.id === id);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [constructionFilter, setConstructionFilter] = useState<string>("all");
  const [salesFilter, setSalesFilter] = useState<string>("all");
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  const unitTypes = useMemo(() => {
    if (!development) return [];
    const types = new Set(development.units.map((u) => u.type));
    return Array.from(types);
  }, [development]);

  const filteredUnits = useMemo(() => {
    if (!development) return [];

    return development.units.filter((unit) => {
      const matchesSearch =
        searchQuery === "" ||
        unit.unitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.type.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === "all" || unit.type === typeFilter;
      const matchesConstruction =
        constructionFilter === "all" ||
        unit.constructionStatus === constructionFilter;
      const matchesSales =
        salesFilter === "all" || unit.salesStatus === salesFilter;

      return matchesSearch && matchesType && matchesConstruction && matchesSales;
    });
  }, [development, searchQuery, typeFilter, constructionFilter, salesFilter]);

  if (!development) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-full bg-[var(--bg-card)] flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-[var(--text-muted)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] mb-2">
          Development not found
        </h2>
        <p className="text-[var(--text-secondary)] mb-6">
          The development you're looking for doesn't exist.
        </p>
        <Link to="/" className="btn-primary">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const sold = development.units.filter((u) => u.salesStatus === "Sold").length;
  const available = development.units.filter((u) => u.salesStatus === "Available").length;
  const complete = development.units.filter((u) => u.constructionStatus === "Complete").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[var(--accent-cyan)] hover:text-[var(--text-primary)] text-sm font-medium mb-3 transition-colors group"
          >
            <svg
              className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-gradient-to-b from-[var(--accent-cyan)] to-[var(--accent-purple)] rounded-full" />
            <div>
              <h2 className="font-display text-3xl font-bold text-[var(--text-primary)]">
                {development.name}
              </h2>
              <p className="font-mono text-sm text-[var(--text-muted)] uppercase tracking-wider">
                {development.projectNumber}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-4">
          <QuickStat label="Total" value={development.totalUnits} color="cyan" />
          <QuickStat label="Sold" value={sold} color="gold" />
          <QuickStat label="Available" value={available} color="cyan" />
          <QuickStat label="Complete" value={complete} color="emerald" />
        </div>
      </div>

      {/* Filters */}
      <div className="card p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-1">
            <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search units..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Unit Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="select"
            >
              <option value="all">All Types</option>
              {unitTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Construction Status Filter */}
          <div>
            <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Construction
            </label>
            <select
              value={constructionFilter}
              onChange={(e) => setConstructionFilter(e.target.value)}
              className="select"
            >
              <option value="all">All Statuses</option>
              <option value="Complete">Complete</option>
              <option value="In Progress">In Progress</option>
              <option value="Not Started">Not Started</option>
            </select>
          </div>

          {/* Sales Status Filter */}
          <div>
            <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Sales Status
            </label>
            <select
              value={salesFilter}
              onChange={(e) => setSalesFilter(e.target.value)}
              className="select"
            >
              <option value="all">All Statuses</option>
              <option value="Not Released">Not Released</option>
              <option value="For Sale">For Sale</option>
              <option value="Under Offer">Under Offer</option>
              <option value="Contracted">Contracted</option>
              <option value="Complete">Complete</option>
            </select>
          </div>

          {/* Results count */}
          <div className="flex items-end">
            <div className="w-full px-4 py-3 rounded-lg bg-[var(--bg-deep)] border border-[var(--border-subtle)]">
              <p className="font-mono text-sm text-[var(--text-secondary)]">
                <span className="text-[var(--accent-cyan)] font-bold">{filteredUnits.length}</span>
                {" "}of{" "}
                <span className="text-[var(--text-primary)]">{development.units.length}</span>
                {" "}units
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Units Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--bg-deep)] border-b border-[var(--border-subtle)]">
                <th className="px-4 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Unit #
                </th>
                <th className="px-4 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Area
                </th>
                <th className="px-4 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-4 text-center font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Beds
                </th>
                <th className="px-4 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Construction
                </th>
                <th className="px-4 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Sales
                </th>
                <th className="px-4 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Planned Close
                </th>
                <th className="px-4 py-4 text-right font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Price
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUnits.map((unit, index) => (
                <tr
                  key={unit.unitNumber}
                  onClick={() => setSelectedUnit(unit)}
                  className="table-row cursor-pointer group"
                  style={{
                    animation: `fadeInUp 0.3s ease-out forwards`,
                    animationDelay: `${index * 0.03}s`,
                    opacity: 0,
                  }}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-cyan)] transition-colors">
                      {unit.unitNumber}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm text-[var(--text-secondary)]">
                      {(unit as { size?: number }).size ? `${(unit as { size?: number }).size}m²` : "-"}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                    {unit.type}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <span className="font-mono text-sm text-[var(--text-primary)]">
                      {unit.bedrooms}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={constructionBadgeClasses[unit.constructionStatus]}>
                      {unit.constructionStatus}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={salesBadgeClasses[unit.salesStatus]}>
                      {unit.salesStatus}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="font-mono text-xs text-[var(--text-secondary)]">
                      {formatDate((unit as { plannedCloseDate?: string }).plannedCloseDate)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                      {unit.soldPrice
                        ? formatPrice(unit.soldPrice)
                        : formatPrice(unit.listPrice)}
                    </span>
                    {unit.soldPrice && unit.soldPrice !== unit.listPrice && (
                      <span className="block font-mono text-xs text-[var(--text-muted)] line-through">
                        {formatPrice(unit.listPrice)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUnits.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <svg
                        className="w-12 h-12 text-[var(--text-muted)] mb-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="font-display text-[var(--text-secondary)]">
                        No units match your filters
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unit Detail Modal */}
      {selectedUnit && (
        <UnitDetailModal
          unit={selectedUnit}
          developmentName={development.name}
          onClose={() => setSelectedUnit(null)}
        />
      )}
    </div>
  );
}

function QuickStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "cyan" | "gold" | "emerald";
}) {
  const colorClasses = {
    cyan: "text-[var(--accent-cyan)]",
    gold: "text-[var(--accent-gold-bright)]",
    emerald: "text-[var(--accent-emerald)]",
  };

  return (
    <div className="text-center px-4 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]">
      <p className={`font-mono text-2xl font-bold ${colorClasses[color]}`}>
        {value}
      </p>
      <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}
