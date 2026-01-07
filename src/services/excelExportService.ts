import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { developments } from "../data/realDevelopments";
import type { Development, Unit } from "../types";

interface ExportRow {
  "Development Name": string;
  "Unit Number": string;
  "Unit Type": string;
  "Address": string;
  "Construction Unit Type": string;
  "Construction Phase": string;
  "Bedrooms": number | string; // Can be number or string like "Studio", "1 Bed"
  "Size (m²)": number | string;
  "Construction Status": string;
  "Sales Status": string;
  "BCMS Approved": string;
  "Homebond Approved": string;
  "BER Approved": string;
  "Developer Company": string;
  "List Price": number | string;
  "Sold Price": number | string;
  "Price Ex VAT": number | string;
  "Price Inc VAT": number | string;
  "Purchaser Type": string;
  "Part V": string;
  "Purchaser Name": string;
  "Purchaser Phone": string;
  "Purchaser Email": string;
  // Key Dates (4 simplified dates)
  "Planned BCMS": string;
  "Actual BCMS": string;
  "Planned Close": string;
  "Actual Close": string;
  // Completion Documentation (8 items - date only, Yes/No derived from date)
  "BCMS Submit Date": string;
  "BCMS Approved Date": string;
  "Homebond Submit Date": string;
  "Homebond Approved Date": string;
  "BER Approved Date": string;
  "FC Compliance Received Date": string;
  "Land Map Submit Date": string;
  "Land Map Received Date": string;
  // Sales Documentation (4 items - date only)
  "SAN Approved Date": string;
  "Contract Issued Date": string;
  "Contract Signed Date": string;
  "Sale Closed Date": string;
  // Incentive
  "Incentive Scheme": string;
  "Incentive Status": string;
  "Notes Count": number;
}

function formatDateDDMMYYYY(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "";
  }
}

function unitToExportRow(unit: Unit, developmentName: string, notesCount: number = 0): ExportRow {
  return {
    "Development Name": developmentName,
    "Unit Number": unit.unitNumber,
    "Unit Type": unit.type,
    "Address": unit.address || "",
    "Construction Unit Type": unit.constructionUnitType || "",
    "Construction Phase": unit.constructionPhase || "",
    "Bedrooms": unit.bedrooms,
    "Size (m²)": unit.size || "",
    "Construction Status": unit.constructionStatus,
    "Sales Status": unit.salesStatus,
    "BCMS Approved": unit.documentation?.bcmsApprovedDate ? "Yes" : "No",
    "Homebond Approved": unit.documentation?.homebondApprovedDate ? "Yes" : "No",
    "BER Approved": unit.documentation?.berApprovedDate ? "Yes" : "No",
    "Developer Company": unit.developerCompanyId || "",
    "List Price": unit.listPrice || "",
    "Sold Price": unit.soldPrice || "",
    "Price Ex VAT": unit.priceExVat || "",
    "Price Inc VAT": unit.priceIncVat || unit.listPrice || "",
    "Purchaser Type": unit.purchaserType || "Private",
    "Part V": unit.partV ? "Yes" : "No",
    "Purchaser Name": unit.purchaserName || "",
    "Purchaser Phone": unit.purchaserPhone || "",
    "Purchaser Email": unit.purchaserEmail || "",
    // Key Dates (Actual dates derived from documentation)
    "Planned BCMS": formatDateDDMMYYYY(unit.keyDates?.plannedBcms),
    "Actual BCMS": formatDateDDMMYYYY(unit.documentation.bcmsApprovedDate),
    "Planned Close": formatDateDDMMYYYY(unit.keyDates?.plannedClose),
    "Actual Close": formatDateDDMMYYYY(unit.documentation.saleClosedDate),
    // Completion Documentation (date only - Yes/No is derived from having a date)
    "BCMS Submit Date": formatDateDDMMYYYY(unit.documentation.bcmsSubmitDate),
    "BCMS Approved Date": formatDateDDMMYYYY(unit.documentation.bcmsApprovedDate),
    "Homebond Submit Date": formatDateDDMMYYYY(unit.documentation.homebondSubmitDate),
    "Homebond Approved Date": formatDateDDMMYYYY(unit.documentation.homebondApprovedDate),
    "BER Approved Date": formatDateDDMMYYYY(unit.documentation.berApprovedDate),
    "FC Compliance Received Date": formatDateDDMMYYYY(unit.documentation.fcComplianceReceivedDate),
    "Land Map Submit Date": formatDateDDMMYYYY(unit.documentation.landMapSubmitDate),
    "Land Map Received Date": formatDateDDMMYYYY(unit.documentation.landMapReceivedDate),
    // Sales Documentation (date only)
    "SAN Approved Date": formatDateDDMMYYYY(unit.documentation.sanApprovedDate),
    "Contract Issued Date": formatDateDDMMYYYY(unit.documentation.contractIssuedDate),
    "Contract Signed Date": formatDateDDMMYYYY(unit.documentation.contractSignedDate),
    "Sale Closed Date": formatDateDDMMYYYY(unit.documentation.saleClosedDate),
    // Incentive
    "Incentive Scheme": unit.appliedIncentive || "",
    "Incentive Status": unit.incentiveStatus || "",
    "Notes Count": notesCount,
  };
}

