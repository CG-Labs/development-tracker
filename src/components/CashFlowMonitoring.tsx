import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { developments } from "../data/realDevelopments";
import { exportCashflowToExcel } from "../services/reportService";

// Development names available in the data
const DEVELOPMENT_NAMES = developments.map((d) => d.name);

const DEVELOPMENTS = ["All", ...DEVELOPMENT_NAMES];

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

type ViewMode = "weekly" | "monthly";

// Colors for stacked bars - one per development
const DEVELOPMENT_COLORS = [
  "#06b6d4", // cyan
  "#f59e0b", // amber
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#f43f5e", // rose
  "#3b82f6", // blue
  "#ec4899", // pink
  "#84cc16", // lime
  "#f97316", // orange
  "#6366f1", // indigo
];

// Parse date string to Date
function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

// Get week number and year from date
function getWeekKey(date: Date): string {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `W${weekNum.toString().padStart(2, "0")} ${date.getFullYear()}`;
}

// Get month key from date
function getMonthKey(date: Date): string {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

// Parse week string like "W01 2025" to Date
function parseWeekString(weekStr: string): Date {
  const match = weekStr.match(/W(\d+) (\d+)/);
  if (!match) return new Date();
  const weekNum = parseInt(match[1]);
  const year = parseInt(match[2]);
  const firstDayOfYear = new Date(year, 0, 1);
  const daysToAdd = (weekNum - 1) * 7 - firstDayOfYear.getDay() + 1;
  return new Date(year, 0, daysToAdd + 1);
}

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
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return `${value.toLocaleString()}`;
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

// Custom tooltip component for stacked chart
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string; dataKey: string }>;
  label?: string;
}) {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border-accent)] rounded-lg p-3 shadow-lg backdrop-blur-sm max-w-xs">
        <p className="font-mono text-xs text-[var(--text-muted)] mb-2">{label}</p>
        {payload
          .filter((entry) => entry.value > 0)
          .map((entry, index) => (
            <p key={index} className="font-mono text-xs" style={{ color: entry.color }}>
              {entry.name}: {formatFullCurrency(entry.value)}
            </p>
          ))}
        <div className="border-t border-[var(--border-subtle)] mt-2 pt-2">
          <p className="font-mono text-sm font-bold text-[var(--text-primary)]">
            Total: {formatFullCurrency(total)}
          </p>
        </div>
      </div>
    );
  }
  return null;
}

