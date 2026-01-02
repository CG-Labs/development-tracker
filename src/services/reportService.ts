import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { developments } from "../data/realDevelopments";
import type { Development, Unit } from "../types";

// Types
export type ReportType = "portfolio" | "development" | "pipeline" | "documentation";
export type ReportFormat = "pdf" | "excel" | "both";

export interface ReportOptions {
  type: ReportType;
  format: ReportFormat;
  developmentId?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface SalesByMonth {
  month: string;
  unitsSold: number;
  revenue: number;
}

// Formatting helpers
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateShort(dateString: string | undefined): string {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

function getReportTimestamp(): string {
  return new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Calculate stats for a development
function getDevelopmentStats(dev: Development) {
  const units = dev.units;
  const totalUnits = units.length;
  const gdv = units.reduce((sum, u) => sum + (u.priceIncVat || u.listPrice || 0), 0);
  const salesComplete = units.filter((u) => u.salesStatus === "Complete");
  const salesCompleteCount = salesComplete.length;
  const salesValue = salesComplete.reduce((sum, u) => sum + (u.soldPrice || u.listPrice || 0), 0);
  const contractedCount = units.filter((u) => u.salesStatus === "Contracted").length;
  const underOfferCount = units.filter((u) => u.salesStatus === "Under Offer").length;
  const forSaleCount = units.filter((u) => u.salesStatus === "For Sale").length;
  const notReleasedCount = units.filter((u) => u.salesStatus === "Not Released").length;
  const percentComplete = totalUnits > 0 ? Math.round((salesCompleteCount / totalUnits) * 100) : 0;

  return {
    totalUnits,
    gdv,
    salesCompleteCount,
    salesValue,
    contractedCount,
    underOfferCount,
    forSaleCount,
    notReleasedCount,
    percentComplete,
  };
}

// Get portfolio-wide stats
function getPortfolioStats() {
  let totalUnits = 0;
  let gdv = 0;
  let salesCompleteCount = 0;
  let salesValue = 0;
  let contractedCount = 0;
  let underOfferCount = 0;
  let forSaleCount = 0;
  let notReleasedCount = 0;

  developments.forEach((dev) => {
    const stats = getDevelopmentStats(dev);
    totalUnits += stats.totalUnits;
    gdv += stats.gdv;
    salesCompleteCount += stats.salesCompleteCount;
    salesValue += stats.salesValue;
    contractedCount += stats.contractedCount;
    underOfferCount += stats.underOfferCount;
    forSaleCount += stats.forSaleCount;
    notReleasedCount += stats.notReleasedCount;
  });

  return {
    totalDevelopments: developments.length,
    totalUnits,
    gdv,
    salesCompleteCount,
    salesValue,
    contractedCount,
    underOfferCount,
    forSaleCount,
    notReleasedCount,
  };
}

// Get sales by month for the last 12 months
function getSalesByMonth(): SalesByMonth[] {
  const months: SalesByMonth[] = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });

    let unitsSold = 0;
    let revenue = 0;

    developments.forEach((dev) => {
      dev.units.forEach((unit) => {
        if (unit.salesStatus === "Complete" && unit.documentation?.saleClosedDate) {
          const saleDate = new Date(unit.documentation.saleClosedDate);
          const saleMonthKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, "0")}`;
          if (saleMonthKey === monthKey) {
            unitsSold++;
            revenue += unit.soldPrice || unit.listPrice || 0;
          }
        }
      });
    });

    months.push({ month: monthLabel, unitsSold, revenue });
  }

  return months;
}

// Get units with missing documentation
function getMissingDocumentation() {
  const missingBcms: { dev: string; unit: Unit }[] = [];
  const missingLandRegistry: { dev: string; unit: Unit }[] = [];
  const missingHomebond: { dev: string; unit: Unit }[] = [];
  const missingContracts: { dev: string; unit: Unit }[] = [];

  developments.forEach((dev) => {
    dev.units.forEach((unit) => {
      // Only check units that are sold or contracted
      if (unit.salesStatus === "Complete" || unit.salesStatus === "Contracted") {
        if (!unit.documentation?.bcmsReceived) {
          missingBcms.push({ dev: dev.name, unit });
        }
        if (!unit.documentation?.landRegistryApproved) {
          missingLandRegistry.push({ dev: dev.name, unit });
        }
        if (!unit.documentation?.homebondReceived) {
          missingHomebond.push({ dev: dev.name, unit });
        }
        if (!unit.documentation?.contractSigned) {
          missingContracts.push({ dev: dev.name, unit });
        }
      }
    });
  });

  return { missingBcms, missingLandRegistry, missingHomebond, missingContracts };
}

// PDF Styling helpers
function addPdfHeader(doc: jsPDF, title: string, subtitle?: string) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Company header area
  doc.setFillColor(15, 23, 42); // Dark blue
  doc.rect(0, 0, pageWidth, 35, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 18);

  // Subtitle
  if (subtitle) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, 14, 28);
  }

  // Date on right side
  doc.setFontSize(10);
  doc.text(formatDate(new Date()), pageWidth - 14, 18, { align: "right" });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  return 45; // Return starting Y position for content
}

function addPdfFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);

    // Page number
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: "center" });

    // Timestamp
    doc.text(`Generated: ${getReportTimestamp()}`, 14, pageHeight - 10);

    // Company name placeholder
    doc.text("DevTrack Portfolio Manager", pageWidth - 14, pageHeight - 10, { align: "right" });
  }
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(title, 14, y);
  return y + 8;
}

// ==========================================
// REPORT 1: Portfolio Summary Report
// ==========================================

function generatePortfolioSummaryPdf(): jsPDF {
  const doc = new jsPDF({ orientation: "landscape" });
  const stats = getPortfolioStats();
  const salesByMonth = getSalesByMonth();

  let y = addPdfHeader(doc, "Portfolio Summary Report", `${stats.totalDevelopments} Developments | ${stats.totalUnits} Units`);

  // Section 1: Overall Stats
  y = addSectionTitle(doc, "Overall Portfolio Statistics", y);

  const statsData = [
    ["Total Developments", stats.totalDevelopments.toString()],
    ["Total Units", stats.totalUnits.toString()],
    ["Gross Development Value (GDV)", formatCurrency(stats.gdv)],
    ["Sales Complete", `${stats.salesCompleteCount} units (${formatCurrency(stats.salesValue)})`],
    ["Contracted", stats.contractedCount.toString()],
    ["Under Offer", stats.underOfferCount.toString()],
    ["For Sale", stats.forSaleCount.toString()],
    ["Not Released", stats.notReleasedCount.toString()],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: statsData,
    theme: "striped",
    headStyles: { fillColor: [6, 182, 212], textColor: [255, 255, 255] },
    margin: { left: 14, right: 14 },
    tableWidth: 120,
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  // Section 2: Development Breakdown
  y = addSectionTitle(doc, "Development Breakdown", y);

  const devData = developments.map((dev) => {
    const devStats = getDevelopmentStats(dev);
    return [
      dev.name,
      devStats.totalUnits.toString(),
      formatCurrency(devStats.gdv),
      devStats.salesCompleteCount.toString(),
      formatCurrency(devStats.salesValue),
      `${devStats.percentComplete}%`,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["Development", "Units", "GDV", "Sales Complete", "Sales Value", "% Complete"]],
    body: devData,
    theme: "striped",
    headStyles: { fillColor: [6, 182, 212], textColor: [255, 255, 255] },
    margin: { left: 14, right: 14 },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  // Check if we need a new page for sales by month
  if (y > 150) {
    doc.addPage();
    y = 20;
  }

  // Section 3: Sales by Month
  y = addSectionTitle(doc, "Sales by Month (Last 12 Months)", y);

  const monthData = salesByMonth.map((m) => [m.month, m.unitsSold.toString(), formatCurrency(m.revenue)]);

  autoTable(doc, {
    startY: y,
    head: [["Month", "Units Sold", "Revenue"]],
    body: monthData,
    theme: "striped",
    headStyles: { fillColor: [6, 182, 212], textColor: [255, 255, 255] },
    margin: { left: 14, right: 14 },
    tableWidth: 150,
  });

  addPdfFooter(doc);
  return doc;
}

function generatePortfolioSummaryExcel(): XLSX.WorkBook {
  const stats = getPortfolioStats();
  const salesByMonth = getSalesByMonth();
  const wb = XLSX.utils.book_new();

  // Sheet 1: Overall Stats
  const statsSheet = XLSX.utils.aoa_to_sheet([
    ["Portfolio Summary Report", formatDate(new Date())],
    [],
    ["OVERALL STATISTICS"],
    ["Metric", "Value"],
    ["Total Developments", stats.totalDevelopments],
    ["Total Units", stats.totalUnits],
    ["Gross Development Value (GDV)", stats.gdv],
    ["Sales Complete (Count)", stats.salesCompleteCount],
    ["Sales Complete (Value)", stats.salesValue],
    ["Contracted", stats.contractedCount],
    ["Under Offer", stats.underOfferCount],
    ["For Sale", stats.forSaleCount],
    ["Not Released", stats.notReleasedCount],
  ]);
  XLSX.utils.book_append_sheet(wb, statsSheet, "Summary");

  // Sheet 2: Development Breakdown
  const devData = developments.map((dev) => {
    const devStats = getDevelopmentStats(dev);
    return {
      Development: dev.name,
      "Total Units": devStats.totalUnits,
      GDV: devStats.gdv,
      "Sales Complete": devStats.salesCompleteCount,
      "Sales Value": devStats.salesValue,
      "% Complete": devStats.percentComplete,
    };
  });
  const devSheet = XLSX.utils.json_to_sheet(devData);
  XLSX.utils.book_append_sheet(wb, devSheet, "Developments");

  // Sheet 3: Sales by Month
  const monthSheet = XLSX.utils.json_to_sheet(
    salesByMonth.map((m) => ({
      Month: m.month,
      "Units Sold": m.unitsSold,
      Revenue: m.revenue,
    }))
  );
  XLSX.utils.book_append_sheet(wb, monthSheet, "Sales by Month");

  return wb;
}

// ==========================================
// REPORT 2: Development Detail Report
// ==========================================

function generateDevelopmentDetailPdf(developmentId: string): jsPDF | null {
  const development = developments.find((d) => d.id === developmentId);
  if (!development) return null;

  const doc = new jsPDF({ orientation: "landscape" });
  const stats = getDevelopmentStats(development);

  let y = addPdfHeader(doc, development.name, `Status Report | ${development.projectNumber}`);

  // Development Summary Stats
  y = addSectionTitle(doc, "Development Summary", y);

  const summaryData = [
    ["Total Units", stats.totalUnits.toString()],
    ["GDV", formatCurrency(stats.gdv)],
    ["Sales Complete", `${stats.salesCompleteCount} (${formatCurrency(stats.salesValue)})`],
    ["Contracted", stats.contractedCount.toString()],
    ["Under Offer", stats.underOfferCount.toString()],
    ["For Sale", stats.forSaleCount.toString()],
    ["Not Released", stats.notReleasedCount.toString()],
    ["Completion Rate", `${stats.percentComplete}%`],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: summaryData,
    theme: "striped",
    headStyles: { fillColor: [6, 182, 212], textColor: [255, 255, 255] },
    margin: { left: 14, right: 14 },
    tableWidth: 120,
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  // Unit List
  doc.addPage();
  y = 20;
  y = addSectionTitle(doc, "Unit Details", y);

  const unitData = development.units.map((unit) => [
    unit.unitNumber,
    unit.type,
    unit.bedrooms.toString(),
    unit.constructionStatus,
    unit.salesStatus,
    formatCurrency(unit.soldPrice || unit.listPrice),
    unit.purchaserType || "-",
    formatDateShort((unit as { plannedCloseDate?: string }).plannedCloseDate),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Unit", "Type", "Beds", "Construction", "Sales", "Price", "Purchaser Type", "Planned Close"]],
    body: unitData,
    theme: "striped",
    headStyles: { fillColor: [6, 182, 212], textColor: [255, 255, 255] },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8 },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  // Documentation Summary
  if (y > 150) {
    doc.addPage();
    y = 20;
  }

  y = addSectionTitle(doc, "Documentation Completion Summary", y);

  const docStats = {
    bcmsComplete: development.units.filter((u) => u.documentation?.bcmsReceived).length,
    landRegistryComplete: development.units.filter((u) => u.documentation?.landRegistryApproved).length,
    homebondComplete: development.units.filter((u) => u.documentation?.homebondReceived).length,
    contractsComplete: development.units.filter((u) => u.documentation?.contractSigned).length,
    salesClosed: development.units.filter((u) => u.documentation?.saleClosed).length,
  };

  const docData = [
    ["BCMS Received", `${docStats.bcmsComplete} / ${stats.totalUnits}`],
    ["Land Registry Approved", `${docStats.landRegistryComplete} / ${stats.totalUnits}`],
    ["Homebond Received", `${docStats.homebondComplete} / ${stats.totalUnits}`],
    ["Contracts Signed", `${docStats.contractsComplete} / ${stats.totalUnits}`],
    ["Sales Closed", `${docStats.salesClosed} / ${stats.totalUnits}`],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Document Type", "Completion"]],
    body: docData,
    theme: "striped",
    headStyles: { fillColor: [6, 182, 212], textColor: [255, 255, 255] },
    margin: { left: 14, right: 14 },
    tableWidth: 120,
  });

  addPdfFooter(doc);
  return doc;
}

function generateDevelopmentDetailExcel(developmentId: string): XLSX.WorkBook | null {
  const development = developments.find((d) => d.id === developmentId);
  if (!development) return null;

  const stats = getDevelopmentStats(development);
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summarySheet = XLSX.utils.aoa_to_sheet([
    [development.name, formatDate(new Date())],
    [development.projectNumber],
    [],
    ["DEVELOPMENT SUMMARY"],
    ["Metric", "Value"],
    ["Total Units", stats.totalUnits],
    ["GDV", stats.gdv],
    ["Sales Complete (Count)", stats.salesCompleteCount],
    ["Sales Complete (Value)", stats.salesValue],
    ["Contracted", stats.contractedCount],
    ["Under Offer", stats.underOfferCount],
    ["For Sale", stats.forSaleCount],
    ["Not Released", stats.notReleasedCount],
    ["Completion Rate", `${stats.percentComplete}%`],
  ]);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // Sheet 2: Unit Details
  const unitData = development.units.map((unit) => ({
    "Unit Number": unit.unitNumber,
    Type: unit.type,
    Bedrooms: unit.bedrooms,
    "Construction Status": unit.constructionStatus,
    "Sales Status": unit.salesStatus,
    "List Price": unit.listPrice,
    "Sold Price": unit.soldPrice || "",
    "Purchaser Type": unit.purchaserType || "",
    "Part V": unit.partV ? "Yes" : "No",
    "Planned Close": (unit as { plannedCloseDate?: string }).plannedCloseDate || "",
    "BCMS Received": unit.documentation?.bcmsReceived ? "Yes" : "No",
    "Land Registry": unit.documentation?.landRegistryApproved ? "Yes" : "No",
    Homebond: unit.documentation?.homebondReceived ? "Yes" : "No",
    "Contract Signed": unit.documentation?.contractSigned ? "Yes" : "No",
    "Sale Closed": unit.documentation?.saleClosed ? "Yes" : "No",
  }));
  const unitSheet = XLSX.utils.json_to_sheet(unitData);
  XLSX.utils.book_append_sheet(wb, unitSheet, "Units");

  return wb;
}

// ==========================================
// REPORT 3: Sales Pipeline Report
// ==========================================

function generateSalesPipelinePdf(): jsPDF {
  const doc = new jsPDF({ orientation: "landscape" });

  let y = addPdfHeader(doc, "Sales Pipeline Report", "All Developments");

  const statuses = ["Complete", "Contracted", "Under Offer", "For Sale", "Not Released"] as const;

  for (const status of statuses) {
    const units: { dev: string; unit: Unit }[] = [];
    developments.forEach((dev) => {
      dev.units.forEach((unit) => {
        if (unit.salesStatus === status) {
          units.push({ dev: dev.name, unit });
        }
      });
    });

    const totalValue = units.reduce((sum, { unit }) => sum + (unit.soldPrice || unit.listPrice || 0), 0);

    // Check if we need a new page
    if (y > 160) {
      doc.addPage();
      y = 20;
    }

    y = addSectionTitle(doc, `${status} (${units.length} units - ${formatCurrency(totalValue)})`, y);

    if (units.length === 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text("No units in this status", 14, y);
      y += 15;
    } else {
      const unitData = units.slice(0, 50).map(({ dev, unit }) => [
        dev,
        unit.unitNumber,
        unit.type,
        unit.bedrooms.toString(),
        formatCurrency(unit.soldPrice || unit.listPrice),
        unit.purchaserType || "-",
      ]);

      autoTable(doc, {
        startY: y,
        head: [["Development", "Unit", "Type", "Beds", "Price", "Purchaser Type"]],
        body: unitData,
        theme: "striped",
        headStyles: { fillColor: [6, 182, 212], textColor: [255, 255, 255] },
        margin: { left: 14, right: 14 },
        styles: { fontSize: 8 },
      });

      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

      if (units.length > 50) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.text(`... and ${units.length - 50} more units`, 14, y - 5);
      }
    }
  }

  addPdfFooter(doc);
  return doc;
}

function generateSalesPipelineExcel(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const statuses = ["Complete", "Contracted", "Under Offer", "For Sale", "Not Released"] as const;

  // Summary sheet
  const summaryData = statuses.map((status) => {
    let count = 0;
    let value = 0;
    developments.forEach((dev) => {
      dev.units.forEach((unit) => {
        if (unit.salesStatus === status) {
          count++;
          value += unit.soldPrice || unit.listPrice || 0;
        }
      });
    });
    return { Status: status, "Unit Count": count, "Total Value": value };
  });
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // Sheet per status
  for (const status of statuses) {
    const units: { Development: string; Unit: string; Type: string; Beds: number; Price: number; "Purchaser Type": string }[] = [];
    developments.forEach((dev) => {
      dev.units.forEach((unit) => {
        if (unit.salesStatus === status) {
          units.push({
            Development: dev.name,
            Unit: unit.unitNumber,
            Type: unit.type,
            Beds: unit.bedrooms,
            Price: unit.soldPrice || unit.listPrice,
            "Purchaser Type": unit.purchaserType || "",
          });
        }
      });
    });
    const sheet = XLSX.utils.json_to_sheet(units);
    XLSX.utils.book_append_sheet(wb, sheet, status.replace(/\s+/g, ""));
  }

  return wb;
}

// ==========================================
// REPORT 4: Documentation Status Report
// ==========================================

function generateDocumentationStatusPdf(): jsPDF {
  const doc = new jsPDF({ orientation: "landscape" });
  const missing = getMissingDocumentation();

  let y = addPdfHeader(doc, "Documentation Status Report", "Units with Incomplete Documentation");

  const sections = [
    { title: "Missing BCMS", data: missing.missingBcms },
    { title: "Missing Land Registry Approval", data: missing.missingLandRegistry },
    { title: "Missing Homebond", data: missing.missingHomebond },
    { title: "Missing Signed Contracts", data: missing.missingContracts },
  ];

  for (const section of sections) {
    if (y > 160) {
      doc.addPage();
      y = 20;
    }

    y = addSectionTitle(doc, `${section.title} (${section.data.length} units)`, y);

    if (section.data.length === 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(34, 197, 94);
      doc.text("All complete!", 14, y);
      doc.setTextColor(0, 0, 0);
      y += 15;
    } else {
      const tableData = section.data.slice(0, 30).map(({ dev, unit }) => [
        dev,
        unit.unitNumber,
        unit.salesStatus,
        unit.purchaserType || "-",
      ]);

      autoTable(doc, {
        startY: y,
        head: [["Development", "Unit", "Sales Status", "Purchaser Type"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255] },
        margin: { left: 14, right: 14 },
        styles: { fontSize: 9 },
      });

      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

      if (section.data.length > 30) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.text(`... and ${section.data.length - 30} more units`, 14, y - 5);
      }
    }
  }

  addPdfFooter(doc);
  return doc;
}

function generateDocumentationStatusExcel(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const missing = getMissingDocumentation();

  // Summary sheet
  const summaryData = [
    { Category: "Missing BCMS", Count: missing.missingBcms.length },
    { Category: "Missing Land Registry", Count: missing.missingLandRegistry.length },
    { Category: "Missing Homebond", Count: missing.missingHomebond.length },
    { Category: "Missing Contracts", Count: missing.missingContracts.length },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // Detail sheets
  const sheetData = [
    { name: "Missing BCMS", data: missing.missingBcms },
    { name: "Missing Land Registry", data: missing.missingLandRegistry },
    { name: "Missing Homebond", data: missing.missingHomebond },
    { name: "Missing Contracts", data: missing.missingContracts },
  ];

  for (const { name, data } of sheetData) {
    const rows = data.map(({ dev, unit }) => ({
      Development: dev,
      Unit: unit.unitNumber,
      "Sales Status": unit.salesStatus,
      "Purchaser Type": unit.purchaserType || "",
      Price: unit.soldPrice || unit.listPrice,
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, sheet, name.substring(0, 31)); // Sheet name max 31 chars
  }

  return wb;
}

// ==========================================
// Main Export Functions
// ==========================================

export async function generateReport(options: ReportOptions): Promise<{ pdf?: Blob; excel?: Blob }> {
  const result: { pdf?: Blob; excel?: Blob } = {};

  // Generate PDF
  if (options.format === "pdf" || options.format === "both") {
    let doc: jsPDF | null = null;

    switch (options.type) {
      case "portfolio":
        doc = generatePortfolioSummaryPdf();
        break;
      case "development":
        if (options.developmentId) {
          doc = generateDevelopmentDetailPdf(options.developmentId);
        }
        break;
      case "pipeline":
        doc = generateSalesPipelinePdf();
        break;
      case "documentation":
        doc = generateDocumentationStatusPdf();
        break;
    }

    if (doc) {
      result.pdf = doc.output("blob");
    }
  }

  // Generate Excel
  if (options.format === "excel" || options.format === "both") {
    let workbook: XLSX.WorkBook | null = null;

    switch (options.type) {
      case "portfolio":
        workbook = generatePortfolioSummaryExcel();
        break;
      case "development":
        if (options.developmentId) {
          workbook = generateDevelopmentDetailExcel(options.developmentId);
        }
        break;
      case "pipeline":
        workbook = generateSalesPipelineExcel();
        break;
      case "documentation":
        workbook = generateDocumentationStatusExcel();
        break;
    }

    if (workbook) {
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      result.excel = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    }
  }

  return result;
}

export function downloadReport(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getReportFilename(type: ReportType, format: "pdf" | "excel", developmentName?: string): string {
  const date = new Date().toISOString().split("T")[0];
  const ext = format === "pdf" ? "pdf" : "xlsx";

  switch (type) {
    case "portfolio":
      return `Portfolio-Summary-${date}.${ext}`;
    case "development":
      return `${(developmentName || "Development").replace(/\s+/g, "-")}-Report-${date}.${ext}`;
    case "pipeline":
      return `Sales-Pipeline-${date}.${ext}`;
    case "documentation":
      return `Documentation-Status-${date}.${ext}`;
    default:
      return `Report-${date}.${ext}`;
  }
}

// Quick report functions for one-click generation
export async function downloadPortfolioReport(format: ReportFormat = "pdf"): Promise<void> {
  const result = await generateReport({ type: "portfolio", format });
  if (result.pdf) {
    downloadReport(result.pdf, getReportFilename("portfolio", "pdf"));
  }
  if (result.excel) {
    downloadReport(result.excel, getReportFilename("portfolio", "excel"));
  }
}

export async function downloadDevelopmentReport(developmentId: string, developmentName: string, format: ReportFormat = "pdf"): Promise<void> {
  const result = await generateReport({ type: "development", format, developmentId });
  if (result.pdf) {
    downloadReport(result.pdf, getReportFilename("development", "pdf", developmentName));
  }
  if (result.excel) {
    downloadReport(result.excel, getReportFilename("development", "excel", developmentName));
  }
}

export async function downloadPipelineReport(format: ReportFormat = "pdf"): Promise<void> {
  const result = await generateReport({ type: "pipeline", format });
  if (result.pdf) {
    downloadReport(result.pdf, getReportFilename("pipeline", "pdf"));
  }
  if (result.excel) {
    downloadReport(result.excel, getReportFilename("pipeline", "excel"));
  }
}

export async function downloadDocumentationReport(format: ReportFormat = "pdf"): Promise<void> {
  const result = await generateReport({ type: "documentation", format });
  if (result.pdf) {
    downloadReport(result.pdf, getReportFilename("documentation", "pdf"));
  }
  if (result.excel) {
    downloadReport(result.excel, getReportFilename("documentation", "excel"));
  }
}

// Get list of developments for dropdown
export function getDevelopmentsList(): { id: string; name: string }[] {
  return developments.map((d) => ({ id: d.id, name: d.name }));
}
