import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { developments } from "../data/realDevelopments";
import type { Development, Unit } from "../types";

// Types
export type ReportType = "12week-lookahead" | "sales-activity" | "development";
export type ReportFormat = "pdf" | "excel" | "both";

export interface ReportOptions {
  type: ReportType;
  format: ReportFormat;
  developmentId?: string;
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
// ==========================================

interface LookaheadUnit {
  developmentName: string;
  unit: Unit;
  weeksUntilClose: number | null;
  isPastDue: boolean;
}

function get12WeekLookaheadUnits(): LookaheadUnit[] {
  const now = new Date();
  const twelveWeeksFromNow = new Date(now.getTime() + 12 * 7 * 24 * 60 * 60 * 1000);
  const units: LookaheadUnit[] = [];

  developments.forEach((dev) => {
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
        const diffMs = plannedClose.getTime() - now.getTime();
        const weeksUntilClose = Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000));

        units.push({
          developmentName: dev.name,
          unit,
          weeksUntilClose: isPastDue ? null : weeksUntilClose,
          isPastDue,
        });
      }
    });
  });

  // Sort by planned close date (past due first, then by date)
  units.sort((a, b) => {
    if (a.isPastDue && !b.isPastDue) return -1;
    if (!a.isPastDue && b.isPastDue) return 1;
    const dateA = new Date(a.unit.plannedCloseDate!).getTime();
    const dateB = new Date(b.unit.plannedCloseDate!).getTime();
    return dateA - dateB;
  });

  return units;
}

