import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { developments } from "../data/realDevelopments";
import type { Development, Unit, Currency } from "../types";
import { DEFAULT_VAT_RATES } from "../types";
import {
  formatCurrencyWhole,
  calculateExVat,
  getVatRateForUnit,
} from "../utils/formatCurrency";

// Types
export type ReportType = "12week-lookahead" | "sales-activity" | "development";
export type ReportFormat = "pdf" | "excel" | "both";

export interface ReportOptions {
  type: ReportType;
  format: ReportFormat;
  developmentId?: string;
  selectedDevelopmentIds?: string[];
}

// Formatting helpers
function formatCurrencyForReport(value: number, currency: Currency = "EUR"): string {
  return formatCurrencyWhole(value, currency);
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

function formatDateDDMMYYYY(dateString: string | undefined): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "";
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
// 12 Week Lookahead Report
// Units where salesStatus is NOT "Complete" AND
// (plannedCloseDate has passed OR plannedCloseDate is within next 12 weeks)
// Grouped by development, sorted by planned close date
// ==========================================

interface LookaheadUnit {
  developmentName: string;
  developmentId: string;
  unit: Unit;
  daysOverdue: number | null;
  isPastDue: boolean;
  currency: Currency;
  vatRates: { [key: string]: number };
}

export function get12WeekLookaheadUnits(selectedDevelopmentIds?: string[]): LookaheadUnit[] {
  const now = new Date();
  const twelveWeeksFromNow = new Date(now.getTime() + 12 * 7 * 24 * 60 * 60 * 1000);
  const units: LookaheadUnit[] = [];

  developments.forEach((dev) => {
    // Filter by selected developments if provided
    if (selectedDevelopmentIds && selectedDevelopmentIds.length > 0 && !selectedDevelopmentIds.includes(dev.id)) {
      return;
    }

    const devCurrency = dev.currency || "EUR";
    const devVatRates = dev.vatRates || DEFAULT_VAT_RATES;

    dev.units.forEach((unit) => {
      // Skip completed sales
      if (unit.salesStatus === "Complete") return;

      // Check if unit has a planned close date
      if (!unit.plannedCloseDate) return;

      const plannedClose = new Date(unit.plannedCloseDate);
      const isPastDue = plannedClose < now;
      const isWithin12Weeks = plannedClose <= twelveWeeksFromNow;

      // Include if past due OR within next 12 weeks
      if (isPastDue || isWithin12Weeks) {
        const diffMs = now.getTime() - plannedClose.getTime();
        const daysOverdue = isPastDue ? Math.ceil(diffMs / (24 * 60 * 60 * 1000)) : null;

        units.push({
          developmentName: dev.name,
          developmentId: dev.id,
          unit,
          daysOverdue,
          isPastDue,
          currency: devCurrency,
          vatRates: devVatRates,
        });
      }
    });
  });

  return units;
}

export function getUnitsInLookaheadByDevelopment(developmentId: string): number {
  const now = new Date();
  const twelveWeeksFromNow = new Date(now.getTime() + 12 * 7 * 24 * 60 * 60 * 1000);
  const dev = developments.find((d) => d.id === developmentId);
  if (!dev) return 0;

  return dev.units.filter((unit) => {
    if (unit.salesStatus === "Complete") return false;
    if (!unit.plannedCloseDate) return false;
    const plannedClose = new Date(unit.plannedCloseDate);
    return plannedClose < now || plannedClose <= twelveWeeksFromNow;
  }).length;
}

// Helper function to calculate days since a date
function getDaysSince(dateString: string | undefined): number | null {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return Math.floor(diffMs / (24 * 60 * 60 * 1000));
  } catch {
    return null;
  }
}