function styleWorksheet(worksheet: XLSX.WorkSheet) {
  // Set column widths
  const colWidths = [
    { wch: 25 }, // Development Name
    { wch: 12 }, // Unit Number
    { wch: 15 }, // Unit Type
    { wch: 30 }, // Address
    { wch: 20 }, // Construction Unit Type
    { wch: 18 }, // Construction Phase
    { wch: 10 }, // Bedrooms
    { wch: 10 }, // Size
    { wch: 18 }, // Construction Status
    { wch: 15 }, // Sales Status
    { wch: 15 }, // BCMS Approved
    { wch: 18 }, // Homebond Approved
    { wch: 14 }, // BER Approved
    { wch: 20 }, // Developer Company
    { wch: 15 }, // List Price
    { wch: 15 }, // Sold Price
    { wch: 15 }, // Price Ex VAT
    { wch: 15 }, // Price Inc VAT
    { wch: 15 }, // Purchaser Type
    { wch: 8 },  // Part V
    { wch: 25 }, // Purchaser Name
    { wch: 15 }, // Purchaser Phone
    { wch: 25 }, // Purchaser Email
    { wch: 15 }, // Planned BCMS
    { wch: 15 }, // Actual BCMS
    { wch: 15 }, // Planned Close
    { wch: 15 }, // Actual Close
    { wch: 18 }, // BCMS Submit Date
    { wch: 18 }, // BCMS Approved Date
    { wch: 20 }, // Homebond Submit Date
    { wch: 20 }, // Homebond Approved Date
    { wch: 18 }, // BER Approved Date
    { wch: 25 }, // FC Compliance Received Date
    { wch: 20 }, // Land Map Submit Date
    { wch: 20 }, // Land Map Received Date
    { wch: 18 }, // SAN Approved Date
    { wch: 18 }, // Contract Issued Date
    { wch: 18 }, // Contract Signed Date
    { wch: 15 }, // Sale Closed Date
    { wch: 18 }, // Incentive Scheme
    { wch: 15 }, // Incentive Status
    { wch: 12 }, // Notes Count
  ];
  worksheet["!cols"] = colWidths;

  // Freeze the header row
  worksheet["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" };

  return worksheet;
}

