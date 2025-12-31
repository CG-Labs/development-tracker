import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { developments } from "../data/realDevelopments";

// Development names available in the data
const DEVELOPMENTS = [
  "All",
  ...developments.map((d) => d.name),
];

// Get unique unit types from data
const UNIT_TYPES = [
  "All",
  ...Array.from(
    new Set(developments.flatMap((d) => d.units.map((u) => u.type)))
  ).sort(),
];

// Get unique bedroom counts from data
const BEDROOMS = [
  "All",
  ...Array.from(
    new Set(developments.flatMap((d) => d.units.map((u) => String(u.bedrooms))))
  ).sort((a, b) => Number(a) - Number(b)),
];

// Quick date range options
type QuickRange = "all" | "2024" | "2025" | "2026" | "last6" | "last12" | "custom";

const QUICK_RANGES: { id: QuickRange; label: string }[] = [
  { id: "all", label: "All Time" },
  { id: "2024", label: "2024" },
  { id: "2025", label: "2025" },
  { id: "2026", label: "2026" },
  { id: "last6", label: "Last 6 Months" },
  { id: "last12", label: "Last 12 Months" },
];

// Parse month string like "Jan 2025" to Date
function parseMonthString(monthStr: string): Date {
  const parts = monthStr.split(" ");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthIndex = monthNames.indexOf(parts[0]);
  const year = parseInt(parts[1]);
  return new Date(year, monthIndex, 1);
}

// Get month string from date input value (YYYY-MM format)
function dateInputToMonthYear(value: string): { month: number; year: number } | null {
  if (!value) return null;
  const [year, month] = value.split("-").map(Number);
  return { month: month - 1, year };
}