function generate12WeekLookaheadPdf(selectedDevelopmentIds?: string[]): jsPDF {
  const doc = new jsPDF({ orientation: "landscape" });
  const allUnits = get12WeekLookaheadUnits(selectedDevelopmentIds);
  const pastDueCount = allUnits.filter((u) => u.isPastDue).length;
  const totalValue = allUnits.reduce((sum, u) => sum + (u.unit.priceIncVat || u.unit.listPrice || 0), 0);

  // Determine primary currency from first unit (or default to EUR)
  const primaryCurrency = allUnits.length > 0 ? allUnits[0].currency : "EUR";

  let y = addPdfHeader(
    doc,
    "12 Week Lookahead Report",
    `${allUnits.length} units | ${pastDueCount} past due | ${formatCurrencyForReport(totalValue, primaryCurrency)}`
  );

  // Group units by development
  const unitsByDevelopment: Record<string, LookaheadUnit[]> = {};
  allUnits.forEach((u) => {
    if (!unitsByDevelopment[u.developmentName]) {
      unitsByDevelopment[u.developmentName] = [];
    }
    unitsByDevelopment[u.developmentName].push(u);
  });

  // Sort units within each development by planned close date
  Object.keys(unitsByDevelopment).forEach((devName) => {
    unitsByDevelopment[devName].sort((a, b) => {
      const dateA = new Date(a.unit.plannedCloseDate!).getTime();
      const dateB = new Date(b.unit.plannedCloseDate!).getTime();
      return dateA - dateB;
    });
  });

  // Sort developments alphabetically
  const sortedDevelopments = Object.keys(unitsByDevelopment).sort();

  // Track grand totals
  let grandTotalUnits = 0;
  let grandTotalValue = 0;

  // Generate tables for each development
  sortedDevelopments.forEach((devName, index) => {
    const devUnits = unitsByDevelopment[devName];
    const devPastDue = devUnits.filter((u) => u.isPastDue).length;
    const devTotalValue = devUnits.reduce((sum, u) => sum + (u.unit.priceIncVat || u.unit.listPrice || 0), 0);

    // Get currency from first unit in this development (they should all be the same)
    const devCurrency = devUnits.length > 0 ? devUnits[0].currency : "EUR";

    grandTotalUnits += devUnits.length;
    grandTotalValue += devTotalValue;

    if (index > 0 || y > 60) {
      if (y > 140) {
        doc.addPage();
        y = 20;
      }
    }

    // Development header
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`${devName} (${devUnits.length} units${devPastDue > 0 ? `, ${devPastDue} overdue` : ""})`, 14, y);
    y += 6;

    // Build table data with columns including Inc VAT and Ex VAT
    // Columns: Unit, Beds, Type, Inc VAT, Ex VAT, Status, Plan Close, Days O/D, BCMS Date, Days, BCMS, Land, Home, SAN, C.Out, C.In, Closed
    const tableData = devUnits.map((u) => {
      const unitDoc = u.unit.documentation;
      const bcmsDate = unitDoc?.bcmsReceivedDate;
      const daysSinceBcms = getDaysSince(bcmsDate);
      const unitPriceIncVat = u.unit.priceIncVat || u.unit.listPrice || 0;
      const vatRate = getVatRateForUnit(u.vatRates, u.unit.type);
      const unitPriceExVat = calculateExVat(unitPriceIncVat, vatRate);

      return [
        u.unit.unitNumber,
        u.unit.bedrooms.toString(),
        u.unit.type,
        unitPriceIncVat > 0 ? formatCurrencyForReport(unitPriceIncVat, devCurrency) : "-",
        unitPriceExVat > 0 ? formatCurrencyForReport(unitPriceExVat, devCurrency) : "-",
        u.unit.salesStatus,
        formatDateShort(u.unit.plannedCloseDate),
        u.isPastDue && u.daysOverdue ? `${u.daysOverdue}` : "",
        bcmsDate ? formatDateShort(bcmsDate) : "-",
        daysSinceBcms !== null ? `${daysSinceBcms}` : "",
        unitDoc?.bcmsReceived ? "YES" : "NO",
        unitDoc?.landRegistryApproved ? "YES" : "NO",
        unitDoc?.homebondReceived ? "YES" : "NO",
        unitDoc?.sanApproved ? "YES" : "NO",
        unitDoc?.contractIssued ? "YES" : "NO",
        unitDoc?.contractSigned ? "YES" : "NO",
        unitDoc?.saleClosed ? "YES" : "NO",
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [[
        "Unit",
        "Beds",
        "Type",
        "Inc VAT",
        "Ex VAT",
        "Status",
        "Plan Close",
        "Days O/D",
        "BCMS Date",
        "Days",
        "BCMS",
        "Land",
        "Home",
        "SAN",
        "C.Out",
        "C.In",
        "Closed",
      ]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [6, 182, 212], textColor: [255, 255, 255], fontSize: 5.5, cellPadding: 1.2 },
      margin: { left: 6, right: 6 },
      styles: { fontSize: 5.5, cellPadding: 1.2 },
      columnStyles: {
        0: { cellWidth: 12 }, // Unit
        1: { cellWidth: 8, halign: "center" }, // Beds
        2: { cellWidth: 18 }, // Type
        3: { cellWidth: 16, halign: "right" }, // Inc VAT
        4: { cellWidth: 16, halign: "right" }, // Ex VAT
        5: { cellWidth: 15 }, // Status
        6: { cellWidth: 16 }, // Plan Close
        7: { cellWidth: 11, halign: "center" }, // Days O/D
        8: { cellWidth: 16 }, // BCMS Date
        9: { cellWidth: 9, halign: "center" }, // Days Since
        10: { cellWidth: 12, halign: "center" }, // BCMS
        11: { cellWidth: 11, halign: "center" }, // Land
        12: { cellWidth: 11, halign: "center" }, // Home
        13: { cellWidth: 11, halign: "center" }, // SAN
        14: { cellWidth: 11, halign: "center" }, // C.Out
        15: { cellWidth: 11, halign: "center" }, // C.In
        16: { cellWidth: 12, halign: "center" }, // Closed
      },
      didParseCell: (data) => {
        // Style YES/NO columns (columns 10-16) with colored backgrounds
        if (data.section === "body" && data.column.index >= 10 && data.column.index <= 16) {
          const value = data.cell.raw as string;
          if (value === "YES") {
            data.cell.styles.fillColor = [34, 197, 94]; // Green #22c55e
            data.cell.styles.textColor = [255, 255, 255]; // White text
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fontSize = 6;
          } else if (value === "NO") {
            data.cell.styles.fillColor = [220, 38, 38]; // Red #dc2626
            data.cell.styles.textColor = [255, 255, 255]; // White text
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fontSize = 6;
          }
        }
        // Highlight overdue rows (but don't override YES/NO colors)
        if (data.section === "body" && data.column.index < 10) {
          const rowIndex = data.row.index;
          if (devUnits[rowIndex]?.isPastDue) {
            data.cell.styles.fillColor = [254, 226, 226]; // Light red background
          }
        }
        // Color Days Overdue column
        if (data.section === "body" && data.column.index === 7) {
          const value = data.cell.raw as string;
          if (value && value !== "") {
            data.cell.styles.textColor = [220, 38, 38]; // Red
            data.cell.styles.fontStyle = "bold";
          }
        }
        // Style Days Since BCMS column
        if (data.section === "body" && data.column.index === 9) {
          const value = data.cell.raw as string;
          if (value && value !== "") {
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;

    // Add development subtotal
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 95);
    doc.text(`Subtotal: ${devUnits.length} units - ${formatCurrencyForReport(devTotalValue, devCurrency)}`, 14, y);
    y += 10;
  });

  // Add grand total at the end
  if (y > 180) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(30, 58, 95);
  doc.rect(6, y - 2, 282, 10, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(`TOTAL: ${grandTotalUnits} units - ${formatCurrencyForReport(grandTotalValue, primaryCurrency)}`, 14, y + 5);

  addPdfFooter(doc);
  return doc;
}

async function generate12WeekLookaheadExcel(selectedDevelopmentIds?: string[]): Promise<ExcelJS.Workbook> {
  const allUnits = get12WeekLookaheadUnits(selectedDevelopmentIds);
  const wb = new ExcelJS.Workbook();

  // Group units by development
  const unitsByDevelopment: Record<string, LookaheadUnit[]> = {};
  allUnits.forEach((u) => {
    if (!unitsByDevelopment[u.developmentName]) {
      unitsByDevelopment[u.developmentName] = [];
    }
    unitsByDevelopment[u.developmentName].push(u);
  });

  // Sort units within each development by planned close date
  Object.keys(unitsByDevelopment).forEach((devName) => {
    unitsByDevelopment[devName].sort((a, b) => {
      const dateA = new Date(a.unit.plannedCloseDate!).getTime();
      const dateB = new Date(b.unit.plannedCloseDate!).getTime();
      return dateA - dateB;
    });
  });

  // Summary sheet
  const pastDueCount = allUnits.filter((u) => u.isPastDue).length;
  const summarySheet = wb.addWorksheet("Summary");
  summarySheet.addRow(["12 Week Lookahead Report", formatDate(new Date())]);
  summarySheet.addRow([]);
  summarySheet.addRow(["SUMMARY"]);
  summarySheet.addRow(["Metric", "Count"]);
  summarySheet.addRow(["Total Units in Lookahead", allUnits.length]);
  summarySheet.addRow(["Past Due", pastDueCount]);
  summarySheet.addRow([]);
  summarySheet.addRow(["BY DEVELOPMENT"]);
  summarySheet.addRow(["Development", "Units", "Past Due"]);
  Object.keys(unitsByDevelopment).sort().forEach((devName) => {
    summarySheet.addRow([
      devName,
      unitsByDevelopment[devName].length,
      unitsByDevelopment[devName].filter((u) => u.isPastDue).length,
    ]);
  });

  // All Units sheet with columns including Inc VAT, Ex VAT, BCMS date, and days since BCMS
  const allUnitsSheet = wb.addWorksheet("All Units");
  allUnitsSheet.columns = [
    { header: "Development", key: "Development", width: 25 },
    { header: "Unit Number", key: "Unit Number", width: 12 },
    { header: "Bedrooms", key: "Bedrooms", width: 10 },
    { header: "Unit Type", key: "Unit Type", width: 15 },
    { header: "Currency", key: "Currency", width: 10 },
    { header: "Price Inc VAT", key: "Price Inc VAT", width: 15 },
    { header: "VAT Rate %", key: "VAT Rate %", width: 12 },
    { header: "Price Ex VAT", key: "Price Ex VAT", width: 15 },
    { header: "Sales Status", key: "Sales Status", width: 15 },
    { header: "Planned Close Date", key: "Planned Close Date", width: 18 },
    { header: "Days Overdue", key: "Days Overdue", width: 12 },
    { header: "BCMS Achieved Date", key: "BCMS Achieved Date", width: 18 },
    { header: "Days Since BCMS", key: "Days Since BCMS", width: 15 },
    { header: "BCMS Received", key: "BCMS Received", width: 14 },
    { header: "Land Registry Approved", key: "Land Registry Approved", width: 20 },
    { header: "Homebond Received", key: "Homebond Received", width: 18 },
    { header: "SAN Approved", key: "SAN Approved", width: 14 },
    { header: "Contract Issued", key: "Contract Issued", width: 15 },
    { header: "Contract Signed", key: "Contract Signed", width: 15 },
    { header: "Sale Closed", key: "Sale Closed", width: 12 },
  ];

  // Sort units by development then by planned close date
  const sortedUnits = [...allUnits].sort((a, b) => {
    if (a.developmentName !== b.developmentName) {
      return a.developmentName.localeCompare(b.developmentName);
    }
    return (a.unit.plannedCloseDate || "").localeCompare(b.unit.plannedCloseDate || "");
  });

  sortedUnits.forEach((u) => {
    const bcmsDate = u.unit.documentation?.bcmsReceivedDate;
    const daysSinceBcms = getDaysSince(bcmsDate);
    const unitPriceIncVat = u.unit.priceIncVat || u.unit.listPrice || 0;
    const vatRate = getVatRateForUnit(u.vatRates, u.unit.type);
    const unitPriceExVat = calculateExVat(unitPriceIncVat, vatRate);

    allUnitsSheet.addRow({
      "Development": u.developmentName,
      "Unit Number": u.unit.unitNumber,
      "Bedrooms": u.unit.bedrooms,
      "Unit Type": u.unit.type,
      "Currency": u.currency,
      "Price Inc VAT": unitPriceIncVat,
      "VAT Rate %": vatRate,
      "Price Ex VAT": Math.round(unitPriceExVat * 100) / 100,
      "Sales Status": u.unit.salesStatus,
      "Planned Close Date": formatDateDDMMYYYY(u.unit.plannedCloseDate),
      "Days Overdue": u.isPastDue && u.daysOverdue ? u.daysOverdue : "",
      "BCMS Achieved Date": bcmsDate ? formatDateDDMMYYYY(bcmsDate) : "",
      "Days Since BCMS": daysSinceBcms !== null ? daysSinceBcms : "",
      "BCMS Received": u.unit.documentation?.bcmsReceived ? "Yes" : "No",
      "Land Registry Approved": u.unit.documentation?.landRegistryApproved ? "Yes" : "No",
      "Homebond Received": u.unit.documentation?.homebondReceived ? "Yes" : "No",
      "SAN Approved": u.unit.documentation?.sanApproved ? "Yes" : "No",
      "Contract Issued": u.unit.documentation?.contractIssued ? "Yes" : "No",
      "Contract Signed": u.unit.documentation?.contractSigned ? "Yes" : "No",
      "Sale Closed": u.unit.documentation?.saleClosed ? "Yes" : "No",
    });
  });

  // Style header row
  allUnitsSheet.getRow(1).font = { bold: true };

  return wb;
}

// ==========================================
// Sales Activity - Last 4 Weeks Report
// Shows sales activity over the last 4 weeks
// Grouped by Development then by Activity Type
// ==========================================

interface SalesActivityUnit {
  developmentName: string;
  unit: Unit;
  activityType: "SAN Approved" | "Contract Signed" | "Sale Closed";
  activityDate: string;
  weeksAgo: number;
  value: number;
  currency: Currency;
  vatRates: { [key: string]: number };
}

function getSalesActivityUnits(): SalesActivityUnit[] {
  const now = new Date();
  const fourWeeksAgo = new Date(now.getTime() - 4 * 7 * 24 * 60 * 60 * 1000);
  const units: SalesActivityUnit[] = [];

  developments.forEach((dev) => {
    const devCurrency = dev.currency || "EUR";
    const devVatRates = dev.vatRates || DEFAULT_VAT_RATES;

    dev.units.forEach((unit) => {
      const unitValue = unit.soldPrice || unit.priceIncVat || unit.listPrice || 0;

      // Check for SAN approved in last 4 weeks
      if (unit.documentation?.sanApprovedDate) {
        const date = new Date(unit.documentation.sanApprovedDate);
        if (date >= fourWeeksAgo && date <= now) {
          const weeksAgo = Math.floor((now.getTime() - date.getTime()) / (7 * 24 * 60 * 60 * 1000));
          units.push({
            developmentName: dev.name,
            unit,
            activityType: "SAN Approved",
            activityDate: unit.documentation.sanApprovedDate,
            weeksAgo,
            value: unitValue,
            currency: devCurrency,
            vatRates: devVatRates,
          });
        }
      }

      // Check for contract signed in last 4 weeks
      if (unit.documentation?.contractSignedDate) {
        const date = new Date(unit.documentation.contractSignedDate);
        if (date >= fourWeeksAgo && date <= now) {
          const weeksAgo = Math.floor((now.getTime() - date.getTime()) / (7 * 24 * 60 * 60 * 1000));
          units.push({
            developmentName: dev.name,
            unit,
            activityType: "Contract Signed",
            activityDate: unit.documentation.contractSignedDate,
            weeksAgo,
            value: unitValue,
            currency: devCurrency,
            vatRates: devVatRates,
          });
        }
      }

      // Check for sale closed in last 4 weeks
      if (unit.documentation?.saleClosedDate) {
        const date = new Date(unit.documentation.saleClosedDate);
        if (date >= fourWeeksAgo && date <= now) {
          const weeksAgo = Math.floor((now.getTime() - date.getTime()) / (7 * 24 * 60 * 60 * 1000));
          units.push({
            developmentName: dev.name,
            unit,
            activityType: "Sale Closed",
            activityDate: unit.documentation.saleClosedDate,
            weeksAgo,
            value: unitValue,
            currency: devCurrency,
            vatRates: devVatRates,
          });
        }
      }
    });
  });

  // Sort by development, then by activity type, then by date
  units.sort((a, b) => {
    if (a.developmentName !== b.developmentName) {
      return a.developmentName.localeCompare(b.developmentName);
    }
    const typeOrder = { "SAN Approved": 0, "Contract Signed": 1, "Sale Closed": 2 };
    if (typeOrder[a.activityType] !== typeOrder[b.activityType]) {
      return typeOrder[a.activityType] - typeOrder[b.activityType];
    }
    return new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime();
  });

  return units;
}

function generateSalesActivityPdf(): jsPDF {
  const doc = new jsPDF({ orientation: "landscape" });
  const units = getSalesActivityUnits();
  const totalValue = units.reduce((sum, u) => sum + u.value, 0);

  // Determine primary currency from first unit (or default to EUR)
  const primaryCurrency = units.length > 0 ? units[0].currency : "EUR";

  let y = addPdfHeader(
    doc,
    "Sales Activity - Last 4 Weeks",
    `${units.length} transactions | ${formatCurrencyForReport(totalValue, primaryCurrency)} total value`
  );

  // Activity by Week with Total Value
  y = addSectionTitle(doc, "Activity by Week", y);

  const weekLabels = ["This Week", "1 Week Ago", "2 Weeks Ago", "3 Weeks Ago", "4 Weeks Ago"];
  const weekData = weekLabels.map((label, index) => {
    const weekUnits = units.filter((u) => u.weeksAgo === index);
    const weekValue = weekUnits.reduce((sum, u) => sum + u.value, 0);
    return [label, weekUnits.length.toString(), formatCurrencyForReport(weekValue, primaryCurrency)];
  });

  autoTable(doc, {
    startY: y,
    head: [["Period", "Transactions", "Total Value"]],
    body: weekData,
    theme: "striped",
    headStyles: { fillColor: [6, 182, 212], textColor: [255, 255, 255] },
    margin: { left: 14, right: 14 },
    tableWidth: 180,
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  // Activity by Type with Values
  y = addSectionTitle(doc, "Activity by Type", y);

  const activityTypes: Array<"SAN Approved" | "Contract Signed" | "Sale Closed"> = ["SAN Approved", "Contract Signed", "Sale Closed"];
  const typeData = activityTypes.map((type) => {
    const typeUnits = units.filter((u) => u.activityType === type);
    const typeValue = typeUnits.reduce((sum, u) => sum + u.value, 0);
    return [type, typeUnits.length.toString(), formatCurrencyForReport(typeValue, primaryCurrency)];
  });

  autoTable(doc, {
    startY: y,
    head: [["Activity Type", "Count", "Value"]],
    body: typeData,
    theme: "striped",
    headStyles: { fillColor: [6, 182, 212], textColor: [255, 255, 255] },
    margin: { left: 14, right: 14 },
    tableWidth: 180,
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  // Transaction Details - Grouped by Development then Activity Type
  if (units.length > 0) {
    if (y > 130) {
      doc.addPage();
      y = 20;
    }

    y = addSectionTitle(doc, "Transaction Details", y);

    // Group by development
    const unitsByDevelopment: Record<string, SalesActivityUnit[]> = {};
    units.forEach((u) => {
      if (!unitsByDevelopment[u.developmentName]) {
        unitsByDevelopment[u.developmentName] = [];
      }
      unitsByDevelopment[u.developmentName].push(u);
    });

    const sortedDevelopments = Object.keys(unitsByDevelopment).sort();

    sortedDevelopments.forEach((devName) => {
      const devUnits = unitsByDevelopment[devName];
      const devTotal = devUnits.reduce((sum, u) => sum + u.value, 0);

      if (y > 170) {
        doc.addPage();
        y = 20;
      }

      // Development header - get currency from first unit
      const devCurrency = devUnits.length > 0 ? devUnits[0].currency : primaryCurrency;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`${devName}`, 14, y);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Total: ${formatCurrencyForReport(devTotal, devCurrency)}`, 100, y);
      y += 6;

      // Group by activity type within development
      activityTypes.forEach((actType) => {
        const typeUnits = devUnits.filter((u) => u.activityType === actType);
        if (typeUnits.length === 0) return;

        const typeTotal = typeUnits.reduce((sum, u) => sum + u.value, 0);

        // Activity type subheader
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(80, 80, 80);
        doc.text(`  ${actType} (${typeUnits.length} units - ${formatCurrencyForReport(typeTotal, devCurrency)})`, 14, y);
        y += 5;

        // Unit details table
        const detailData = typeUnits.map((u) => [
          u.unit.unitNumber,
          u.unit.type,
          formatCurrencyForReport(u.value, u.currency),
          formatDateShort(u.activityDate),
        ]);

        autoTable(doc, {
          startY: y,
          head: [["Unit", "Type", "Value", "Date"]],
          body: detailData,
          theme: "plain",
          headStyles: { fillColor: [240, 240, 240], textColor: [60, 60, 60], fontSize: 8 },
          margin: { left: 20, right: 14 },
          styles: { fontSize: 8, cellPadding: 1.5 },
          tableWidth: 160,
        });

        y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
      });

      y += 5;
    });
    // Note: Grand Total removed as per requirements
  } else {
    doc.setFontSize(12);
    doc.setFont("helvetica", "italic");
    doc.text("No sales activity in the last 4 weeks.", 14, y);
  }

  addPdfFooter(doc);
  return doc;
}

async function generateSalesActivityExcel(): Promise<ExcelJS.Workbook> {
  const units = getSalesActivityUnits();
  const wb = new ExcelJS.Workbook();

  // Summary sheet with values
  const activityTypes: Array<"SAN Approved" | "Contract Signed" | "Sale Closed"> = ["SAN Approved", "Contract Signed", "Sale Closed"];

  const summarySheet = wb.addWorksheet("Summary");
  summarySheet.addRow(["Sales Activity - Last 4 Weeks", formatDate(new Date())]);
  summarySheet.addRow([]);
  summarySheet.addRow(["SUMMARY BY TYPE"]);
  summarySheet.addRow(["Activity Type", "Count", "Value"]);
  activityTypes.forEach((type) => {
    const typeUnits = units.filter((u) => u.activityType === type);
    const typeValue = typeUnits.reduce((sum, u) => sum + u.value, 0);
    summarySheet.addRow([type, typeUnits.length, typeValue]);
  });
  summarySheet.addRow([]);
  summarySheet.addRow(["SUMMARY BY WEEK"]);
  summarySheet.addRow(["Period", "Count", "Value"]);
  ["This Week", "1 Week Ago", "2 Weeks Ago", "3 Weeks Ago", "4 Weeks Ago"].forEach((label, index) => {
    const weekUnits = units.filter((u) => u.weeksAgo === index);
    const weekValue = weekUnits.reduce((sum, u) => sum + u.value, 0);
    summarySheet.addRow([label, weekUnits.length, weekValue]);
  });
  summarySheet.addRow([]);
  summarySheet.addRow(["GRAND TOTAL", units.length, units.reduce((sum, u) => sum + u.value, 0)]);

  // Grouped by Development sheet
  const groupedSheet = wb.addWorksheet("By Development");
  groupedSheet.addRow(["Development", "Activity Type", "Unit Count", "Total Value"]);

  // Group by development
  const unitsByDevelopment: Record<string, SalesActivityUnit[]> = {};
  units.forEach((u) => {
    if (!unitsByDevelopment[u.developmentName]) {
      unitsByDevelopment[u.developmentName] = [];
    }
    unitsByDevelopment[u.developmentName].push(u);
  });

  const sortedDevelopments = Object.keys(unitsByDevelopment).sort();
  sortedDevelopments.forEach((devName) => {
    const devUnits = unitsByDevelopment[devName];
    const devTotal = devUnits.reduce((sum, u) => sum + u.value, 0);

    activityTypes.forEach((actType) => {
      const typeUnits = devUnits.filter((u) => u.activityType === actType);
      if (typeUnits.length > 0) {
        const typeValue = typeUnits.reduce((sum, u) => sum + u.value, 0);
        groupedSheet.addRow([devName, actType, typeUnits.length, typeValue]);
      }
    });

    groupedSheet.addRow([`${devName} Total`, "", devUnits.length, devTotal]);
    groupedSheet.addRow(["", "", "", ""]);
  });

  // All Transactions sheet
  const allSheet = wb.addWorksheet("All Transactions");
  allSheet.columns = [
    { header: "Development", key: "Development", width: 25 },
    { header: "Unit Number", key: "Unit Number", width: 12 },
    { header: "Unit Type", key: "Unit Type", width: 15 },
    { header: "Activity Type", key: "Activity Type", width: 15 },
    { header: "Activity Date", key: "Activity Date", width: 15 },
    { header: "Weeks Ago", key: "Weeks Ago", width: 12 },
    { header: "Value", key: "Value", width: 15 },
  ];

  units.forEach((u) => {
    allSheet.addRow({
      "Development": u.developmentName,
      "Unit Number": u.unit.unitNumber,
      "Unit Type": u.unit.type,
      "Activity Type": u.activityType,
      "Activity Date": formatDateDDMMYYYY(u.activityDate),
      "Weeks Ago": u.weeksAgo,
      "Value": u.value,
    });
  });

  // Style header row
  allSheet.getRow(1).font = { bold: true };

  return wb;
}

// ==========================================
// Development Detail Report (kept for individual development reports)
// ==========================================

function generateDevelopmentDetailPdf(developmentId: string): jsPDF | null {
  const development = developments.find((d) => d.id === developmentId);
  if (!development) return null;

  const doc = new jsPDF({ orientation: "landscape" });
  const stats = getDevelopmentStats(development);
  const devCurrency = development.currency || "EUR";

  let y = addPdfHeader(doc, development.name, `Status Report | ${development.projectNumber}`);

  // Development Summary Stats
  y = addSectionTitle(doc, "Development Summary", y);

  const summaryData = [
    ["Total Units", stats.totalUnits.toString()],
    ["GDV", formatCurrencyForReport(stats.gdv, devCurrency)],
    ["Sales Complete", `${stats.salesCompleteCount} (${formatCurrencyForReport(stats.salesValue, devCurrency)})`],
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
    formatCurrencyForReport(unit.soldPrice || unit.listPrice, devCurrency),
    unit.purchaserType || "-",
    formatDateShort(unit.plannedCloseDate),
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

async function generateDevelopmentDetailExcel(developmentId: string): Promise<ExcelJS.Workbook | null> {
  const development = developments.find((d) => d.id === developmentId);
  if (!development) return null;

  const stats = getDevelopmentStats(development);
  const wb = new ExcelJS.Workbook();

  // Sheet 1: Summary
  const summarySheet = wb.addWorksheet("Summary");
  summarySheet.addRow([development.name, formatDate(new Date())]);
  summarySheet.addRow([development.projectNumber]);
  summarySheet.addRow([]);
  summarySheet.addRow(["DEVELOPMENT SUMMARY"]);
  summarySheet.addRow(["Metric", "Value"]);
  summarySheet.addRow(["Total Units", stats.totalUnits]);
  summarySheet.addRow(["GDV", stats.gdv]);
  summarySheet.addRow(["Sales Complete (Count)", stats.salesCompleteCount]);
  summarySheet.addRow(["Sales Complete (Value)", stats.salesValue]);
  summarySheet.addRow(["Contracted", stats.contractedCount]);
  summarySheet.addRow(["Under Offer", stats.underOfferCount]);
  summarySheet.addRow(["For Sale", stats.forSaleCount]);
  summarySheet.addRow(["Not Released", stats.notReleasedCount]);
  summarySheet.addRow(["Completion Rate", `${stats.percentComplete}%`]);

  // Sheet 2: Unit Details
  const unitSheet = wb.addWorksheet("Units");
  unitSheet.columns = [
    { header: "Unit Number", key: "Unit Number", width: 12 },
    { header: "Type", key: "Type", width: 15 },
    { header: "Bedrooms", key: "Bedrooms", width: 10 },
    { header: "Construction Status", key: "Construction Status", width: 18 },
    { header: "Sales Status", key: "Sales Status", width: 15 },
    { header: "List Price", key: "List Price", width: 15 },
    { header: "Sold Price", key: "Sold Price", width: 15 },
    { header: "Purchaser Type", key: "Purchaser Type", width: 15 },
    { header: "Part V", key: "Part V", width: 8 },
    { header: "Planned Close", key: "Planned Close", width: 15 },
    { header: "BCMS Received", key: "BCMS Received", width: 14 },
    { header: "Land Registry", key: "Land Registry", width: 14 },
    { header: "Homebond", key: "Homebond", width: 12 },
    { header: "Contract Signed", key: "Contract Signed", width: 15 },
    { header: "Sale Closed", key: "Sale Closed", width: 12 },
  ];

  development.units.forEach((unit) => {
    unitSheet.addRow({
      "Unit Number": unit.unitNumber,
      "Type": unit.type,
      "Bedrooms": unit.bedrooms,
      "Construction Status": unit.constructionStatus,
      "Sales Status": unit.salesStatus,
      "List Price": unit.listPrice,
      "Sold Price": unit.soldPrice || "",
      "Purchaser Type": unit.purchaserType || "",
      "Part V": unit.partV ? "Yes" : "No",
      "Planned Close": unit.plannedCloseDate || "",
      "BCMS Received": unit.documentation?.bcmsReceived ? "Yes" : "No",
      "Land Registry": unit.documentation?.landRegistryApproved ? "Yes" : "No",
      "Homebond": unit.documentation?.homebondReceived ? "Yes" : "No",
      "Contract Signed": unit.documentation?.contractSigned ? "Yes" : "No",
      "Sale Closed": unit.documentation?.saleClosed ? "Yes" : "No",
    });
  });

  // Style header row
  unitSheet.getRow(1).font = { bold: true };

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
      case "12week-lookahead":
        doc = generate12WeekLookaheadPdf(options.selectedDevelopmentIds);
        break;
      case "sales-activity":
        doc = generateSalesActivityPdf();
        break;
      case "development":
        if (options.developmentId) {
          doc = generateDevelopmentDetailPdf(options.developmentId);
        }
        break;
    }

    if (doc) {
      result.pdf = doc.output("blob");
    }
  }

  // Generate Excel
  if (options.format === "excel" || options.format === "both") {
    let workbook: ExcelJS.Workbook | null = null;

    switch (options.type) {
      case "12week-lookahead":
        workbook = await generate12WeekLookaheadExcel(options.selectedDevelopmentIds);
        break;
      case "sales-activity":
        workbook = await generateSalesActivityExcel();
        break;
      case "development":
        if (options.developmentId) {
          workbook = await generateDevelopmentDetailExcel(options.developmentId);
        }
        break;
    }

    if (workbook) {
      const excelBuffer = await workbook.xlsx.writeBuffer();
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
    case "12week-lookahead":
      return `12-Week-Lookahead-${date}.${ext}`;
    case "sales-activity":
      return `Sales-Activity-4-Weeks-${date}.${ext}`;
    case "development":
      return `${(developmentName || "Development").replace(/\s+/g, "-")}-Report-${date}.${ext}`;
    default:
      return `Report-${date}.${ext}`;
  }
}

// Quick report functions
export async function download12WeekLookahead(format: ReportFormat = "pdf", selectedDevelopmentIds?: string[]): Promise<void> {
  const result = await generateReport({ type: "12week-lookahead", format, selectedDevelopmentIds });
  if (result.pdf) {
    downloadReport(result.pdf, getReportFilename("12week-lookahead", "pdf"));
  }
  if (result.excel) {
    downloadReport(result.excel, getReportFilename("12week-lookahead", "excel"));
  }
}

export async function downloadSalesActivity4Weeks(format: ReportFormat = "pdf"): Promise<void> {
  const result = await generateReport({ type: "sales-activity", format });
  if (result.pdf) {
    downloadReport(result.pdf, getReportFilename("sales-activity", "pdf"));
  }
  if (result.excel) {
    downloadReport(result.excel, getReportFilename("sales-activity", "excel"));
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

// Get list of developments for dropdown
export function getDevelopmentsList(): { id: string; name: string }[] {
  return developments.map((d) => ({ id: d.id, name: d.name }));
}

// Helper to get month key in "MMM 'YY" format (e.g., "Jan '24")
function getMonthKeyShort(date: Date): string {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const year = date.getFullYear().toString().slice(-2);
  return `${monthNames[date.getMonth()]} '${year}`;
}

// Helper to convert column number to Excel column letter (1=A, 2=B, etc.)
function getExcelColumn(colNum: number): string {
  let result = "";
  let num = colNum;
  while (num > 0) {
    const remainder = (num - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    num = Math.floor((num - 1) / 26);
  }
  return result;
}

// Interface for closed unit data
interface ClosedUnitData {
  developmentName: string;
  developmentId: string;
  unitNumber: string;
  soldPrice: number;
  closeMonth: string; // "MMM 'YY" format
  closeDate: Date;
  currency: Currency;
}

// Export cashflow data to Excel with unit breakdown by development
// New format: monthly columns, unit rows grouped by development, subtotals and grand total with formulas
export async function exportCashflowToExcel(
  _data: { month: string; [key: string]: string | number }[],
  _developmentsList: string[],
  dateFilter?: { fromDate?: string; toDate?: string }
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Cashflow Report");

  // Gather all closed/sold units from developments
  const closedUnits: ClosedUnitData[] = [];

  developments.forEach((dev) => {
    const devCurrency = dev.currency || "EUR";

    dev.units.forEach((unit) => {
      // Check if unit is sold/closed
      const closeDate = unit.documentation?.saleClosedDate ||
                       unit.keyDates?.actualClose ||
                       unit.closeDate;

      // Only include units that have a close date (actually closed)
      if (!closeDate) return;

      const closeDateObj = new Date(closeDate);
      const soldPrice = unit.soldPrice || unit.priceIncVat || unit.listPrice || 0;

      if (soldPrice > 0) {
        closedUnits.push({
          developmentName: dev.name,
          developmentId: dev.id,
          unitNumber: unit.unitNumber,
          soldPrice,
          closeMonth: getMonthKeyShort(closeDateObj),
          closeDate: closeDateObj,
          currency: devCurrency,
        });
      }
    });
  });

  // Apply date filter if provided
  let filteredUnits = closedUnits;
  if (dateFilter?.fromDate || dateFilter?.toDate) {
    filteredUnits = closedUnits.filter((unit) => {
      if (dateFilter.fromDate) {
        const fromDate = new Date(dateFilter.fromDate + "-01");
        if (unit.closeDate < fromDate) return false;
      }
      if (dateFilter.toDate) {
        const toDate = new Date(dateFilter.toDate + "-01");
        toDate.setMonth(toDate.getMonth() + 1);
        toDate.setDate(0); // Last day of toDate month
        if (unit.closeDate > toDate) return false;
      }
      return true;
    });
  }

  // Get all unique months and sort chronologically
  const monthsSet = new Set<string>();
  filteredUnits.forEach((unit) => monthsSet.add(unit.closeMonth));

  const months = Array.from(monthsSet).sort((a, b) => {
    const parseMonth = (m: string) => {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const parts = m.split(" '");
      const monthIndex = monthNames.indexOf(parts[0]);
      const year = 2000 + parseInt(parts[1]);
      return new Date(year, monthIndex, 1);
    };
    return parseMonth(a).getTime() - parseMonth(b).getTime();
  });

  // If no data, show empty report
  if (months.length === 0) {
    ws.addRow(["Cashflow Report"]);
    ws.addRow([`Generated: ${formatDate(new Date())}`]);
    ws.addRow(["No closed sales found for the selected period."]);

    const excelBuffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `Cashflow_Report_Empty.xlsx`);
    return;
  }

  // Group units by development
  const unitsByDevelopment: Record<string, ClosedUnitData[]> = {};
  filteredUnits.forEach((unit) => {
    if (!unitsByDevelopment[unit.developmentName]) {
      unitsByDevelopment[unit.developmentName] = [];
    }
    unitsByDevelopment[unit.developmentName].push(unit);
  });

  // Sort developments alphabetically
  const sortedDevelopments = Object.keys(unitsByDevelopment).sort();

  // Sort units within each development by unit number
  sortedDevelopments.forEach((devName) => {
    unitsByDevelopment[devName].sort((a, b) =>
      a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true })
    );
  });

  // Determine currency (use first development's currency, or EUR as fallback)
  const primaryCurrency = filteredUnits.length > 0 ? filteredUnits[0].currency : "EUR";
  const currencyFormat = primaryCurrency === "GBP" ? "£#,##0" : "€#,##0";

  // Calculate column count: Development/Unit + months + Total
  const totalColumns = 1 + months.length + 1;

  // ==================== ROW 1: Title ====================
  ws.addRow(["Cashflow Report"]);
  ws.mergeCells(1, 1, 1, totalColumns);
  const titleCell = ws.getCell("A1");
  titleCell.font = { bold: true, size: 16, color: { argb: "FF1E3A5F" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 28;

  // ==================== ROW 2: Generated Date ====================
  ws.addRow([`Generated: ${formatDate(new Date())}`]);
  ws.getCell("A2").font = { italic: true, size: 10, color: { argb: "FF666666" } };

  // ==================== ROW 3: Period ====================
  const startMonth = months[0];
  const endMonth = months[months.length - 1];
  ws.addRow([`Period: ${startMonth} to ${endMonth}`]);
  ws.getCell("A3").font = { italic: true, size: 10, color: { argb: "FF666666" } };

  // ==================== ROW 4: Header Row ====================
  const headerRow = ["Development/ Unit", ...months, "Total"];
  ws.addRow(headerRow);
  const headerRowNum = 4;
  const headerRowObj = ws.getRow(headerRowNum);
  headerRowObj.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
  headerRowObj.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A5F" }, // Dark blue
  };
  headerRowObj.alignment = { horizontal: "center", vertical: "middle" };
  headerRowObj.height = 22;

  // Add borders to header
  for (let col = 1; col <= totalColumns; col++) {
    const cell = ws.getCell(headerRowNum, col);
    cell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };
  }

  // Track row numbers for subtotals and grand total
  let currentRow = 5;
  const subTotalRows: number[] = [];
  const unitRowRanges: { devName: string; startRow: number; endRow: number }[] = [];

  // ==================== DATA ROWS ====================
  sortedDevelopments.forEach((devName) => {
    const devUnits = unitsByDevelopment[devName];

    // Development Name Row (bold, light blue background)
    const devRowData: (string | number | null)[] = [devName];
    for (let i = 0; i < months.length + 1; i++) {
      devRowData.push(null);
    }
    ws.addRow(devRowData);
    const devRow = ws.getRow(currentRow);
    devRow.font = { bold: true, size: 11 };
    devRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD6EAF8" }, // Light blue
    };
    devRow.height = 20;

    // Add borders
    for (let col = 1; col <= totalColumns; col++) {
      ws.getCell(currentRow, col).border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
      };
    }
    currentRow++;

    const unitStartRow = currentRow;

    // Unit Rows
    devUnits.forEach((unit) => {
      const unitRowData: (string | number | null)[] = [unit.unitNumber];

      // Add value for each month
      months.forEach((month) => {
        if (unit.closeMonth === month) {
          unitRowData.push(unit.soldPrice);
        } else {
          unitRowData.push(null);
        }
      });

      // Total formula for this row
      const firstDataCol = getExcelColumn(2);
      const lastDataCol = getExcelColumn(1 + months.length);
      unitRowData.push(null); // Placeholder, will set formula

      ws.addRow(unitRowData);

      // Set SUM formula for Total column
      const totalCell = ws.getCell(currentRow, totalColumns);
      totalCell.value = { formula: `SUM(${firstDataCol}${currentRow}:${lastDataCol}${currentRow})` };

      // Format currency cells
      for (let col = 2; col <= totalColumns; col++) {
        const cell = ws.getCell(currentRow, col);
        cell.numFmt = currencyFormat;
        cell.alignment = { horizontal: "right" };
        cell.border = {
          top: { style: "thin", color: { argb: "FFD0D0D0" } },
          left: { style: "thin", color: { argb: "FFD0D0D0" } },
          bottom: { style: "thin", color: { argb: "FFD0D0D0" } },
          right: { style: "thin", color: { argb: "FFD0D0D0" } },
        };
      }

      // First column border
      ws.getCell(currentRow, 1).border = {
        top: { style: "thin", color: { argb: "FFD0D0D0" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FFD0D0D0" } },
        right: { style: "thin", color: { argb: "FFD0D0D0" } },
      };

      currentRow++;
    });

    const unitEndRow = currentRow - 1;
    unitRowRanges.push({ devName, startRow: unitStartRow, endRow: unitEndRow });

    // Sub Total Row (bold, light gray background)
    const subTotalRowData: (string | number | null)[] = ["Sub Total"];

    // Add SUBTOTAL formulas for each month column
    for (let colIdx = 0; colIdx < months.length; colIdx++) {
      subTotalRowData.push(null); // Placeholder
    }
    subTotalRowData.push(null); // Total column placeholder

    ws.addRow(subTotalRowData);

    // Set SUBTOTAL formulas for each column
    for (let colIdx = 2; colIdx <= totalColumns; colIdx++) {
      const colLetter = getExcelColumn(colIdx);
      const cell = ws.getCell(currentRow, colIdx);
      cell.value = { formula: `SUBTOTAL(9,${colLetter}${unitStartRow}:${colLetter}${unitEndRow})` };
      cell.numFmt = currencyFormat;
      cell.alignment = { horizontal: "right" };
    }

    const subTotalRow = ws.getRow(currentRow);
    subTotalRow.font = { bold: true, size: 11 };
    subTotalRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8E8E8" }, // Light gray
    };
    subTotalRow.height = 20;

    // Add borders to subtotal row
    for (let col = 1; col <= totalColumns; col++) {
      ws.getCell(currentRow, col).border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
      };
    }

    subTotalRows.push(currentRow);
    currentRow++;
  });

  // ==================== GRAND TOTAL ROW ====================
  const grandTotalRowData: (string | number | null)[] = ["Grand Total"];
  for (let i = 0; i < months.length + 1; i++) {
    grandTotalRowData.push(null);
  }
  ws.addRow(grandTotalRowData);

  // Set SUM formulas referencing all Sub Total rows
  // Note: Using SUM instead of SUBTOTAL because SUBTOTAL doesn't support comma-separated cell refs
  for (let colIdx = 2; colIdx <= totalColumns; colIdx++) {
    const colLetter = getExcelColumn(colIdx);
    const subTotalRefs = subTotalRows.map((row) => `${colLetter}${row}`).join(",");
    const cell = ws.getCell(currentRow, colIdx);
    cell.value = { formula: `SUM(${subTotalRefs})` };
    cell.numFmt = currencyFormat;
    cell.alignment = { horizontal: "right" };
  }

  const grandTotalRow = ws.getRow(currentRow);
  grandTotalRow.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
  grandTotalRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A5F" }, // Dark blue (same as header)
  };
  grandTotalRow.height = 24;

  // Add borders to grand total row
  for (let col = 1; col <= totalColumns; col++) {
    ws.getCell(currentRow, col).border = {
      top: { style: "medium", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "medium", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };
  }

  // ==================== COLUMN WIDTHS ====================
  ws.getColumn(1).width = 25; // Development/Unit column
  for (let col = 2; col <= months.length + 1; col++) {
    ws.getColumn(col).width = 12; // Month columns
  }
  ws.getColumn(totalColumns).width = 14; // Total column

  // ==================== FREEZE PANES ====================
  // Freeze header row (row 4) and first column (column A)
  ws.views = [
    {
      state: "frozen",
      xSplit: 1,
      ySplit: 4,
      topLeftCell: "B5",
      activeCell: "B5",
    },
  ];

  // ==================== GENERATE FILE ====================
  const excelBuffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  // Generate filename with date range
  const startDateStr = startMonth.replace(" '", "").replace("'", "");
  const endDateStr = endMonth.replace(" '", "").replace("'", "");
  saveAs(blob, `Cashflow_Report_${startDateStr}_to_${endDateStr}.xlsx`);
}
