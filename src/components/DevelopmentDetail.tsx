import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { developments } from "../data/realDevelopments";
import type { Unit, ConstructionStatus, SalesStatus } from "../types";
import { UnitDetailModal } from "./UnitDetailModal";
import { BulkUpdateToolbar } from "./BulkUpdateToolbar";
import { BulkUpdateModal } from "./BulkUpdateModal";
import { getNotesCountsForDevelopment } from "../services/notesService";
import { useAuth } from "../contexts/AuthContext";

// Unit overrides storage key (same as excelImportService)
const UNIT_OVERRIDES_KEY = "development_tracker_unit_overrides";

interface UnitOverride {
  developmentId: string;
  unitNumber: string;
  unit: Unit;
}

// Save unit override to localStorage
function saveUnitOverride(developmentId: string, unitNumber: string, unit: Unit): void {
  try {
    const saved = localStorage.getItem(UNIT_OVERRIDES_KEY);
    const overrides: UnitOverride[] = saved ? JSON.parse(saved) : [];

    const existingIndex = overrides.findIndex(
      (o) => o.developmentId === developmentId && o.unitNumber === unitNumber
    );

    if (existingIndex >= 0) {
      overrides[existingIndex].unit = unit;
    } else {
      overrides.push({ developmentId, unitNumber, unit });
    }

    localStorage.setItem(UNIT_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch (error) {
    console.error("Failed to save unit override:", error);
  }
}

type SortField = "unitNumber" | "type" | "bedrooms" | "area" | "constructionStatus" | "salesStatus" | "plannedBcmsDate" | "bcmsApproved" | "price" | "notes";
type SortDirection = "asc" | "desc";

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

// SortIcon component - moved outside to prevent recreation on every render
function SortIcon({
  field,
  sortField,
  sortDirection
}: {
  field: SortField;
  sortField: SortField;
  sortDirection: SortDirection;
}) {
  return (
    <span className="ml-1 inline-flex flex-col">
      <svg
        className={`w-2 h-2 ${sortField === field && sortDirection === "asc" ? "text-[var(--accent-cyan)]" : "text-[var(--text-muted)]"}`}
        viewBox="0 0 8 4"
        fill="currentColor"
      >
        <path d="M4 0L8 4H0L4 0Z" />
      </svg>
      <svg
        className={`w-2 h-2 ${sortField === field && sortDirection === "desc" ? "text-[var(--accent-cyan)]" : "text-[var(--text-muted)]"}`}
        viewBox="0 0 8 4"
        fill="currentColor"
      >
        <path d="M4 4L0 0H8L4 4Z" />
      </svg>
    </span>
  );
}

export function DevelopmentDetail() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const development = developments.find((d) => d.id === id);

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [bedsFilter, setBedsFilter] = useState<string>("all");
  const [salesFilter, setSalesFilter] = useState<string>("all");
  const [bcmsApprovedFilter, setBcmsApprovedFilter] = useState<string>("all");
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [notesCounts, setNotesCounts] = useState<Map<string, number>>(new Map());
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  const [sortField, setSortField] = useState<SortField>("unitNumber");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Fetch notes counts for this development
  useEffect(() => {
    if (!development) return;
    getNotesCountsForDevelopment(development.id)
      .then(setNotesCounts)
      .catch(console.error);
  }, [development, selectedUnit]); // Refresh when modal closes

  // Handle unit save from modal
  const handleUnitSave = useCallback(
    (updatedUnit: Unit) => {
      if (!development) return;

      // Find and update the unit in the development.units array
      const unitIndex = development.units.findIndex(
        (u) => u.unitNumber === updatedUnit.unitNumber
      );
      if (unitIndex >= 0) {
        // Update in-memory array (direct mutation since we don't have a setter)
        development.units[unitIndex] = updatedUnit;
      }

      // Save to localStorage for persistence
      saveUnitOverride(development.id, updatedUnit.unitNumber, updatedUnit);

      // Update the selectedUnit to reflect changes in the modal
      setSelectedUnit(updatedUnit);

      // Trigger a re-render
      setRefreshKey((k) => k + 1);
    },
    [development]
  );

  const unitTypes = useMemo(() => {
    if (!development) return [];
    const types = new Set(development.units.map((u) => u.type));
    return Array.from(types).sort();
  }, [development]);

  // Generate unique bedroom options from data
  const bedroomOptions = useMemo(() => {
    if (!development) return [];
    const bedsSet = new Set<string>();
    development.units.forEach((u) => {
      const beds = String(u.bedrooms);
      if (beds === "0" || beds.toLowerCase() === "studio") {
        bedsSet.add("Studio");
      } else {
        bedsSet.add(`${beds} Bed`);
      }
    });
    // Sort with Studio first, then by number
    const sorted = Array.from(bedsSet).sort((a, b) => {
      if (a === "Studio") return -1;
      if (b === "Studio") return 1;
      const numA = parseInt(a);
      const numB = parseInt(b);
      return numA - numB;
    });
    return sorted;
  }, [development]);

  const filteredUnits = useMemo(() => {
    if (!development) return [];

    const filtered = development.units.filter((unit) => {
      // Type filter
      const matchesType = typeFilter === "all" || unit.type === typeFilter;

      // Beds filter
      let matchesBeds = true;
      if (bedsFilter !== "all") {
        const beds = String(unit.bedrooms);
        if (bedsFilter === "Studio") {
          matchesBeds = beds === "0" || beds.toLowerCase() === "studio";
        } else {
          const filterNum = parseInt(bedsFilter);
          const unitBeds = parseInt(beds);
          matchesBeds = unitBeds === filterNum;
        }
      }

      // Sales status filter
      const matchesSales = salesFilter === "all" || unit.salesStatus === salesFilter;

      // BCMS approved filter
      const matchesBcmsApproved =
        bcmsApprovedFilter === "all" ||
        (bcmsApprovedFilter === "yes" && unit.documentation?.bcmsApprovedDate) ||
        (bcmsApprovedFilter === "no" && !unit.documentation?.bcmsApprovedDate);

      return matchesType && matchesBeds && matchesSales && matchesBcmsApproved;
    });

    // Sort the filtered units
    return filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "unitNumber":
          comparison = a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true });
          break;
        case "type":
          comparison = a.type.localeCompare(b.type);
          break;
        case "bedrooms": {
          const bedsA = typeof a.bedrooms === "number" ? a.bedrooms : (a.bedrooms === "Studio" ? 0 : parseInt(String(a.bedrooms)) || 0);
          const bedsB = typeof b.bedrooms === "number" ? b.bedrooms : (b.bedrooms === "Studio" ? 0 : parseInt(String(b.bedrooms)) || 0);
          comparison = bedsA - bedsB;
          break;
        }
        case "area": {
          const areaA = a.size || 0;
          const areaB = b.size || 0;
          comparison = areaA - areaB;
          break;
        }
        case "constructionStatus":
          comparison = a.constructionStatus.localeCompare(b.constructionStatus);
          break;
        case "salesStatus":
          comparison = a.salesStatus.localeCompare(b.salesStatus);
          break;
        case "plannedBcmsDate": {
          const dateA = a.keyDates?.plannedBcms || "";
          const dateB = b.keyDates?.plannedBcms || "";
          comparison = dateA.localeCompare(dateB);
          break;
        }
        case "bcmsApproved": {
          const bcmsA = a.documentation?.bcmsApprovedDate || "";
          const bcmsB = b.documentation?.bcmsApprovedDate || "";
          comparison = bcmsA.localeCompare(bcmsB);
          break;
        }
        case "price":
          comparison = (a.soldPrice || a.listPrice) - (b.soldPrice || b.listPrice);
          break;
        case "notes":
          // Sort by notes count - we'll use 0 if no notes
          comparison = 0; // Notes sorting handled separately if needed
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [development, typeFilter, bedsFilter, salesFilter, bcmsApprovedFilter, sortField, sortDirection, refreshKey]);

  // Selection helpers
  const isAllSelected = filteredUnits.length > 0 && filteredUnits.every((u) => selectedUnitIds.has(u.unitNumber));
  const isSomeSelected = filteredUnits.some((u) => selectedUnitIds.has(u.unitNumber));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      // Deselect all filtered units
      const newSelection = new Set(selectedUnitIds);
      filteredUnits.forEach((u) => newSelection.delete(u.unitNumber));
      setSelectedUnitIds(newSelection);
    } else {
      // Select all filtered units
      const newSelection = new Set(selectedUnitIds);
      filteredUnits.forEach((u) => newSelection.add(u.unitNumber));
      setSelectedUnitIds(newSelection);
    }
  };

  const toggleUnitSelection = (unitNumber: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelection = new Set(selectedUnitIds);
    if (newSelection.has(unitNumber)) {
      newSelection.delete(unitNumber);
    } else {
      newSelection.add(unitNumber);
    }
    setSelectedUnitIds(newSelection);
  };

  const clearSelection = () => {
    setSelectedUnitIds(new Set());
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Calculate summary statistics - moved before conditional return to avoid hook order issues
  const stats = useMemo(() => {
    if (!development) {
      return {
        totalUnits: 0,
        gdv: 0,
        salesCompleteCount: 0,
        salesValueToDate: 0,
        contractedCount: 0,
        underOfferCount: 0,
        forSaleCount: 0,
        notReleasedCount: 0,
      };
    }
    const units = development.units;
    const totalUnits = units.length;
    const gdv = units.reduce((sum, u) => sum + (u.priceIncVat || u.listPrice || 0), 0);
    const salesComplete = units.filter((u) => u.salesStatus === "Complete");
    const salesCompleteCount = salesComplete.length;
    const salesValueToDate = salesComplete.reduce((sum, u) => sum + (u.priceIncVat || u.listPrice || 0), 0);
    const contractedCount = units.filter((u) => u.salesStatus === "Contracted").length;
    const underOfferCount = units.filter((u) => u.salesStatus === "Under Offer").length;
    const forSaleCount = units.filter((u) => u.salesStatus === "For Sale").length;
    const notReleasedCount = units.filter((u) => u.salesStatus === "Not Released").length;

    return {
      totalUnits,
      gdv,
      salesCompleteCount,
      salesValueToDate,
      contractedCount,
      underOfferCount,
      forSaleCount,
      notReleasedCount,
    };
  }, [development, refreshKey]);

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
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
        <div className="flex items-center justify-between">
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
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryStatBox
          label="Total"
          value={stats.totalUnits}
          type="count"
          color="cyan"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          }
        />
        <SummaryStatBox
          label="GDV"
          value={stats.gdv}
          type="currency"
          color="purple"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          }
        />
        <SummaryStatBox
          label="Sales Complete"
          value={stats.salesCompleteCount}
          type="count"
          color="emerald"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <SummaryStatBox
          label="Sales Value to Date"
          value={stats.salesValueToDate}
          type="currency"
          color="gold"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <SummaryStatBox
          label="Contracted"
          value={stats.contractedCount}
          type="count"
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <SummaryStatBox
          label="Under Offer"
          value={stats.underOfferCount}
          type="count"
          color="amber"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
            </svg>
          }
        />
        <SummaryStatBox
          label="For Sale"
          value={stats.forSaleCount}
          type="count"
          color="cyan"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          }
        />
        <SummaryStatBox
          label="Not Released"
          value={stats.notReleasedCount}
          type="count"
          color="gray"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }
        />
      </div>

      {/* Filters */}
      <div className="card p-5">
        <div className="flex flex-wrap items-end gap-4">
          {/* Type Filter */}
          <div className="min-w-[160px]">
            <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Unit Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="select"
            >
              <option value="all">All</option>
              {unitTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Beds Filter */}
          <div className="min-w-[120px]">
            <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Beds
            </label>
            <select
              value={bedsFilter}
              onChange={(e) => setBedsFilter(e.target.value)}
              className="select"
            >
              <option value="all">All</option>
              {bedroomOptions.map((beds) => (
                <option key={beds} value={beds}>
                  {beds}
                </option>
              ))}
            </select>
          </div>

          {/* Sales Status Filter */}
          <div className="min-w-[140px]">
            <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Sales Status
            </label>
            <select
              value={salesFilter}
              onChange={(e) => setSalesFilter(e.target.value)}
              className="select"
            >
              <option value="all">All</option>
              <option value="Not Released">Not Released</option>
              <option value="For Sale">For Sale</option>
              <option value="Under Offer">Under Offer</option>
              <option value="Contracted">Contracted</option>
              <option value="Complete">Complete</option>
            </select>
          </div>

          {/* BCMS Approved Filter */}
          <div className="min-w-[140px]">
            <label className="block font-display text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              BCMS Approved
            </label>
            <select
              value={bcmsApprovedFilter}
              onChange={(e) => setBcmsApprovedFilter(e.target.value)}
              className="select"
            >
              <option value="all">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          {/* Results count */}
          <div className="flex items-end ml-auto">
            <div className="px-4 py-3 rounded-lg bg-[var(--bg-deep)] border border-[var(--border-subtle)]">
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
                {can("bulkUpdate") && (
                  <th className="px-3 py-4 text-center w-12">
                    <button
                      onClick={toggleSelectAll}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        isAllSelected
                          ? "bg-[var(--accent-cyan)] border-[var(--accent-cyan)]"
                          : isSomeSelected
                          ? "border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/30"
                          : "border-[var(--border-subtle)] hover:border-[var(--accent-cyan)]"
                      }`}
                    >
                      {(isAllSelected || isSomeSelected) && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={isAllSelected ? "M5 13l4 4L19 7" : "M5 12h14"} />
                        </svg>
                      )}
                    </button>
                  </th>
                )}
                <th onClick={() => toggleSort("unitNumber")} className="px-3 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--accent-cyan)] transition-colors">
                  <span className="flex items-center">Unit Nr<SortIcon field="unitNumber" sortField={sortField} sortDirection={sortDirection} /></span>
                </th>
                <th onClick={() => toggleSort("type")} className="px-3 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--accent-cyan)] transition-colors">
                  <span className="flex items-center">Type<SortIcon field="type" sortField={sortField} sortDirection={sortDirection} /></span>
                </th>
                <th onClick={() => toggleSort("bedrooms")} className="px-3 py-4 text-center font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--accent-cyan)] transition-colors">
                  <span className="flex items-center justify-center">Beds<SortIcon field="bedrooms" sortField={sortField} sortDirection={sortDirection} /></span>
                </th>
                <th onClick={() => toggleSort("area")} className="px-3 py-4 text-right font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--accent-cyan)] transition-colors">
                  <span className="flex items-center justify-end">Area<SortIcon field="area" sortField={sortField} sortDirection={sortDirection} /></span>
                </th>
                <th onClick={() => toggleSort("constructionStatus")} className="px-3 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--accent-cyan)] transition-colors">
                  <span className="flex items-center">Construction<SortIcon field="constructionStatus" sortField={sortField} sortDirection={sortDirection} /></span>
                </th>
                <th onClick={() => toggleSort("salesStatus")} className="px-3 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--accent-cyan)] transition-colors">
                  <span className="flex items-center">Sales<SortIcon field="salesStatus" sortField={sortField} sortDirection={sortDirection} /></span>
                </th>
                <th onClick={() => toggleSort("plannedBcmsDate")} className="px-3 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--accent-cyan)] transition-colors">
                  <span className="flex items-center">Planned BCMS<SortIcon field="plannedBcmsDate" sortField={sortField} sortDirection={sortDirection} /></span>
                </th>
                <th onClick={() => toggleSort("bcmsApproved")} className="px-3 py-4 text-left font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--accent-cyan)] transition-colors">
                  <span className="flex items-center">BCMS Approved<SortIcon field="bcmsApproved" sortField={sortField} sortDirection={sortDirection} /></span>
                </th>
                <th onClick={() => toggleSort("price")} className="px-3 py-4 text-right font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--accent-cyan)] transition-colors">
                  <span className="flex items-center justify-end">Price<SortIcon field="price" sortField={sortField} sortDirection={sortDirection} /></span>
                </th>
                <th className="px-3 py-4 text-center font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUnits.map((unit, index) => {
                const isSelected = selectedUnitIds.has(unit.unitNumber);
                const unitSize = unit.size;
                const bedsDisplay = String(unit.bedrooms) === "0" || String(unit.bedrooms).toLowerCase() === "studio"
                  ? "Studio"
                  : `${unit.bedrooms} Bed`;
                return (
                <tr
                  key={unit.unitNumber}
                  onClick={() => setSelectedUnit(unit)}
                  className={`table-row cursor-pointer group ${isSelected ? "bg-[var(--accent-cyan)]/10" : ""}`}
                  style={{
                    animation: `fadeInUp 0.3s ease-out forwards`,
                    animationDelay: `${index * 0.03}s`,
                    opacity: 0,
                  }}
                >
                  {can("bulkUpdate") && (
                    <td className="px-3 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => toggleUnitSelection(unit.unitNumber, e)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-[var(--accent-cyan)] border-[var(--accent-cyan)]"
                            : "border-[var(--border-subtle)] hover:border-[var(--accent-cyan)]"
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </td>
                  )}
                  {/* Unit Number */}
                  <td className="px-3 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-cyan)] transition-colors">
                      {unit.unitNumber}
                    </span>
                  </td>
                  {/* Type */}
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                    {unit.type}
                  </td>
                  {/* Beds */}
                  <td className="px-3 py-4 whitespace-nowrap text-center">
                    <span className="font-mono text-sm text-[var(--text-primary)]">
                      {bedsDisplay}
                    </span>
                  </td>
                  {/* Area */}
                  <td className="px-3 py-4 whitespace-nowrap text-right">
                    <span className="font-mono text-sm text-[var(--text-secondary)]">
                      {unitSize ? `${unitSize} m²` : "-"}
                    </span>
                  </td>
                  {/* Construction Status */}
                  <td className="px-3 py-4 whitespace-nowrap">
                    <span className={constructionBadgeClasses[unit.constructionStatus]}>
                      {unit.constructionStatus}
                    </span>
                  </td>
                  {/* Sales Status */}
                  <td className="px-3 py-4 whitespace-nowrap">
                    <span className={salesBadgeClasses[unit.salesStatus]}>
                      {unit.salesStatus}
                    </span>
                  </td>
                  {/* Planned BCMS */}
                  <td className="px-3 py-4 whitespace-nowrap">
                    <span className="font-mono text-xs text-[var(--text-secondary)]">
                      {formatDate(unit.keyDates?.plannedBcms)}
                    </span>
                  </td>
                  {/* BCMS Approved */}
                  <td className="px-3 py-4 whitespace-nowrap">
                    <span className={`font-mono text-xs ${unit.documentation?.bcmsApprovedDate ? "text-[var(--accent-emerald)]" : "text-[var(--text-muted)]"}`}>
                      {unit.documentation?.bcmsApprovedDate ? formatDate(unit.documentation.bcmsApprovedDate) : "No"}
                    </span>
                  </td>
                  {/* Price */}
                  <td className="px-3 py-4 whitespace-nowrap text-right">
                    <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                      {unit.soldPrice
                        ? formatPrice(unit.soldPrice)
                        : unit.listPrice
                        ? formatPrice(unit.listPrice)
                        : "-"}
                    </span>
                    {unit.soldPrice && unit.soldPrice !== unit.listPrice && (
                      <span className="block font-mono text-xs text-[var(--text-muted)] line-through">
                        {formatPrice(unit.listPrice)}
                      </span>
                    )}
                  </td>
                  {/* Notes */}
                  <td className="px-3 py-4 whitespace-nowrap text-center">
                    {notesCounts.get(unit.unitNumber) ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)]">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="font-mono text-xs font-medium">{notesCounts.get(unit.unitNumber)}</span>
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">-</span>
                    )}
                  </td>
                </tr>
              );
              })}
              {filteredUnits.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center">
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
          developmentId={development.id}
          onClose={() => setSelectedUnit(null)}
          onSave={handleUnitSave}
        />
      )}

      {/* Bulk Update Toolbar - Only for users with bulkUpdate permission */}
      {can("bulkUpdate") && (
        <BulkUpdateToolbar
          selectedCount={selectedUnitIds.size}
          onBulkUpdate={() => setShowBulkUpdateModal(true)}
          onClearSelection={clearSelection}
        />
      )}

      {/* Bulk Update Modal */}
      {can("bulkUpdate") && showBulkUpdateModal && (
        <BulkUpdateModal
          developmentId={development.id}
          developmentName={development.name}
          selectedUnits={Array.from(selectedUnitIds)}
          onClose={() => setShowBulkUpdateModal(false)}
          onComplete={() => {
            setShowBulkUpdateModal(false);
            clearSelection();
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

function SummaryStatBox({
  label,
  value,
  type,
  color,
  icon,
}: {
  label: string;
  value: number;
  type: "count" | "currency";
  color: "cyan" | "gold" | "emerald" | "purple" | "blue" | "amber" | "gray";
  icon: React.ReactNode;
}) {
  const colorClasses = {
    cyan: {
      text: "text-[var(--accent-cyan)]",
      bg: "bg-[var(--accent-cyan)]/10",
      border: "border-[var(--accent-cyan)]/20",
    },
    gold: {
      text: "text-[var(--accent-gold-bright)]",
      bg: "bg-[var(--accent-gold-bright)]/10",
      border: "border-[var(--accent-gold-bright)]/20",
    },
    emerald: {
      text: "text-[var(--accent-emerald)]",
      bg: "bg-[var(--accent-emerald)]/10",
      border: "border-[var(--accent-emerald)]/20",
    },
    purple: {
      text: "text-[var(--accent-purple)]",
      bg: "bg-[var(--accent-purple)]/10",
      border: "border-[var(--accent-purple)]/20",
    },
    blue: {
      text: "text-[#60a5fa]",
      bg: "bg-[#60a5fa]/10",
      border: "border-[#60a5fa]/20",
    },
    amber: {
      text: "text-[#fbbf24]",
      bg: "bg-[#fbbf24]/10",
      border: "border-[#fbbf24]/20",
    },
    gray: {
      text: "text-[var(--text-muted)]",
      bg: "bg-[var(--text-muted)]/10",
      border: "border-[var(--text-muted)]/20",
    },
  };

  const formatValue = () => {
    if (type === "currency") {
      return new Intl.NumberFormat("en-IE", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    return value.toString();
  };

  return (
    <div className={`card p-4 border ${colorClasses[color].border}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-display text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
            {label}
          </p>
          <p className={`font-mono text-xl font-bold ${colorClasses[color].text}`}>
            {formatValue()}
          </p>
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color].bg} ${colorClasses[color].text}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