export function CashFlowMonitoring() {
  const [selectedDevelopment, setSelectedDevelopment] = useState("All");
  const [selectedUnitType, setSelectedUnitType] = useState("All");
  const [selectedBedrooms, setSelectedBedrooms] = useState("All");
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");

  // Date range state
  const [quickRange, setQuickRange] = useState<QuickRange>("all");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [appliedFromDate, setAppliedFromDate] = useState("");
  const [appliedToDate, setAppliedToDate] = useState("");

  // Handle quick range selection
  const handleQuickRangeClick = (range: QuickRange) => {
    setQuickRange(range);
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

  // Calculate cash flow data from unit-level data
  const { chartData, totalCashFlow, activeDevelopments } = useMemo(() => {
    const now = new Date();

    // Filter units based on development, unit type, and bedrooms
    const filteredUnits = developments.flatMap((dev) =>
      dev.units
        .filter((unit) => {
          if (selectedDevelopment !== "All" && dev.name !== selectedDevelopment) {
            return false;
          }
          if (selectedUnitType !== "All" && unit.type !== selectedUnitType) {
            return false;
          }
          if (selectedBedrooms !== "All" && String(unit.bedrooms) !== selectedBedrooms) {
            return false;
          }
          return true;
        })
        .map((unit) => ({ ...unit, developmentName: dev.name }))
    );

    // Group units by period with development breakdown
    const cashFlowByPeriod: Record<string, Record<string, number>> = {};

    filteredUnits.forEach((unit) => {
      // Use actual close date if available, otherwise use planned close date
      const dateStr = unit.closeDate || unit.plannedCloseDate;
      if (!dateStr) return;

      const date = parseDate(dateStr);
      const periodKey = viewMode === "weekly" ? getWeekKey(date) : getMonthKey(date);
      const price = unit.priceIncVat || unit.listPrice || 0;

      if (!cashFlowByPeriod[periodKey]) {
        cashFlowByPeriod[periodKey] = {};
      }

      if (!cashFlowByPeriod[periodKey][unit.developmentName]) {
        cashFlowByPeriod[periodKey][unit.developmentName] = 0;
      }
      cashFlowByPeriod[periodKey][unit.developmentName] += price;
    });

    // Sort periods chronologically
    const sortedPeriods = Object.keys(cashFlowByPeriod).sort((a, b) => {
      const dateA = viewMode === "weekly" ? parseWeekString(a) : parseMonthString(a);
      const dateB = viewMode === "weekly" ? parseWeekString(b) : parseMonthString(b);
      return dateA.getTime() - dateB.getTime();
    });

    // Apply date range filter
    const filteredPeriods = sortedPeriods.filter((periodStr) => {
      const periodDate = viewMode === "weekly" ? parseWeekString(periodStr) : parseMonthString(periodStr);

      switch (quickRange) {
        case "all":
          return true;
        case "2024":
          return periodDate.getFullYear() === 2024;
        case "2025":
          return periodDate.getFullYear() === 2025;
        case "2026":
          return periodDate.getFullYear() === 2026;
        case "last6": {
          const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
          return periodDate >= sixMonthsAgo && periodDate <= now;
        }
        case "last12": {
          const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);
          return periodDate >= twelveMonthsAgo && periodDate <= now;
        }
        case "custom": {
          const from = dateInputToMonthYear(appliedFromDate);
          const to = dateInputToMonthYear(appliedToDate);
          if (!from || !to) return true;

          const fromDate = new Date(from.year, from.month, 1);
          const toDate = new Date(to.year, to.month + 1, 0);
          return periodDate >= fromDate && periodDate <= toDate;
        }
        default:
          return true;
      }
    });

    // Get active developments that have data
    const activeDevelopmentsSet = new Set<string>();
    filteredPeriods.forEach((period) => {
      Object.keys(cashFlowByPeriod[period]).forEach((dev) => {
        activeDevelopmentsSet.add(dev);
      });
    });
    const activeDevelopments = Array.from(activeDevelopmentsSet).sort();

    // Build chart data with development breakdown
    const chartData = filteredPeriods.map((periodStr) => {
      const data = cashFlowByPeriod[periodStr];

      // Shorten period label for display
      let periodLabel = periodStr;
      if (filteredPeriods.length > 12) {
        periodLabel = periodStr.replace("20", "'");
      }

      const row: Record<string, string | number> = {
        month: periodLabel,
        fullPeriod: periodStr,
      };

      // Add each development as a column
      activeDevelopments.forEach((devName) => {
        row[devName] = data[devName] || 0;
      });

      return row;
    });

    // Calculate total
    let totalCashFlow = 0;
    filteredPeriods.forEach((period) => {
      Object.values(cashFlowByPeriod[period]).forEach((value) => {
        totalCashFlow += value;
      });
    });

    return { chartData, totalCashFlow, activeDevelopments };
  }, [selectedDevelopment, selectedUnitType, selectedBedrooms, viewMode, quickRange, appliedFromDate, appliedToDate]);

  const hasData = chartData.length > 0;

  // Handle Excel export
  const handleExportExcel = () => {
    exportCashflowToExcel(chartData, activeDevelopments);
  };

  return (
    <section className="animate-fade-in-up" style={{ opacity: 0, animationDelay: "0.5s" }}>
      {/* Section header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-gradient-to-b from-[var(--accent-gold)] to-[var(--accent-orange)] rounded-full" />
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            Cash Flow
          </h2>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-[var(--border-accent)] to-transparent" />
      </div>

      {/* Filters Card */}
      <div className="card p-5 mb-6 space-y-4">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-4">
          <label className="font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            View
          </label>
          <div className="flex rounded-lg overflow-hidden border border-[var(--border-subtle)]">
            <button
              onClick={() => setViewMode("weekly")}
              className={`px-4 py-2 font-mono text-xs font-medium transition-all ${
                viewMode === "weekly"
                  ? "bg-[var(--accent-cyan)] text-[var(--bg-deep)]"
                  : "bg-[var(--bg-deep)] text-[var(--text-secondary)] hover:text-[var(--accent-cyan)]"
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setViewMode("monthly")}
              className={`px-4 py-2 font-mono text-xs font-medium transition-all ${
                viewMode === "monthly"
                  ? "bg-[var(--accent-cyan)] text-[var(--bg-deep)]"
                  : "bg-[var(--bg-deep)] text-[var(--text-secondary)] hover:text-[var(--accent-cyan)]"
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

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

      {/* Chart */}
      {hasData ? (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-[var(--accent-gold)]"
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
                Cash Flow by Development ({viewMode === "weekly" ? "Weekly" : "Monthly"})
              </h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-mono text-xs text-[var(--text-muted)]">Total</p>
                <p className="font-mono text-xl font-bold text-[var(--accent-gold-bright)]">
                  {formatFullCurrency(totalCashFlow)}
                </p>
              </div>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-emerald)] text-white rounded-lg hover:bg-[var(--accent-emerald-bright)] transition-colors"
                title="Export to Excel"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="font-mono text-xs font-medium">Export</span>
              </button>
            </div>
          </div>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
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
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: "10px" }}
                  formatter={(value) => (
                    <span style={{ color: "var(--text-secondary)", fontSize: "11px" }}>
                      {value}
                    </span>
                  )}
                />
                {activeDevelopments.map((devName, index) => (
                  <Bar
                    key={devName}
                    dataKey={devName}
                    name={devName}
                    stackId="cashflow"
                    fill={DEVELOPMENT_COLORS[index % DEVELOPMENT_COLORS.length]}
                    radius={index === activeDevelopments.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
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
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="font-display text-xl font-semibold text-[var(--text-primary)] mb-2">
              No Cash Flow Data
            </h3>
            <p className="font-mono text-sm text-[var(--text-muted)]">
              No cash flow data found for the selected filters. Try adjusting your filters.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
