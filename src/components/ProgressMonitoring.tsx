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
import { progressData } from "../data/progressData";

// Development names available in the data
const DEVELOPMENTS = [
  "All",
  "Knockhill Ph 1",
  "Knockhill Ph 2",
  "Magee",
  "Newtown Meadows",
];

const UNIT_TYPES = [
  "All",
  "House-Semi",
  "House-Detached",
  "House-Terrace",
  "Apartment",
  "Duplex Apartment",
  "Apartment Studio",
];

const BEDROOMS = ["All", "1", "2", "3", "4"];

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

  // Process and filter data based on selections
  const chartData = useMemo(() => {
    // Get first 12 months of data for readability
    const monthlyData = progressData.slice(0, 12);

    // Calculate cumulative totals
    let cumulativePlannedQty = 0;
    let cumulativeActualQty = 0;
    let cumulativePlannedValue = 0;
    let cumulativeActualValue = 0;

    return monthlyData.map((item) => {
      let plannedQty = item.plannedQty;
      let actualQty = item.actualQty;
      let plannedValue = item.plannedValue;
      let actualValue = item.actualValue;

      // Filter by development if not "All"
      if (selectedDevelopment !== "All") {
        const devData = item.byDevelopment[selectedDevelopment];
        if (devData) {
          plannedQty = devData.plannedQty;
          actualQty = devData.actualQty;
          plannedValue = devData.plannedValue;
          actualValue = devData.actualValue;
        } else {
          plannedQty = 0;
          actualQty = 0;
          plannedValue = 0;
          actualValue = 0;
        }
      }

      // Note: Unit Type and Bedrooms filtering would require additional data
      // that's not currently in progressData. For now, these filters are
      // placeholders that could be connected to more granular data later.

      // Calculate cumulative values
      cumulativePlannedQty += plannedQty;
      cumulativeActualQty += actualQty;
      cumulativePlannedValue += plannedValue;
      cumulativeActualValue += actualValue;

      return {
        month: item.month.replace(" 2025", "").replace(" 2026", " '26"),
        plannedUnits: plannedQty,
        actualUnits: actualQty,
        cumulativePlannedUnits: cumulativePlannedQty,
        cumulativeActualUnits: cumulativeActualQty,
        plannedRevenue: plannedValue,
        actualRevenue: actualValue,
        cumulativePlannedRevenue: cumulativePlannedValue,
        cumulativeActualRevenue: cumulativeActualValue,
      };
    });
  }, [selectedDevelopment, selectedUnitType, selectedBedrooms]);

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

      {/* Filters */}
      <div className="card p-5 mb-6">
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
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  axisLine={{ stroke: "var(--border-subtle)" }}
                  tickLine={{ stroke: "var(--border-subtle)" }}
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
                  dot={{ fill: "#06d6d6", strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: "#06d6d6" }}
                />
                <Line
                  type="monotone"
                  dataKey="cumulativeActualUnits"
                  name="Actual"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981", strokeWidth: 0, r: 3 }}
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
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  axisLine={{ stroke: "var(--border-subtle)" }}
                  tickLine={{ stroke: "var(--border-subtle)" }}
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
                  dot={{ fill: "#06d6d6", strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: "#06d6d6" }}
                />
                <Line
                  type="monotone"
                  dataKey="cumulativeActualRevenue"
                  name="Actual"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981", strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: "#10b981" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