export function exportUnitsToExcel(developmentId?: string): void {
  let developmentsToExport: Development[];
  let filename: string;
  const dateStr = new Date().toISOString().split("T")[0];

  if (developmentId) {
    const development = developments.find((d) => d.id === developmentId);
    if (!development) {
      throw new Error(`Development with ID ${developmentId} not found`);
    }
    developmentsToExport = [development];
    const safeName = development.name.replace(/[^a-zA-Z0-9]/g, "_");
    filename = `${safeName}_Export_${dateStr}.xlsx`;
  } else {
    developmentsToExport = developments;
    filename = `Units_Export_${dateStr}.xlsx`;
  }

  // Convert all units to export rows
  const exportRows: ExportRow[] = [];
  developmentsToExport.forEach((development) => {
    development.units.forEach((unit) => {
      exportRows.push(unitToExportRow(unit, development.name, 0));
    });
  });

  if (exportRows.length === 0) {
    throw new Error("No units to export");
  }

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(exportRows);

  // Style the worksheet
  styleWorksheet(worksheet);

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Units");

  // Create a separate Instructions sheet
  const instructionsData = [
    ["Excel Import/Export Instructions"],
    [""],
    ["READ-ONLY COLUMNS (Do not modify):"],
    ["- Development Name: Used to identify the development"],
    ["- Unit Number: Used to identify the unit"],
    ["- Notes Count: For information only"],
    [""],
    ["EDITABLE COLUMNS:"],
    ["- All other columns can be modified"],
    [""],
    ["STATUS VALUES (must match exactly):"],
    ["Construction Status: Not Started, In Progress, Complete"],
    ["Sales Status: Not Released, For Sale, Under Offer, Contracted, Complete"],
    ["Purchaser Type: Private, Council, AHB, Other"],
    ["Incentive Status: eligible, applied, claimed, expired"],
    [""],
    ["YES/NO FIELDS:"],
    ["- Part V: Use 'Yes' or 'No'"],
    ["- BCMS Approved: Use 'Yes' or 'No' (Yes sets approval date to today, No clears it)"],
    ["- Homebond Approved: Use 'Yes' or 'No' (Yes sets approval date to today, No clears it)"],
    ["- BER Approved: Use 'Yes' or 'No' (Yes sets approval date to today, No clears it)"],
    [""],
    ["DOCUMENTATION (Date-based):"],
    ["- Enter dates to mark items as complete (Yes/No is automatic)"],
    ["- If a date is entered, the item shows as 'Yes'"],
    ["- If no date, the item shows as 'No'"],
    [""],
    ["KEY DATES:"],
    ["- Planned BCMS: Target BCMS completion date"],
    ["- Actual BCMS: Actual BCMS completion date"],
    ["- Planned Close: Target closing date"],
    ["- Actual Close: Actual closing date"],
    [""],
    ["DATE FORMAT:"],
    ["- Use DD/MM/YYYY format"],
    [""],
    ["PRICES:"],
    ["- Enter as numbers only (no currency symbols)"],
    [""],
    ["TEXT FIELDS:"],
    ["- Construction Unit Type: Free text (any value allowed)"],
    ["- Construction Phase: Free text (any value allowed)"],
    ["- Developer Company: Enter company name"],
    [""],
    ["TO IMPORT:"],
    ["1. Make your changes in the Units sheet"],
    ["2. Save the file"],
    ["3. Use the Import button in the application"],
    ["4. Review changes before applying"],
  ];

  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
  instructionsSheet["!cols"] = [{ wch: 60 }];
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  // Save the file
  saveAs(blob, filename);
}

// Export all units from provided developments array
export function exportAllUnitsToExcel(developmentsToExport: Development[]): void {
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `All_Units_Export_${dateStr}.xlsx`;

  // Convert all units to export rows
  const exportRows: ExportRow[] = [];
  developmentsToExport.forEach((development) => {
    development.units.forEach((unit) => {
      exportRows.push(unitToExportRow(unit, development.name, 0));
    });
  });

  if (exportRows.length === 0) {
    throw new Error("No units to export");
  }

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  styleWorksheet(worksheet);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Units");

  // Generate file and trigger download
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(blob, filename);
}

export function getExportColumns(): string[] {
  return [
    "Development Name",
    "Unit Number",
    "Unit Type",
    "Address",
    "Construction Unit Type",
    "Construction Phase",
    "Bedrooms",
    "Size (m²)",
    "Construction Status",
    "Sales Status",
    "BCMS Approved",
    "Homebond Approved",
    "BER Approved",
    "Developer Company",
    "List Price",
    "Sold Price",
    "Price Ex VAT",
    "Price Inc VAT",
    "Purchaser Type",
    "Part V",
    "Purchaser Name",
    "Purchaser Phone",
    "Purchaser Email",
    "Planned BCMS",
    "Actual BCMS",
    "Planned Close",
    "Actual Close",
    "BCMS Submit Date",
    "BCMS Approved Date",
    "Homebond Submit Date",
    "Homebond Approved Date",
    "BER Approved Date",
    "FC Compliance Received Date",
    "Land Map Submit Date",
    "Land Map Received Date",
    "SAN Approved Date",
    "Contract Issued Date",
    "Contract Signed Date",
    "Sale Closed Date",
    "Incentive Scheme",
    "Incentive Status",
    "Notes Count",
  ];
}
