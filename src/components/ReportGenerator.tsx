import { useState, useMemo, useCallback } from "react";
import {
  FileText,
  Filter,
  ChevronRight,
  Search,
  X,
  FileSpreadsheet,
  File,
  Monitor,
  LayoutDashboard,
  ShoppingCart,
  HardHat,
  DollarSign,
  FileCheck,
  TrendingUp,
  GitCompare,
  Wrench,
  Calendar,
  Building2,
  List,
  PieChart,
  Bed,
  Home,
  Users,
  CheckCircle,
  Clock,
  Hammer,
  BarChart3,
  Gift,
  Receipt,
  Ruler,
  FileWarning,
  FilePen,
  ClipboardCheck,
  AlertTriangle,
  FolderOpen,
  Target,
  Package,
  CalendarRange,
  CalendarDays,
  Layers,
  Presentation,
  CalendarCheck,
  ClipboardList,
  CheckSquare,
  GitBranch,
  Banknote,
  CalendarClock,
} from "lucide-react";
import type { Development } from "../types";
import type { ReportTemplate, ReportFilter, ReportFormat, ReportCategory } from "../types/report";
import { REPORT_TEMPLATES, REPORT_CATEGORIES } from "../data/reportTemplates";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

interface ReportGeneratorProps {
  developments: Development[];
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  ShoppingCart,
  HardHat,
  DollarSign,
  FileCheck,
  TrendingUp,
  GitCompare,
  Wrench,
  Calendar,
  Building2,
  List,
  PieChart,
  Bed,
  Home,
  Users,
  CheckCircle,
  Clock,
  Hammer,
  BarChart3,
  Gift,
  Receipt,
  Ruler,
  FileWarning,
  FilePen,
  ClipboardCheck,
  AlertTriangle,
  FolderOpen,
  Target,
  Package,
  CalendarRange,
  CalendarDays,
  Layers,
  Filter,
  FileText,
  Presentation,
  CalendarCheck,
  ClipboardList,
  CheckSquare,
  GitBranch,
  Banknote,
  CalendarClock,
  FileSpreadsheet,
  File,
  Monitor,
};

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#64748b"];