function generate12WeekLookaheadPdf(): jsPDF {
  const doc = new jsPDF({ orientation: "landscape" });
  const units = get12WeekLookaheadUnits();
  const pastDueCount = units.filter((u) => u.isPastDue).length;

  let y = addPdfHeader(
    doc,
    "12 Week Lookahead Report",
    `${units.length} units | ${pastDueCount} past due`
  );

  // Summary section
  y = addSectionTitle(doc, "Summary", y);

  const summaryData = [
    ["Total Units in Lookahead", units.length.toString()],
    ["Past Due", pastDueCount.toString()],
    ["Due This Week", units.filter((u) => u.weeksUntilClose !== null && u.weeksUntilClose <= 1).length.toString()],
    ["Due in 2-4 Weeks", units.filter((u) => u.weeksUntilClose !== null && u.weeksUntilClose > 1 && u.weeksUntilClose <= 4).length.toString()],
    ["Due in 5-8 Weeks", units.filter((u) => u.weeksUntilClose !== null && u.weeksUntilClose > 4 && u.weeksUntilClose <= 8).length.toString()],
    ["Due in 9-12 Weeks", units.filter((u) => u.weeksUntilClose !== null && u.weeksUntilClose > 8).length.toString()],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Count"]],
    body: summaryData,
    theme: "striped",
    headStyles: { fillColor: [6, 182, 212], textColor: [255, 255, 255] },
    margin: { left: 14, right: 14 },
    tableWidth: 120,
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  // Past Due section
  const pastDueUnits = units.filter((u) => u.isPastDue);
  if (pastDueUnits.length > 0) {
    if (y > 150) {
      doc.addPage();
      y = 20;
    }

    y = addSectionTitle(doc, `Past Due Units (${pastDueUnits.length})`, y);

    const pastDueData = pastDueUnits.map((u) => [
      u.developmentName,
      u.unit.unitNumber,
      u.unit.type,
      u.unit.salesStatus,
      formatDateShort(u.unit.plannedCloseDate),
      formatCurrency(u.unit.priceIncVat || u.unit.listPrice),
      u.unit.purchaserName || "-",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Development", "Unit", "Type", "Sales Status", "Planned Close", "Price", "Purchaser"]],
      body: pastDueData,
      theme: "striped",
      headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 },
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  }

  // Upcoming units section
  const upcomingUnits = units.filter((u) => !u.isPastDue);
  if (upcomingUnits.length > 0) {
    if (y > 150) {
      doc.addPage();
      y = 20;
    }

    y = addSectionTitle(doc, `Upcoming Closes (${upcomingUnits.length})`, y);

    const upcomingData = upcomingUnits.map((u) => [
      u.developmentName,
      u.unit.unitNumber,
      u.unit.type,
      u.unit.salesStatus,
      formatDateShort(u.unit.plannedCloseDate),
      u.weeksUntilClose !== null ? `${u.weeksUntilClose} weeks` : "-",
      formatCurrency(u.unit.priceIncVat || u.unit.listPrice),
      u.unit.purchaserName || "-",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Development", "Unit", "Type", "Sales Status", "Planned Close", "Time Left", "Price", "Purchaser"]],
      body: upcomingData,
      theme: "striped",
      headStyles: { fillColor: [6, 182, 212], textColor: [255, 255, 255] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 },
    });
  }

  addPdfFooter(doc);
  return doc;
}

function generate12WeekLookaheadExcel(): XLSX.WorkBook {
  const units = get12WeekLookaheadUnits();
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const pastDueCount = units.filter((u) => u.isPastDue).length;
  const summaryData = [
    ["12 Week Lookahead Report", formatDate(new Date())],
    [],
    ["SUMMARY"],
    ["Metric", "Count"],
    ["Total Units in Lookahead", units.length],
    ["Past Due", pastDueCount],
    ["Due This Week", units.filter((u) => u.weeksUntilClose !== null && u.weeksUntilClose <= 1).length],
    ["Due in 2-4 Weeks", units.filter((u) => u.weeksUntilClose !== null && u.weeksUntilClose > 1 && u.weeksUntilClose <= 4).length],
    ["Due in 5-8 Weeks", units.filter((u) => u.weeksUntilClose !== null && u.weeksUntilClose > 4 && u.weeksUntilClose <= 8).length],
    ["Due in 9-12 Weeks", units.filter((u) => u.weeksUntilClose !== null && u.weeksUntilClose > 8).length],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // All Units sheet
  const allUnitsData = units.map((u) => ({
    "Development": u.developmentName,
    "Unit Number": u.unit.unitNumber,
    "Unit Type": u.unit.type,
    "Bedrooms": u.unit.bedrooms,
    "Sales Status": u.unit.salesStatus,
    "Construction Status": u.unit.constructionStatus,
    "Planned Close Date": formatDateDDMMYYYY(u.unit.plannedCloseDate),
    "Status": u.isPastDue ? "PAST DUE" : `${u.weeksUntilClose} weeks`,
    "Price Inc VAT": u.unit.priceIncVat || u.unit.listPrice,
    "Purchaser Type": u.unit.purchaserType || "",
    "Purchaser Name": u.unit.purchaserName || "",
    "Purchaser Phone": u.unit.purchaserPhone || "",
    "Purchaser Email": u.unit.purchaserEmail || "",
    "BCMS Received": u.unit.documentation?.bcmsReceived ? "Yes" : "No",
    "Contract Signed": u.unit.documentation?.contractSigned ? "Yes" : "No",
  }));
  const allUnitsSheet = XLSX.utils.json_to_sheet(allUnitsData);
  XLSX.utils.book_append_sheet(wb, allUnitsSheet, "All Units");

  // Past Due sheet
  const pastDueUnits = units.filter((u) => u.isPastDue);
  if (pastDueUnits.length > 0) {
    const pastDueData = pastDueUnits.map((u) => ({
      "Development": u.developmentName,
      "Unit Number": u.unit.unitNumber,
      "Unit Type": u.unit.type,
      "Sales Status": u.unit.salesStatus,
      "Planned Close Date": formatDateDDMMYYYY(u.unit.plannedCloseDate),
      "Price Inc VAT": u.unit.priceIncVat || u.unit.listPrice,
      "Purchaser Name": u.unit.purchaserName || "",
      "Purchaser Phone": u.unit.purchaserPhone || "",
    }));
    const pastDueSheet = XLSX.utils.json_to_sheet(pastDueData);
    XLSX.utils.book_append_sheet(wb, pastDueSheet, "Past Due");
  }

  return wb;
}

// ==========================================
// Sales Activity - Last 4 Weeks Report
// Shows sales activity over the last 4 weeks
// ==========================================

interface SalesActivityUnit {
  developmentName: string;
  unit: Unit;
  activityType: "Sale Closed" | "Contract Signed" | "Under Offer" | "For Sale";
  activityDate: string;
  weeksAgo: number;
}

function getSalesActivityUnits(): SalesActivityUnit[] {
  const now = new Date();
  const fourWeeksAgo = new Date(now.getTime() - 4 * 7 * 24 * 60 * 60 * 1000);
  const units: SalesActivityUnit[] = [];

  developments.forEach((dev) => {
    dev.units.forEach((unit) => {
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
          });
        }
      }

      // Check for contract signed in last 4 weeks (but not sale closed)
      if (unit.documentation?.contractSignedDate && !unit.documentation?.saleClosedDate) {
        const date = new Date(unit.documentation.contractSignedDate);
        if (date >= fourWeeksAgo && date <= now) {
          const weeksAgo = Math.floor((now.getTime() - date.getTime()) / (7 * 24 * 60 * 60 * 1000));
          units.push({
            developmentName: dev.name,
            unit,
            activityType: "Contract Signed",
            activityDate: unit.documentation.contractSignedDate,
            weeksAgo,
          });
        }
      }

      // Check closeDate as proxy for recent activity
      if (unit.closeDate) {
        const date = new Date(unit.closeDate);
        if (date >= fourWeeksAgo && date <= now) {
          // Only add if not already added
          const exists = units.some(
            (u) => u.unit.unitNumber === unit.unitNumber && u.developmentName === dev.name
          );
          if (!exists) {
            const weeksAgo = Math.floor((now.getTime() - date.getTime()) / (7 * 24 * 60 * 60 * 1000));
            units.push({
              developmentName: dev.name,
              unit,
              activityType: unit.salesStatus === "Complete" ? "Sale Closed" : "Contract Signed",
              activityDate: unit.closeDate,
              weeksAgo,
            });
          }
        }
      }
    });
  });

  // Sort by activity date (most recent first)
  units.sort((a, b) => {
    const dateA = new Date(a.activityDate).getTime();
    const dateB = new Date(b.activityDate).getTime();
    return dateB - dateA;
  });

  return units;
}

