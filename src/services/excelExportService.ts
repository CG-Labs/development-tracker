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
  "Bedrooms": number;
  "Size (m²)": number | string;
  "Construction Status": string;
  "Sales Status": string;
  "Developer Company": string;
  "Price Ex VAT": number | string;
  "Price Inc VAT": number | string;
  "Purchaser Type": string;
  "Part V": string;
  "Purchaser Name": string;
  "Purchaser Phone": string;
  "Purchaser Email": string;
  "Planned BCMS Date": string;
  "Actual BCMS Date": string;
  "Snag Date": string;
  "Desnag Date": string;
  "Planned Close Date": string;
  "Actual Close Date": string;
  "BCMS Received": string;
  "BCMS Received Date": string;
  "Land Registry Approved": string;
  "Land Registry Approved Date": string;
  "Homebond Received": string;
  "Homebond Received Date": string;
  "SAN Approved": string;
  "SAN Approved Date": string;
  "Contract Issued": string;
  "Contract Issued Date": string;
  "Contract Signed": string;
  "Contract Signed Date": string;
  "Sale Closed": string;
  "Sale Closed Date": string;
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
    "Developer Company": unit.developerCompanyId || "",
    "Price Ex VAT": unit.priceExVat || "",
    "Price Inc VAT": unit.priceIncVat || unit.listPrice || "",
    "Purchaser Type": unit.purchaserType || "Private",
    "Part V": unit.partV ? "Yes" : "No",
    "Purchaser Name": unit.purchaserName || "",
    "Purchaser Phone": unit.purchaserPhone || "",
    "Purchaser Email": unit.purchaserEmail || "",
    "Planned BCMS Date": formatDateDDMMYYYY(unit.documentation.plannedBcmsDate),
    "Actual BCMS Date": formatDateDDMMYYYY(unit.documentation.bcmsReceivedDate),
    "Snag Date": formatDateDDMMYYYY(unit.snagDate),
    "Desnag Date": formatDateDDMMYYYY(unit.desnagDate),
    "Planned Close Date": formatDateDDMMYYYY(unit.plannedCloseDate),
    "Actual Close Date": formatDateDDMMYYYY(unit.closeDate),
    "BCMS Received": unit.documentation.bcmsReceived ? "Yes" : "No",
    "BCMS Received Date": formatDateDDMMYYYY(unit.documentation.bcmsReceivedDate),
    "Land Registry Approved": unit.documentation.landRegistryApproved ? "Yes" : "No",
    "Land Registry Approved Date": formatDateDDMMYYYY(unit.documentation.landRegistryApprovedDate),
    "Homebond Received": unit.documentation.homebondReceived ? "Yes" : "No",
    "Homebond Received Date": formatDateDDMMYYYY(unit.documentation.homebondReceivedDate),
    "SAN Approved": unit.documentation.sanApproved ? "Yes" : "No",
    "SAN Approved Date": formatDateDDMMYYYY(unit.documentation.sanApprovedDate),
    "Contract Issued": unit.documentation.contractIssued ? "Yes" : "No",
    "Contract Issued Date": formatDateDDMMYYYY(unit.documentation.contractIssuedDate),
    "Contract Signed": unit.documentation.contractSigned ? "Yes" : "No",
    "Contract Signed Date": formatDateDDMMYYYY(unit.documentation.contractSignedDate),
    "Sale Closed": unit.documentation.saleClosed ? "Yes" : "No",
    "Sale Closed Date": formatDateDDMMYYYY(unit.documentation.saleClosedDate),
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
    { wch: 20 }, // Developer Company
    { wch: 15 }, // Price Ex VAT
    { wch: 15 }, // Price Inc VAT
    { wch: 15 }, // Purchaser Type
    { wch: 8 },  // Part V
    { wch: 25 }, // Purchaser Name
    { wch: 15 }, // Purchaser Phone
    { wch: 25 }, // Purchaser Email
    { wch: 15 }, // Planned BCMS Date
    { wch: 15 }, // Actual BCMS Date
    { wch: 12 }, // Snag Date
    { wch: 12 }, // Desnag Date
    { wch: 15 }, // Planned Close Date
    { wch: 15 }, // Actual Close Date
    { wch: 15 }, // BCMS Received
    { wch: 15 }, // BCMS Received Date
    { wch: 20 }, // Land Registry Approved
    { wch: 20 }, // Land Registry Approved Date
    { wch: 18 }, // Homebond Received
    { wch: 18 }, // Homebond Received Date
    { wch: 15 }, // SAN Approved
    { wch: 15 }, // SAN Approved Date
    { wch: 15 }, // Contract Issued
    { wch: 15 }, // Contract Issued Date
    { wch: 15 }, // Contract Signed
    { wch: 15 }, // Contract Signed Date
    { wch: 12 }, // Sale Closed
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
    ["- Part V, BCMS Received, Land Registry Approved, etc."],
    ["- Use 'Yes' or 'No' only"],
    [""],
    ["DATES:"],
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
    "Developer Company",
    "Price Ex VAT",
    "Price Inc VAT",
    "Purchaser Type",
    "Part V",
    "Purchaser Name",
    "Purchaser Phone",
    "Purchaser Email",
    "Planned BCMS Date",
    "Actual BCMS Date",
    "Snag Date",
    "Desnag Date",
    "Planned Close Date",
    "Actual Close Date",
    "BCMS Received",
    "BCMS Received Date",
    "Land Registry Approved",
    "Land Registry Approved Date",
    "Homebond Received",
    "Homebond Received Date",
    "SAN Approved",
    "SAN Approved Date",
    "Contract Issued",
    "Contract Issued Date",
    "Contract Signed",
    "Contract Signed Date",
    "Sale Closed",
    "Sale Closed Date",
    "Incentive Scheme",
    "Incentive Status",
    "Notes Count",
  ];
}
