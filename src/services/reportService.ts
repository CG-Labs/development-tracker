import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { developments } from "../data/realDevelopments";
import type { Development, Unit } from "../types";
import { formatCurrencyGBP } from "../utils/formatCurrency";

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

function generate12WeekLookaheadPdf(selectedDevelopmentIds?: string[]): jsPDF {
  const doc = new jsPDF({ orientation: "landscape" });
  const allUnits = get12WeekLookaheadUnits(selectedDevelopmentIds);
  const pastDueCount = allUnits.filter((u) => u.isPastDue).length;

  let y = addPdfHeader(
    doc,
    "12 Week Lookahead Report",
    `${allUnits.length} units | ${pastDueCount} past due`
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

  // Tick/cross symbols with colors
  const tick = "\u2713";
  const cross = "\u2717";

  // Generate tables for each development
  sortedDevelopments.forEach((devName, index) => {
    const devUnits = unitsByDevelopment[devName];
    const devPastDue = devUnits.filter((u) => u.isPastDue).length;

    if (index > 0 || y > 60) {
      if (y > 150) {
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

    // Build table data with tick/cross matrix
    const tableData = devUnits.map((u) => {
      const doc = u.unit.documentation;
      return [
        u.unit.unitNumber,
        u.unit.type,
        u.unit.salesStatus,
        formatDateShort(u.unit.plannedCloseDate),
        u.isPastDue && u.daysOverdue ? `${u.daysOverdue}` : "",
        doc?.bcmsReceived ? tick : cross,
        doc?.landRegistryApproved ? tick : cross,
        doc?.homebondReceived ? tick : cross,
        doc?.sanApproved ? tick : cross,
        doc?.contractIssued ? tick : cross,
        doc?.contractSigned ? tick : cross,
        doc?.saleClosed ? tick : cross,
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [[
        "Unit",
        "Type",
        "Status",
        "Planned Close",
        "Days O/D",
        "BCMS",
        "Land Reg",
        "Homebond",
        "SAN",
        "Contract Out",
        "Contract In",
        "Closed",
      ]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [6, 182, 212], textColor: [255, 255, 255], fontSize: 7 },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 25 },
        2: { cellWidth: 22 },
        3: { cellWidth: 22 },
        4: { cellWidth: 16, halign: "center" },
        5: { cellWidth: 14, halign: "center" },
        6: { cellWidth: 14, halign: "center" },
        7: { cellWidth: 16, halign: "center" },
        8: { cellWidth: 12, halign: "center" },
        9: { cellWidth: 20, halign: "center" },
        10: { cellWidth: 18, halign: "center" },
        11: { cellWidth: 14, halign: "center" },
      },
      didParseCell: (data) => {
        // Color the tick/cross columns
        if (data.section === "body" && data.column.index >= 5) {
          const value = data.cell.raw as string;
          if (value === tick) {
            data.cell.styles.textColor = [34, 197, 94]; // Green #22c55e
            data.cell.styles.fontStyle = "bold";
          } else if (value === cross) {
            data.cell.styles.textColor = [239, 68, 68]; // Red #ef4444
            data.cell.styles.fontStyle = "bold";
          }
        }
        // Highlight overdue rows
        if (data.section === "body") {
          const rowIndex = data.row.index;
          if (devUnits[rowIndex]?.isPastDue) {
            data.cell.styles.fillColor = [254, 226, 226]; // Light red background
          }
        }
        // Color Days Overdue column
        if (data.section === "body" && data.column.index === 4) {
          const value = data.cell.raw as string;
          if (value && value !== "") {
            data.cell.styles.textColor = [239, 68, 68]; // Red
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  });

  addPdfFooter(doc);
  return doc;
}

function generate12WeekLookaheadExcel(selectedDevelopmentIds?: string[]): XLSX.WorkBook {
  const allUnits = get12WeekLookaheadUnits(selectedDevelopmentIds);
  const wb = XLSX.utils.book_new();

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
  const summaryData = [
    ["12 Week Lookahead Report", formatDate(new Date())],
    [],
    ["SUMMARY"],
    ["Metric", "Count"],
    ["Total Units in Lookahead", allUnits.length],
    ["Past Due", pastDueCount],
    [],
    ["BY DEVELOPMENT"],
    ["Development", "Units", "Past Due"],
    ...Object.keys(unitsByDevelopment).sort().map((devName) => [
      devName,
      unitsByDevelopment[devName].length,
      unitsByDevelopment[devName].filter((u) => u.isPastDue).length,
    ]),
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // All Units sheet with tick/cross
  const allUnitsData = allUnits.map((u) => ({
    "Development": u.developmentName,
    "Unit Number": u.unit.unitNumber,
    "Unit Type": u.unit.type,
    "Sales Status": u.unit.salesStatus,
    "Planned Close Date": formatDateDDMMYYYY(u.unit.plannedCloseDate),
    "Days Overdue": u.isPastDue && u.daysOverdue ? u.daysOverdue : "",
    "BCMS Received": u.unit.documentation?.bcmsReceived ? "Yes" : "No",
    "Land Registry Approved": u.unit.documentation?.landRegistryApproved ? "Yes" : "No",
    "Homebond Received": u.unit.documentation?.homebondReceived ? "Yes" : "No",
    "SAN Approved": u.unit.documentation?.sanApproved ? "Yes" : "No",
    "Contract Issued": u.unit.documentation?.contractIssued ? "Yes" : "No",
    "Contract Signed": u.unit.documentation?.contractSigned ? "Yes" : "No",
    "Sale Closed": u.unit.documentation?.saleClosed ? "Yes" : "No",
  }));

  // Sort by development then by planned close date
  allUnitsData.sort((a, b) => {
    if (a.Development !== b.Development) {
      return a.Development.localeCompare(b.Development);
    }
    return (a["Planned Close Date"] || "").localeCompare(b["Planned Close Date"] || "");
  });

  const allUnitsSheet = XLSX.utils.json_to_sheet(allUnitsData);
  XLSX.utils.book_append_sheet(wb, allUnitsSheet, "All Units");

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
}

function getSalesActivityUnits(): SalesActivityUnit[] {
  const now = new Date();
  const fourWeeksAgo = new Date(now.getTime() - 4 * 7 * 24 * 60 * 60 * 1000);
  const units: SalesActivityUnit[] = [];

  developments.forEach((dev) => {
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

  let y = addPdfHeader(
    doc,
    "Sales Activity - Last 4 Weeks",
    `${units.length} transactions | ${formatCurrencyGBP(totalValue)} total value`
  );

  // Activity by Week with Total Value
  y = addSectionTitle(doc, "Activity by Week", y);

  const weekLabels = ["This Week", "1 Week Ago", "2 Weeks Ago", "3 Weeks Ago", "4 Weeks Ago"];
  const weekData = weekLabels.map((label, index) => {
    const weekUnits = units.filter((u) => u.weeksAgo === index);
    const weekValue = weekUnits.reduce((sum, u) => sum + u.value, 0);
    return [label, weekUnits.length.toString(), formatCurrencyGBP(weekValue)];
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
    return [type, typeUnits.length.toString(), formatCurrencyGBP(typeValue)];
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
    let grandTotal = 0;

    sortedDevelopments.forEach((devName) => {
      const devUnits = unitsByDevelopment[devName];
      const devTotal = devUnits.reduce((sum, u) => sum + u.value, 0);
      grandTotal += devTotal;

      if (y > 170) {
        doc.addPage();
        y = 20;
      }

      // Development header
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`${devName}`, 14, y);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Total: ${formatCurrencyGBP(devTotal)}`, 100, y);
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
        doc.text(`  ${actType} (${typeUnits.length} units - ${formatCurrencyGBP(typeTotal)})`, 14, y);
        y += 5;

        // Unit details table
        const detailData = typeUnits.map((u) => [
          u.unit.unitNumber,
          u.unit.type,
          formatCurrencyGBP(u.value),
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

    // Grand Total
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`Grand Total: ${formatCurrencyGBP(grandTotal)}`, 14, y + 5);
  } else {
    doc.setFontSize(12);
    doc.setFont("helvetica", "italic");
    doc.text("No sales activity in the last 4 weeks.", 14, y);
  }

  addPdfFooter(doc);
  return doc;
}

function generateSalesActivityExcel(): XLSX.WorkBook {
  const units = getSalesActivityUnits();
  const wb = XLSX.utils.book_new();

  // Summary sheet with values
  const activityTypes: Array<"SAN Approved" | "Contract Signed" | "Sale Closed"> = ["SAN Approved", "Contract Signed", "Sale Closed"];

  const summaryData = [
    ["Sales Activity - Last 4 Weeks", formatDate(new Date())],
    [],
    ["SUMMARY BY TYPE"],
    ["Activity Type", "Count", "Value"],
    ...activityTypes.map((type) => {
      const typeUnits = units.filter((u) => u.activityType === type);
      const typeValue = typeUnits.reduce((sum, u) => sum + u.value, 0);
      return [type, typeUnits.length, typeValue];
    }),
    [],
    ["SUMMARY BY WEEK"],
    ["Period", "Count", "Value"],
    ...["This Week", "1 Week Ago", "2 Weeks Ago", "3 Weeks Ago", "4 Weeks Ago"].map((label, index) => {
      const weekUnits = units.filter((u) => u.weeksAgo === index);
      const weekValue = weekUnits.reduce((sum, u) => sum + u.value, 0);
      return [label, weekUnits.length, weekValue];
    }),
    [],
    ["GRAND TOTAL", units.length, units.reduce((sum, u) => sum + u.value, 0)],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // Grouped by Development sheet
  const groupedData: (string | number)[][] = [
    ["Development", "Activity Type", "Unit Count", "Total Value"],
  ];

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
        groupedData.push([devName, actType, typeUnits.length, typeValue]);
      }
    });

    groupedData.push([`${devName} Total`, "", devUnits.length, devTotal]);
    groupedData.push(["", "", "", ""]);
  });

  const groupedSheet = XLSX.utils.aoa_to_sheet(groupedData);
  XLSX.utils.book_append_sheet(wb, groupedSheet, "By Development");

  // All Transactions sheet
  const allData = units.map((u) => ({
    "Development": u.developmentName,
    "Unit Number": u.unit.unitNumber,
    "Unit Type": u.unit.type,
    "Activity Type": u.activityType,
    "Activity Date": formatDateDDMMYYYY(u.activityDate),
    "Weeks Ago": u.weeksAgo,
    "Value": u.value,
  }));
  const allSheet = XLSX.utils.json_to_sheet(allData);
  XLSX.utils.book_append_sheet(wb, allSheet, "All Transactions");

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
    "Planned Close": unit.plannedCloseDate || "",
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
    let workbook: XLSX.WorkBook | null = null;

    switch (options.type) {
      case "12week-lookahead":
        workbook = generate12WeekLookaheadExcel(options.selectedDevelopmentIds);
        break;
      case "sales-activity":
        workbook = generateSalesActivityExcel();
        break;
      case "development":
        if (options.developmentId) {
          workbook = generateDevelopmentDetailExcel(options.developmentId);
        }
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

// Export cashflow data to Excel with proper layout
// Dates as columns, Developments as rows
export function exportCashflowToExcel(
  data: { month: string; [key: string]: string | number }[],
  developmentsList: string[]
): void {
  const wb = XLSX.utils.book_new();

  // Get all unique periods (months) from data
  const periods = data.map((d) => d.month as string);

  // Build the worksheet data
  const wsData: (string | number)[][] = [];

  // Row 1: Title (merged)
  wsData.push(["Cashflow Report"]);

  // Row 2: Generated date
  wsData.push([`Generated: ${formatDate(new Date())}`]);

  // Row 3: Period range
  const startPeriod = periods[0] || "";
  const endPeriod = periods[periods.length - 1] || "";
  wsData.push([`Period: ${startPeriod} to ${endPeriod}`]);

  // Row 4: Empty
  wsData.push([]);

  // Row 5: Header row (Development | Period1 | Period2 | ... | Total)
  const headerRow: (string | number)[] = ["Development", ...periods, "Total"];
  wsData.push(headerRow);

  // Row 6+: Data rows (one per development)
  developmentsList.forEach((devName) => {
    const row: (string | number)[] = [devName];
    let devTotal = 0;

    periods.forEach((period) => {
      const periodData = data.find((d) => d.month === period);
      const value = periodData ? (Number(periodData[devName]) || 0) : 0;
      row.push(value);
      devTotal += value;
    });

    row.push(devTotal);
    wsData.push(row);
  });

  // Total row
  const totalRow: (string | number)[] = ["TOTAL"];
  let grandTotal = 0;

  periods.forEach((period) => {
    const periodData = data.find((d) => d.month === period);
    let periodTotal = 0;
    developmentsList.forEach((devName) => {
      periodTotal += periodData ? (Number(periodData[devName]) || 0) : 0;
    });
    totalRow.push(periodTotal);
    grandTotal += periodTotal;
  });
  totalRow.push(grandTotal);
  wsData.push(totalRow);

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  const colWidths: { wch: number }[] = [{ wch: 25 }]; // First column (Development names)
  periods.forEach(() => colWidths.push({ wch: 15 }));
  colWidths.push({ wch: 15 }); // Total column
  ws["!cols"] = colWidths;

  // Merge title cell
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: periods.length + 1 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Cash Flow");

  // Generate file
  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const date = new Date().toISOString().split("T")[0];
  saveAs(blob, `Cash-Flow-Report-${date}.xlsx`);
}