export function ReportGenerator({ developments }: ReportGeneratorProps) {
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [filters, setFilters] = useState<ReportFilter>({});
  const [showPreview, setShowPreview] = useState(false);
  const [exportFormat, setExportFormat] = useState<ReportFormat>("screen");

  // Flatten all units with development info
  const allUnits = useMemo(() => {
    return developments.flatMap((dev) =>
      dev.units.map((unit) => ({
        ...unit,
        developmentId: dev.id,
        developmentName: dev.name,
        projectNumber: dev.projectNumber,
      }))
    );
  }, [developments]);

  // Filter templates based on category and search
  const filteredTemplates = useMemo(() => {
    return REPORT_TEMPLATES.filter((template) => {
      const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
      const matchesSearch =
        searchTerm === "" ||
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchTerm]);

  // Apply filters to units
  const filteredUnits = useMemo(() => {
    let result = [...allUnits];

    if (filters.developments?.length) {
      result = result.filter((u) => filters.developments!.includes(u.developmentId));
    }
    if (filters.salesStatus?.length) {
      result = result.filter((u) => filters.salesStatus!.includes(u.salesStatus));
    }
    if (filters.constructionStatus?.length) {
      result = result.filter((u) => filters.constructionStatus!.includes(u.constructionStatus));
    }
    if (filters.unitTypes?.length) {
      result = result.filter((u) => filters.unitTypes!.includes(u.type));
    }
    if (filters.purchaserTypes?.length) {
      result = result.filter((u) => u.purchaserType && filters.purchaserTypes!.includes(u.purchaserType));
    }
    if (filters.partV !== undefined) {
      result = result.filter((u) => u.partV === filters.partV);
    }
    if (filters.priceRange?.min !== undefined) {
      result = result.filter((u) => u.listPrice >= filters.priceRange!.min!);
    }
    if (filters.priceRange?.max !== undefined) {
      result = result.filter((u) => u.listPrice <= filters.priceRange!.max!);
    }
    if (filters.bedroomRange?.min !== undefined) {
      result = result.filter((u) => {
        const beds = typeof u.bedrooms === "number" ? u.bedrooms : (u.bedrooms === "Studio" ? 0 : parseInt(u.bedrooms) || 0);
        return beds >= filters.bedroomRange!.min!;
      });
    }
    if (filters.bedroomRange?.max !== undefined) {
      result = result.filter((u) => {
        const beds = typeof u.bedrooms === "number" ? u.bedrooms : (u.bedrooms === "Studio" ? 0 : parseInt(u.bedrooms) || 0);
        return beds <= filters.bedroomRange!.max!;
      });
    }

    return result;
  }, [allUnits, filters]);

  // Generate report data based on template
  const reportData = useMemo(() => {
    if (!selectedTemplate) return null;

    // Calculate summary metrics
    const totalUnits = filteredUnits.length;
    const totalValue = filteredUnits.reduce((sum, u) => sum + (u.listPrice || 0), 0);
    const soldUnits = filteredUnits.filter((u) => u.salesStatus === "Complete").length;
    const totalRevenue = filteredUnits
      .filter((u) => u.salesStatus === "Complete")
      .reduce((sum, u) => sum + (u.soldPrice || u.listPrice || 0), 0);

    // Sales status breakdown
    const salesStatusCounts = filteredUnits.reduce(
      (acc, u) => {
        acc[u.salesStatus] = (acc[u.salesStatus] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Construction status breakdown
    const constructionStatusCounts = filteredUnits.reduce(
      (acc, u) => {
        acc[u.constructionStatus] = (acc[u.constructionStatus] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // By development
    const byDevelopment = developments.map((dev) => {
      const devUnits = filteredUnits.filter((u) => u.developmentId === dev.id);
      return {
        name: dev.name,
        totalUnits: devUnits.length,
        notReleased: devUnits.filter((u) => u.salesStatus === "Not Released").length,
        forSale: devUnits.filter((u) => u.salesStatus === "For Sale").length,
        underOffer: devUnits.filter((u) => u.salesStatus === "Under Offer").length,
        contracted: devUnits.filter((u) => u.salesStatus === "Contracted").length,
        complete: devUnits.filter((u) => u.salesStatus === "Complete").length,
        revenue: devUnits.filter((u) => u.salesStatus === "Complete").reduce((sum, u) => sum + (u.soldPrice || u.listPrice || 0), 0),
        notStarted: devUnits.filter((u) => u.constructionStatus === "Not Started").length,
        inProgress: devUnits.filter((u) => u.constructionStatus === "In Progress").length,
        constructionComplete: devUnits.filter((u) => u.constructionStatus === "Complete").length,
      };
    });

    // By unit type
    const unitTypes = [...new Set(filteredUnits.map((u) => u.type))];
    const byUnitType = unitTypes.map((type) => {
      const typeUnits = filteredUnits.filter((u) => u.type === type);
      return {
        type,
        total: typeUnits.length,
        sold: typeUnits.filter((u) => u.salesStatus === "Complete").length,
        avgPrice: typeUnits.length > 0 ? typeUnits.reduce((sum, u) => sum + u.listPrice, 0) / typeUnits.length : 0,
      };
    });

    // By bedroom count
    const bedroomCounts = [...new Set(filteredUnits.map((u) => u.bedrooms))].sort((a, b) => {
      const numA = typeof a === "number" ? a : (a === "Studio" ? 0 : parseInt(a) || 0);
      const numB = typeof b === "number" ? b : (b === "Studio" ? 0 : parseInt(b) || 0);
      return numA - numB;
    });
    const byBedrooms = bedroomCounts.map((beds) => {
      const bedUnits = filteredUnits.filter((u) => u.bedrooms === beds);
      return {
        bedrooms: beds,
        total: bedUnits.length,
        sold: bedUnits.filter((u) => u.salesStatus === "Complete").length,
        available: bedUnits.filter((u) => u.salesStatus === "For Sale").length,
        avgPrice: bedUnits.length > 0 ? bedUnits.reduce((sum, u) => sum + u.listPrice, 0) / bedUnits.length : 0,
      };
    });

    // Documentation stats
    const bcmsComplete = filteredUnits.filter((u) => u.documentation?.bcmsReceived).length;
    const landRegComplete = filteredUnits.filter((u) => u.documentation?.landRegistryApproved).length;
    const homebondComplete = filteredUnits.filter((u) => u.documentation?.homebondReceived).length;
    const contractsSigned = filteredUnits.filter((u) => u.documentation?.contractSigned).length;

    return {
      summary: {
        totalUnits,
        totalValue,
        soldUnits,
        totalRevenue,
        avgPrice: totalUnits > 0 ? totalValue / totalUnits : 0,
        salesRate: totalUnits > 0 ? (soldUnits / totalUnits) * 100 : 0,
      },
      salesStatusCounts,
      constructionStatusCounts,
      byDevelopment,
      byUnitType,
      byBedrooms,
      documentation: {
        bcmsComplete,
        landRegComplete,
        homebondComplete,
        contractsSigned,
        bcmsPending: totalUnits - bcmsComplete,
        landRegPending: totalUnits - landRegComplete,
        homebondPending: totalUnits - homebondComplete,
      },
      units: filteredUnits,
    };
  }, [selectedTemplate, filteredUnits, developments]);

  // Get icon component
  const getIcon = (iconName: string, className?: string) => {
    const IconComponent = ICON_MAP[iconName] || FileText;
    return <IconComponent className={className} />;
  };

  // Handle template selection
  const handleSelectTemplate = useCallback(
    (template: ReportTemplate) => {
      setSelectedTemplate(template);
      setFilters(template.defaultFilters || {});
      setExportFormat(template.defaultFormat);
      setShowPreview(true);
    },
    []
  );

  // Format currency - moved before exportToExcel which uses it
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
  }, []);

  // Export to Excel
  const exportToExcel = useCallback(async () => {
    if (!reportData || !selectedTemplate) return;

    const wb = new ExcelJS.Workbook();

    // Summary sheet
    const summarySheet = wb.addWorksheet("Summary");
    summarySheet.addRow(["Report:", selectedTemplate.name]);
    summarySheet.addRow(["Generated:", new Date().toLocaleString()]);
    summarySheet.addRow([""]);
    summarySheet.addRow(["Summary Metrics"]);
    summarySheet.addRow(["Total Units", reportData.summary.totalUnits]);
    summarySheet.addRow(["Total Value", formatCurrency(reportData.summary.totalValue)]);
    summarySheet.addRow(["Units Sold", reportData.summary.soldUnits]);
    summarySheet.addRow(["Total Revenue", formatCurrency(reportData.summary.totalRevenue)]);
    summarySheet.addRow(["Average Price", formatCurrency(reportData.summary.avgPrice)]);
    summarySheet.addRow(["Sales Rate", `${reportData.summary.salesRate.toFixed(1)}%`]);

    // Units sheet
    const unitsSheet = wb.addWorksheet("Units");
    unitsSheet.columns = [
      { header: "Development", key: "Development", width: 25 },
      { header: "Unit Number", key: "Unit Number", width: 12 },
      { header: "Type", key: "Type", width: 15 },
      { header: "Bedrooms", key: "Bedrooms", width: 10 },
      { header: "Construction Status", key: "Construction Status", width: 18 },
      { header: "Sales Status", key: "Sales Status", width: 15 },
      { header: "List Price", key: "List Price", width: 15 },
      { header: "Sold Price", key: "Sold Price", width: 15 },
      { header: "Purchaser", key: "Purchaser", width: 20 },
      { header: "Purchaser Type", key: "Purchaser Type", width: 15 },
    ];
    reportData.units.forEach((u) => {
      unitsSheet.addRow({
        Development: u.developmentName,
        "Unit Number": u.unitNumber,
        Type: u.type,
        Bedrooms: u.bedrooms,
        "Construction Status": u.constructionStatus,
        "Sales Status": u.salesStatus,
        "List Price": u.listPrice,
        "Sold Price": u.soldPrice || "",
        Purchaser: u.purchaserName || "",
        "Purchaser Type": u.purchaserType || "",
      });
    });
    unitsSheet.getRow(1).font = { bold: true };

    // By Development sheet
    const devSheet = wb.addWorksheet("By Development");
    if (reportData.byDevelopment.length > 0) {
      const columns = Object.keys(reportData.byDevelopment[0]);
      devSheet.columns = columns.map((key) => ({ header: key, key, width: 15 }));
      reportData.byDevelopment.forEach((row) => {
        devSheet.addRow(row);
      });
      devSheet.getRow(1).font = { bold: true };
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `${selectedTemplate.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`);
  }, [reportData, selectedTemplate, formatCurrency]);

  // Render template card
  const renderTemplateCard = (template: ReportTemplate) => {
    const category = REPORT_CATEGORIES.find((c) => c.id === template.category);
    return (
      <div
        key={template.id}
        className={`bg-white rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md hover:border-indigo-300 ${
          selectedTemplate?.id === template.id ? "border-indigo-500 ring-2 ring-indigo-200" : "border-gray-200"
        }`}
        onClick={() => handleSelectTemplate(template)}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: `${category?.color}20` }}>
            {getIcon(template.icon, `h-5 w-5`)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{template.name}</h3>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{template.description}</p>
            <div className="flex items-center gap-2 mt-2">
              {template.availableFormats.map((format) => (
                <span
                  key={format}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
                >
                  {format.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
      </div>
    );
  };

  // Render filters panel
  const renderFilters = () => {
    const salesStatuses = ["Not Released", "For Sale", "Under Offer", "Contracted", "Complete"];
    const constructionStatuses = ["Not Started", "In Progress", "Complete"];
    const unitTypes = [...new Set(allUnits.map((u) => u.type))];
    const purchaserTypes = ["Private", "Council", "AHB", "Other"];

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Report Filters
          </h3>
          <button
            onClick={() => setFilters({})}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            Clear All
          </button>
        </div>

        <div className="space-y-4">
          {/* Development Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Developments</label>
            <select
              multiple
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={filters.developments || []}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  developments: Array.from(e.target.selectedOptions, (o) => o.value),
                })
              }
            >
              {developments.map((dev) => (
                <option key={dev.id} value={dev.id}>
                  {dev.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sales Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sales Status</label>
            <div className="flex flex-wrap gap-2">
              {salesStatuses.map((status) => (
                <label
                  key={status}
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${
                    filters.salesStatus?.includes(status)
                      ? "bg-indigo-100 text-indigo-800"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={filters.salesStatus?.includes(status) || false}
                    onChange={(e) => {
                      const current = filters.salesStatus || [];
                      setFilters({
                        ...filters,
                        salesStatus: e.target.checked
                          ? [...current, status]
                          : current.filter((s) => s !== status),
                      });
                    }}
                  />
                  {status}
                </label>
              ))}
            </div>
          </div>

          {/* Construction Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Construction Status</label>
            <div className="flex flex-wrap gap-2">
              {constructionStatuses.map((status) => (
                <label
                  key={status}
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${
                    filters.constructionStatus?.includes(status)
                      ? "bg-amber-100 text-amber-800"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={filters.constructionStatus?.includes(status) || false}
                    onChange={(e) => {
                      const current = filters.constructionStatus || [];
                      setFilters({
                        ...filters,
                        constructionStatus: e.target.checked
                          ? [...current, status]
                          : current.filter((s) => s !== status),
                      });
                    }}
                  />
                  {status}
                </label>
              ))}
            </div>
          </div>

          {/* Unit Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit Types</label>
            <div className="flex flex-wrap gap-2">
              {unitTypes.map((type) => (
                <label
                  key={type}
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${
                    filters.unitTypes?.includes(type)
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={filters.unitTypes?.includes(type) || false}
                    onChange={(e) => {
                      const current = filters.unitTypes || [];
                      setFilters({
                        ...filters,
                        unitTypes: e.target.checked
                          ? [...current, type]
                          : current.filter((t) => t !== type),
                      });
                    }}
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>

          {/* Purchaser Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchaser Type</label>
            <div className="flex flex-wrap gap-2">
              {purchaserTypes.map((type) => (
                <label
                  key={type}
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${
                    filters.purchaserTypes?.includes(type)
                      ? "bg-purple-100 text-purple-800"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={filters.purchaserTypes?.includes(type) || false}
                    onChange={(e) => {
                      const current = filters.purchaserTypes || [];
                      setFilters({
                        ...filters,
                        purchaserTypes: e.target.checked
                          ? [...current, type]
                          : current.filter((t) => t !== type),
                      });
                    }}
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>

          {/* Part V Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Part V</label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="partV"
                  className="form-radio text-indigo-600"
                  checked={filters.partV === undefined}
                  onChange={() => setFilters({ ...filters, partV: undefined })}
                />
                <span className="ml-2 text-sm text-gray-700">All</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="partV"
                  className="form-radio text-indigo-600"
                  checked={filters.partV === true}
                  onChange={() => setFilters({ ...filters, partV: true })}
                />
                <span className="ml-2 text-sm text-gray-700">Part V Only</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="partV"
                  className="form-radio text-indigo-600"
                  checked={filters.partV === false}
                  onChange={() => setFilters({ ...filters, partV: false })}
                />
                <span className="ml-2 text-sm text-gray-700">Non-Part V</span>
              </label>
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={filters.priceRange?.min || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    priceRange: { ...filters.priceRange, min: e.target.value ? Number(e.target.value) : undefined },
                  })
                }
              />
              <span className="text-gray-500">to</span>
              <input
                type="number"
                placeholder="Max"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={filters.priceRange?.max || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    priceRange: { ...filters.priceRange, max: e.target.value ? Number(e.target.value) : undefined },
                  })
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render report preview
  const renderPreview = () => {
    if (!selectedTemplate || !reportData) return null;

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Preview Header */}
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getIcon(selectedTemplate.icon, "h-5 w-5 text-gray-600")}
              <div>
                <h2 className="font-semibold text-gray-900">{selectedTemplate.name}</h2>
                <p className="text-sm text-gray-500">
                  {filteredUnits.length} units from {developments.length} developments
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Export Format Select */}
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as ReportFormat)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {selectedTemplate.availableFormats.map((format) => (
                  <option key={format} value={format}>
                    {format.toUpperCase()}
                  </option>
                ))}
              </select>
              {/* Export Button */}
              {exportFormat === "excel" && (
                <button
                  onClick={exportToExcel}
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export Excel
                </button>
              )}
              {exportFormat === "pdf" && (
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  <File className="h-4 w-4" />
                  Export PDF
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Preview Content */}
        <div className="p-6 space-y-6 print:p-0">
          {/* Summary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Total Units</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.summary.totalUnits}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(reportData.summary.totalValue)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Units Sold</p>
              <p className="text-2xl font-bold text-green-600">{reportData.summary.soldUnits}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Revenue</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(reportData.summary.totalRevenue)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Avg Price</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(reportData.summary.avgPrice)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Sales Rate</p>
              <p className="text-2xl font-bold text-indigo-600">{reportData.summary.salesRate.toFixed(1)}%</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Status Chart */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-4">Sales Status Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPieChart>
                  <Pie
                    data={Object.entries(reportData.salesStatusCounts).map(([name, value], index) => ({
                      name,
                      value,
                      fill: COLORS[index % COLORS.length],
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                  >
                    {Object.entries(reportData.salesStatusCounts).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            {/* By Development Chart */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-4">Units by Development</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={reportData.byDevelopment}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="forSale" stackId="a" fill="#3b82f6" name="For Sale" />
                  <Bar dataKey="underOffer" stackId="a" fill="#f59e0b" name="Under Offer" />
                  <Bar dataKey="contracted" stackId="a" fill="#8b5cf6" name="Contracted" />
                  <Bar dataKey="complete" stackId="a" fill="#22c55e" name="Complete" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Development Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Development Summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Development</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">For Sale</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Under Offer</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Contracted</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Complete</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.byDevelopment.map((dev) => (
                    <tr key={dev.name} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{dev.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-right">{dev.totalUnits}</td>
                      <td className="px-4 py-3 text-sm text-blue-600 text-right">{dev.forSale}</td>
                      <td className="px-4 py-3 text-sm text-amber-600 text-right">{dev.underOffer}</td>
                      <td className="px-4 py-3 text-sm text-purple-600 text-right">{dev.contracted}</td>
                      <td className="px-4 py-3 text-sm text-green-600 text-right">{dev.complete}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{formatCurrency(dev.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">Total</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{reportData.summary.totalUnits}</td>
                    <td className="px-4 py-3 text-sm font-bold text-blue-600 text-right">
                      {reportData.byDevelopment.reduce((sum, d) => sum + d.forSale, 0)}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-amber-600 text-right">
                      {reportData.byDevelopment.reduce((sum, d) => sum + d.underOffer, 0)}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-purple-600 text-right">
                      {reportData.byDevelopment.reduce((sum, d) => sum + d.contracted, 0)}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-green-600 text-right">{reportData.summary.soldUnits}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{formatCurrency(reportData.summary.totalRevenue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Unit Details Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Unit Details</h3>
              <span className="text-sm text-gray-500">{filteredUnits.length} units</span>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Development</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Beds</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Construction</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchaser</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUnits.slice(0, 100).map((unit, index) => (
                    <tr key={`${unit.developmentId}-${unit.unitNumber}-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">{unit.developmentName}</td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{unit.unitNumber}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{unit.type}</td>
                      <td className="px-4 py-2 text-sm text-gray-500 text-center">{unit.bedrooms}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            unit.constructionStatus === "Complete"
                              ? "bg-green-100 text-green-800"
                              : unit.constructionStatus === "In Progress"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {unit.constructionStatus}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            unit.salesStatus === "Complete"
                              ? "bg-green-100 text-green-800"
                              : unit.salesStatus === "Contracted"
                              ? "bg-purple-100 text-purple-800"
                              : unit.salesStatus === "Under Offer"
                              ? "bg-amber-100 text-amber-800"
                              : unit.salesStatus === "For Sale"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {unit.salesStatus}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                        {formatCurrency(unit.soldPrice || unit.listPrice)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">{unit.purchaserName || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUnits.length > 100 && (
                <div className="px-4 py-3 bg-gray-50 text-center text-sm text-gray-500">
                  Showing first 100 of {filteredUnits.length} units. Export to Excel for full data.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Report Generator</h1>
          <p className="mt-2 text-gray-600">
            Choose from {REPORT_TEMPLATES.length} pre-built templates or create custom reports
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Template Selection */}
          <div className="lg:col-span-1 space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search reports..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-3">Categories</h3>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedCategory === "all"
                      ? "bg-indigo-100 text-indigo-800"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  All Reports ({REPORT_TEMPLATES.length})
                </button>
                {REPORT_CATEGORIES.map((category) => {
                  const count = REPORT_TEMPLATES.filter((t) => t.category === category.id).length;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id as ReportCategory)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                        selectedCategory === category.id
                          ? "bg-indigo-100 text-indigo-800"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {getIcon(category.icon, "h-4 w-4")}
                      {category.name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Template List */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredTemplates.map((template) => renderTemplateCard(template))}
              {filteredTemplates.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No reports found matching your criteria
                </div>
              )}
            </div>
          </div>

          {/* Right Content - Filters and Preview */}
          <div className="lg:col-span-2 space-y-6">
            {selectedTemplate ? (
              <>
                {/* Filters */}
                {renderFilters()}

                {/* Preview */}
                {showPreview && renderPreview()}
              </>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Select a Report Template</h3>
                <p className="mt-2 text-gray-500">
                  Choose a template from the list to configure and generate your report
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