function generateSalesActivityPdf(): jsPDF {
  const doc = new jsPDF({ orientation: "landscape" });
  const units = getSalesActivityUnits();
  const totalValue = units.reduce((sum, u) => sum + (u.unit.soldPrice || u.unit.priceIncVat || u.unit.listPrice || 0), 0);

  let y = addPdfHeader(
    doc,
    "Sales Activity - Last 4 Weeks",
    `${units.length} transactions | ${formatCurrency(totalValue)} total value`
  );

  // Summary by week
  y = addSectionTitle(doc, "Activity by Week", y);

  const weekData = [
    ["This Week", units.filter((u) => u.weeksAgo === 0).length.toString()],
    ["1 Week Ago", units.filter((u) => u.weeksAgo === 1).length.toString()],
    ["2 Weeks Ago", units.filter((u) => u.weeksAgo === 2).length.toString()],
    ["3 Weeks Ago", units.filter((u) => u.weeksAgo === 3).length.toString()],
    ["4 Weeks Ago", units.filter((u) => u.weeksAgo === 4).length.toString()],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Period", "Transactions"]],
    body: weekData,
    theme: "striped",
    headStyles: { fillColor: [6, 182, 212], textColor: [255, 255, 255] },
    margin: { left: 14, right: 14 },
    tableWidth: 120,
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  // Summary by activity type
  y = addSectionTitle(doc, "Activity by Type", y);

  const salesClosed = units.filter((u) => u.activityType === "Sale Closed");
  const contractsSigned = units.filter((u) => u.activityType === "Contract Signed");

  const typeData = [
    ["Sales Closed", salesClosed.length.toString(), formatCurrency(salesClosed.reduce((sum, u) => sum + (u.unit.soldPrice || u.unit.listPrice || 0), 0))],
    ["Contracts Signed", contractsSigned.length.toString(), formatCurrency(contractsSigned.reduce((sum, u) => sum + (u.unit.priceIncVat || u.unit.listPrice || 0), 0))],
  ];

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

  // Detailed list
  if (units.length > 0) {
    if (y > 130) {
      doc.addPage();
      y = 20;
    }

    y = addSectionTitle(doc, "Transaction Details", y);

    const detailData = units.map((u) => [
      u.developmentName,
      u.unit.unitNumber,
      u.unit.type,
      u.activityType,
      formatDateShort(u.activityDate),
      formatCurrency(u.unit.soldPrice || u.unit.priceIncVat || u.unit.listPrice),
      u.unit.purchaserType || "-",
      u.unit.purchaserName || "-",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Development", "Unit", "Type", "Activity", "Date", "Value", "Purchaser Type", "Purchaser"]],
      body: detailData,
      theme: "striped",
      headStyles: { fillColor: [6, 182, 212], textColor: [255, 255, 255] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 },
    });
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

  // Summary sheet
  const salesClosed = units.filter((u) => u.activityType === "Sale Closed");
  const contractsSigned = units.filter((u) => u.activityType === "Contract Signed");

  const summaryData = [
    ["Sales Activity - Last 4 Weeks", formatDate(new Date())],
    [],
    ["SUMMARY"],
    ["Metric", "Count", "Value"],
    ["Total Transactions", units.length, units.reduce((sum, u) => sum + (u.unit.soldPrice || u.unit.priceIncVat || u.unit.listPrice || 0), 0)],
    ["Sales Closed", salesClosed.length, salesClosed.reduce((sum, u) => sum + (u.unit.soldPrice || u.unit.listPrice || 0), 0)],
    ["Contracts Signed", contractsSigned.length, contractsSigned.reduce((sum, u) => sum + (u.unit.priceIncVat || u.unit.listPrice || 0), 0)],
    [],
    ["BY WEEK"],
    ["Period", "Count"],
    ["This Week", units.filter((u) => u.weeksAgo === 0).length],
    ["1 Week Ago", units.filter((u) => u.weeksAgo === 1).length],
    ["2 Weeks Ago", units.filter((u) => u.weeksAgo === 2).length],
    ["3 Weeks Ago", units.filter((u) => u.weeksAgo === 3).length],
    ["4 Weeks Ago", units.filter((u) => u.weeksAgo === 4).length],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // All Transactions sheet
  const allData = units.map((u) => ({
    "Development": u.developmentName,
    "Unit Number": u.unit.unitNumber,
    "Unit Type": u.unit.type,
    "Bedrooms": u.unit.bedrooms,
    "Activity Type": u.activityType,
    "Activity Date": formatDateDDMMYYYY(u.activityDate),
    "Weeks Ago": u.weeksAgo,
    "Sale Price": u.unit.soldPrice || "",
    "Price Inc VAT": u.unit.priceIncVat || u.unit.listPrice,
    "Purchaser Type": u.unit.purchaserType || "",
    "Purchaser Name": u.unit.purchaserName || "",
    "Purchaser Phone": u.unit.purchaserPhone || "",
    "Purchaser Email": u.unit.purchaserEmail || "",
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
        doc = generate12WeekLookaheadPdf();
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
        workbook = generate12WeekLookaheadExcel();
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
export async function download12WeekLookahead(format: ReportFormat = "pdf"): Promise<void> {
  const result = await generateReport({ type: "12week-lookahead", format });
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

// Export cashflow data to Excel
export function exportCashflowToExcel(
  data: { month: string; [key: string]: string | number }[],
  developments: string[]
): void {
  const wb = XLSX.utils.book_new();

  // Create data rows
  const rows = data.map((item) => {
    const row: Record<string, string | number> = { Month: item.month };
    developments.forEach((dev) => {
      row[dev] = item[dev] || 0;
    });
    row["Total"] = developments.reduce((sum, dev) => sum + (Number(item[dev]) || 0), 0);
    return row;
  });

  const sheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  const colWidths = [{ wch: 12 }]; // Month column
  developments.forEach(() => colWidths.push({ wch: 20 }));
  colWidths.push({ wch: 15 }); // Total column
  sheet["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, sheet, "Cash Flow");

  // Generate file
  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const date = new Date().toISOString().split("T")[0];
  saveAs(blob, `Cash-Flow-Forecast-${date}.xlsx`);
}