// Format currency for display
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `€${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `€${(value / 1000).toFixed(0)}K`;
  }
  return `€${value.toLocaleString()}`;
}

// Format full currency for tooltips
function formatFullCurrency(value: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Custom tooltip component
function CustomTooltip({
  active,
  payload,
  label,
  isRevenue,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
  isRevenue?: boolean;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border-accent)] rounded-lg p-3 shadow-lg backdrop-blur-sm">
        <p className="font-mono text-xs text-[var(--text-muted)] mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="font-mono text-sm" style={{ color: entry.color }}>
            {entry.name}: {isRevenue ? formatFullCurrency(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export function ProgressMonitoring() {
  const [selectedDevelopment, setSelectedDevelopment] = useState("All");
  const [selectedUnitType, setSelectedUnitType] = useState("All");
  const [selectedBedrooms, setSelectedBedrooms] = useState("All");

  // Date range state
  const [quickRange, setQuickRange] = useState<QuickRange>("all");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [appliedFromDate, setAppliedFromDate] = useState("");
  const [appliedToDate, setAppliedToDate] = useState("");

  // Handle quick range selection
  const handleQuickRangeClick = (range: QuickRange) => {
    setQuickRange(range);
    // Clear custom dates when selecting a quick range
    if (range !== "custom") {
      setAppliedFromDate("");
      setAppliedToDate("");
    }
  };

  // Handle custom date apply
  const handleApplyCustomDates = () => {
    if (customFromDate && customToDate) {
      setQuickRange("custom");
      setAppliedFromDate(customFromDate);
      setAppliedToDate(customToDate);
    }
  };

  // Calculate chart data from unit-level data with all filters applied
  const chartData = useMemo(() => {
    const now = new Date();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Filter units based on development, unit type, and bedrooms
    const filteredUnits = developments.flatMap((dev) =>
      dev.units
        .filter((unit) => {
          // Development filter
          if (selectedDevelopment !== "All" && dev.name !== selectedDevelopment) {
            return false;
          }
          // Unit type filter
          if (selectedUnitType !== "All" && unit.type !== selectedUnitType) {
            return false;
          }
          // Bedrooms filter
          if (selectedBedrooms !== "All" && String(unit.bedrooms) !== selectedBedrooms) {
            return false;
          }
          return true;
        })
        .map((unit) => ({ ...unit, developmentName: dev.name }))
    );

    // Group units by month for planned and actual
    const plannedByMonth: Record<string, { qty: number; value: number }> = {};
    const actualByMonth: Record<string, { qty: number; value: number }> = {};

    filteredUnits.forEach((unit) => {
      // Planned close date
      if (unit.plannedCloseDate) {
        const date = new Date(unit.plannedCloseDate);
        const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        if (!plannedByMonth[monthKey]) {
          plannedByMonth[monthKey] = { qty: 0, value: 0 };
        }
        plannedByMonth[monthKey].qty += 1;
        plannedByMonth[monthKey].value += unit.priceIncVat || unit.listPrice || 0;
      }

      // Actual close date
      if (unit.closeDate) {
        const date = new Date(unit.closeDate);
        const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        if (!actualByMonth[monthKey]) {
          actualByMonth[monthKey] = { qty: 0, value: 0 };
        }
        actualByMonth[monthKey].qty += 1;
        actualByMonth[monthKey].value += unit.soldPrice || unit.priceIncVat || unit.listPrice || 0;
      }
    });

    // Get all unique months from both planned and actual
    const allMonths = new Set([...Object.keys(plannedByMonth), ...Object.keys(actualByMonth)]);

    // Sort months chronologically
    const sortedMonths = Array.from(allMonths).sort((a, b) => {
      const dateA = parseMonthString(a);
      const dateB = parseMonthString(b);
      return dateA.getTime() - dateB.getTime();
    });

    // Apply date range filter
    const filteredMonths = sortedMonths.filter((monthStr) => {
      const monthDate = parseMonthString(monthStr);

      switch (quickRange) {
        case "all":
          return true;
        case "2024":
          return monthDate.getFullYear() === 2024;
        case "2025":
          return monthDate.getFullYear() === 2025;
        case "2026":
          return monthDate.getFullYear() === 2026;
        case "last6": {
          const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
          return monthDate >= sixMonthsAgo && monthDate <= now;
        }
        case "last12": {
          const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);
          return monthDate >= twelveMonthsAgo && monthDate <= now;
        }
        case "custom": {
          const from = dateInputToMonthYear(appliedFromDate);
          const to = dateInputToMonthYear(appliedToDate);
          if (!from || !to) return true;

          const fromDate = new Date(from.year, from.month, 1);
          const toDate = new Date(to.year, to.month + 1, 0); // End of month
          return monthDate >= fromDate && monthDate <= toDate;
        }
        default:
          return true;
      }
    });

    // Calculate cumulative values
    let cumulativePlannedQty = 0;
    let cumulativeActualQty = 0;
    let cumulativePlannedValue = 0;
    let cumulativeActualValue = 0;

    return filteredMonths.map((monthStr) => {
      const planned = plannedByMonth[monthStr] || { qty: 0, value: 0 };
      const actual = actualByMonth[monthStr] || { qty: 0, value: 0 };

      cumulativePlannedQty += planned.qty;
      cumulativeActualQty += actual.qty;
      cumulativePlannedValue += planned.value;
      cumulativeActualValue += actual.value;

      // Format month label based on data range
      let monthLabel = monthStr;
      if (filteredMonths.length > 12) {
        monthLabel = monthStr.replace("20", "'");
      } else {
        monthLabel = monthStr.replace(" 2025", "").replace(" 2026", " '26").replace(" 2024", " '24");
      }

      return {
        month: monthLabel,
        fullMonth: monthStr,
        plannedUnits: planned.qty,
        actualUnits: actual.qty,
        cumulativePlannedUnits: cumulativePlannedQty,
        cumulativeActualUnits: cumulativeActualQty,
        plannedRevenue: planned.value,
        actualRevenue: actual.value,
        cumulativePlannedRevenue: cumulativePlannedValue,
        cumulativeActualRevenue: cumulativeActualValue,
      };
    });
  }, [selectedDevelopment, selectedUnitType, selectedBedrooms, quickRange, appliedFromDate, appliedToDate]);

  const hasData = chartData.length > 0;

  return (
    <section className="animate-fade-in-up" style={{ opacity: 0, animationDelay: "0.4s" }}>
      {/* Section header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-gradient-to-b from-[var(--accent-emerald)] to-[var(--accent-cyan)] rounded-full" />
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            Progress Monitoring
          </h2>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-[var(--border-accent)] to-transparent" />
      </div>

      {/* Filters Card */}
      <div className="card p-5 mb-6 space-y-4">
        {/* Date Range Row */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Quick Date Buttons */}
          <div className="flex-1">
            <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Date Range
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK_RANGES.map((range) => (
                <button
                  key={range.id}
                  onClick={() => handleQuickRangeClick(range.id)}
                  className={`px-4 py-2 rounded-full font-mono text-xs font-medium transition-all ${
                    quickRange === range.id
                      ? "bg-[var(--accent-cyan)] text-[var(--bg-deep)] shadow-lg shadow-[rgba(6,214,214,0.3)]"
                      : "bg-[var(--bg-deep)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range */}
          <div className="flex flex-col sm:flex-row items-end gap-3">
            <div>
              <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                From
              </label>
              <input
                type="month"
                value={customFromDate}
                onChange={(e) => setCustomFromDate(e.target.value)}
                className="input w-36"
                min="2024-01"
                max="2026-12"
              />
            </div>
            <div>
              <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                To
              </label>
              <input
                type="month"
                value={customToDate}
                onChange={(e) => setCustomToDate(e.target.value)}
                className="input w-36"
                min="2024-01"
                max="2026-12"
              />
            </div>
            <button
              onClick={handleApplyCustomDates}
              disabled={!customFromDate || !customToDate}
              className={`px-4 py-2.5 rounded-lg font-mono text-xs font-medium transition-all ${
                customFromDate && customToDate
                  ? "bg-[var(--accent-emerald)] text-white hover:bg-[var(--accent-emerald-bright)] shadow-lg shadow-[rgba(16,185,129,0.3)]"
                  : "bg-[var(--bg-deep)] text-[var(--text-muted)] border border-[var(--border-subtle)] cursor-not-allowed"
              }`}
            >
              Apply
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-[var(--border-subtle)]" />

        {/* Filter Dropdowns Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Development Filter */}
          <div>
            <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Development
            </label>
            <select
              value={selectedDevelopment}
              onChange={(e) => setSelectedDevelopment(e.target.value)}
              className="select"
            >
              {DEVELOPMENTS.map((dev) => (
                <option key={dev} value={dev}>
                  {dev}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Type Filter */}
          <div>
            <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Unit Type
            </label>
            <select
              value={selectedUnitType}
              onChange={(e) => setSelectedUnitType(e.target.value)}
              className="select"
            >
              {UNIT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Bedrooms Filter */}
          <div>
            <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Bedrooms
            </label>
            <select
              value={selectedBedrooms}
              onChange={(e) => setSelectedBedrooms(e.target.value)}
              className="select"
            >
              {BEDROOMS.map((bed) => (
                <option key={bed} value={bed}>
                  {bed === "All" ? "All" : `${bed} Bed`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      {hasData ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Units Sold Chart */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <svg
                className="w-5 h-5 text-[var(--accent-cyan)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
              </svg>
              <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                Units Sold - Planned vs Actual
              </h3>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                    axisLine={{ stroke: "var(--border-subtle)" }}
                    tickLine={{ stroke: "var(--border-subtle)" }}
                    interval={chartData.length > 12 ? Math.floor(chartData.length / 6) : 0}
                  />
                  <YAxis
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    axisLine={{ stroke: "var(--border-subtle)" }}
                    tickLine={{ stroke: "var(--border-subtle)" }}
                  />
                  <Tooltip content={<CustomTooltip isRevenue={false} />} />
                  <Legend
                    wrapperStyle={{ paddingTop: "10px" }}
                    formatter={(value) => (
                      <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                        {value}
                      </span>
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulativePlannedUnits"
                    name="Planned"
                    stroke="#06d6d6"
                    strokeWidth={2}
                    dot={{ fill: "#06d6d6", strokeWidth: 0, r: chartData.length > 12 ? 2 : 3 }}
                    activeDot={{ r: 5, fill: "#06d6d6" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulativeActualUnits"
                    name="Actual"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: "#10b981", strokeWidth: 0, r: chartData.length > 12 ? 2 : 3 }}
                    activeDot={{ r: 5, fill: "#10b981" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sales Revenue Chart */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <svg
                className="w-5 h-5 text-[var(--accent-emerald)]"
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
              <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                Sales Revenue - Planned vs Actual
              </h3>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                    axisLine={{ stroke: "var(--border-subtle)" }}
                    tickLine={{ stroke: "var(--border-subtle)" }}
                    interval={chartData.length > 12 ? Math.floor(chartData.length / 6) : 0}
                  />
                  <YAxis
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    axisLine={{ stroke: "var(--border-subtle)" }}
                    tickLine={{ stroke: "var(--border-subtle)" }}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip content={<CustomTooltip isRevenue={true} />} />
                  <Legend
                    wrapperStyle={{ paddingTop: "10px" }}
                    formatter={(value) => (
                      <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                        {value}
                      </span>
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulativePlannedRevenue"
                    name="Planned"
                    stroke="#06d6d6"
                    strokeWidth={2}
                    dot={{ fill: "#06d6d6", strokeWidth: 0, r: chartData.length > 12 ? 2 : 3 }}
                    activeDot={{ r: 5, fill: "#06d6d6" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulativeActualRevenue"
                    name="Actual"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: "#10b981", strokeWidth: 0, r: chartData.length > 12 ? 2 : 3 }}
                    activeDot={{ r: 5, fill: "#10b981" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <div className="flex flex-col items-center">
            <svg
              className="w-16 h-16 text-[var(--text-muted)] mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="font-display text-xl font-semibold text-[var(--text-primary)] mb-2">
              No Data Available
            </h3>
            <p className="font-mono text-sm text-[var(--text-muted)]">
              No data found for the selected date range. Try adjusting your filters.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
