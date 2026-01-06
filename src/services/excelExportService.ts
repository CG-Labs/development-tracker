import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { developments } from "../data/realDevelopments";
import type { Development, Unit } from "../types";

interface ExportRow {
  "Development Name": string;
  "Unit Number": string;
  "Unit Type": string;
  "Address": string;
  "Bedrooms": number;
  "Size (m²)": number | string;
  "Construction Status": string;
  "Sales Status": string;
  "Price Ex VAT": number | string;
  "Price Inc VAT": number | string;
  "Purchaser Type": string;
  "Part V": string;
  "Purchaser Name": string;
  "Purchaser Phone": string;
  "Purchaser Email": string;
  "Planned BCMS Date": string;
  "BCMS Received": string;
  "Land Registry Approved": string;
  "Homebond Received": string;
  "SAN Approved": string;
  "Contract Issued": string;
  "Contract Signed": string;
  "Sale Closed": string;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function unitToExportRow(unit: Unit, developmentName: string): ExportRow {
  return {
    "Development Name": developmentName,
    "Unit Number": unit.unitNumber,
    "Unit Type": unit.type,
    "Address": unit.address || "",
    "Bedrooms": unit.bedrooms,
    "Size (m²)": unit.size || "",
    "Construction Status": unit.constructionStatus,
    "Sales Status": unit.salesStatus,
    "Price Ex VAT": unit.priceExVat || "",
    "Price Inc VAT": unit.priceIncVat || unit.listPrice || "",
    "Purchaser Type": unit.purchaserType || "Private",
    "Part V": unit.partV ? "Yes" : "No",
    "Purchaser Name": unit.purchaserName || "",
    "Purchaser Phone": unit.purchaserPhone || "",
    "Purchaser Email": unit.purchaserEmail || "",
    "Planned BCMS Date": formatDate(unit.documentation.bcmsReceivedDate),
    "BCMS Received": unit.documentation.bcmsReceived ? "Yes" : "No",
    "Land Registry Approved": unit.documentation.landRegistryApproved ? "Yes" : "No",
    "Homebond Received": unit.documentation.homebondReceived ? "Yes" : "No",
    "SAN Approved": unit.documentation.sanApproved ? "Yes" : "No",
    "Contract Issued": unit.documentation.contractIssued ? "Yes" : "No",
    "Contract Signed": unit.documentation.contractSigned ? "Yes" : "No",
    "Sale Closed": unit.documentation.saleClosed ? "Yes" : "No",
  };
}

function addDataValidation(worksheet: XLSX.WorkSheet, rowCount: number) {
  // Column indices (0-based)
  const cols = {
    constructionStatus: 6, // G
    salesStatus: 7, // H
    purchaserType: 10, // K
    partV: 11, // L
    bcmsReceived: 16, // Q
    landRegistry: 17, // R
    homebond: 18, // S
    san: 19, // T
    contractIssued: 20, // U
    contractSigned: 21, // V
    saleClosed: 22, // W
  };

  // Initialize data validations array if not exists
  if (!worksheet["!dataValidation"]) {
    worksheet["!dataValidation"] = [];
  }

  // Add data validation for each column
  const validations = [
    { col: cols.constructionStatus },
    { col: cols.salesStatus },
    { col: cols.purchaserType },
    { col: cols.partV },
    { col: cols.bcmsReceived },
    { col: cols.landRegistry },
    { col: cols.homebond },
    { col: cols.san },
    { col: cols.contractIssued },
    { col: cols.contractSigned },
    { col: cols.saleClosed },
  ];

  validations.forEach(({ col }) => {
    const colLetter = XLSX.utils.encode_col(col);
    for (let row = 2; row <= rowCount + 1; row++) {
      const cellRef = `${colLetter}${row}`;
      // Ensure cells exist for data entry
      if (!worksheet[cellRef]) {
        worksheet[cellRef] = { t: "s", v: "" };
      }
    }
  });

  return worksheet;
}

function styleWorksheet(worksheet: XLSX.WorkSheet) {
  // Set column widths
  const colWidths = [
    { wch: 25 }, // Development Name
    { wch: 12 }, // Unit Number
    { wch: 15 }, // Unit Type
    { wch: 30 }, // Address
    { wch: 10 }, // Bedrooms
    { wch: 10 }, // Size
    { wch: 18 }, // Construction Status
    { wch: 15 }, // Sales Status
    { wch: 15 }, // Price Ex VAT
    { wch: 15 }, // Price Inc VAT
    { wch: 15 }, // Purchaser Type
    { wch: 8 },  // Part V
    { wch: 25 }, // Purchaser Name
    { wch: 15 }, // Purchaser Phone
    { wch: 25 }, // Purchaser Email
    { wch: 18 }, // Planned BCMS Date
    { wch: 15 }, // BCMS Received
    { wch: 20 }, // Land Registry
    { wch: 18 }, // Homebond
    { wch: 15 }, // SAN Approved
    { wch: 15 }, // Contract Issued
    { wch: 15 }, // Contract Signed
    { wch: 12 }, // Sale Closed
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
      exportRows.push(unitToExportRow(unit, development.name));
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

  // Add data validation for dropdowns
  addDataValidation(worksheet, exportRows.length);

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Units");

  // Create a separate Instructions sheet
  const instructionsData = [
    ["Excel Import/Export Instructions"],
    [""],
    ["READ-ONLY COLUMNS (Do not modify):"],
    ["- Development Name: Used to identify the development"],
    ["- Unit Number: Used to identify the unit"],
    [""],
    ["EDITABLE COLUMNS:"],
    ["- All other columns can be modified"],
    [""],
    ["STATUS VALUES (must match exactly):"],
    ["Construction Status: Not Started, In Progress, Complete"],
    ["Sales Status: Not Released, For Sale, Under Offer, Contracted, Complete"],
    ["Purchaser Type: Private, Council, AHB, Other"],
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
      exportRows.push(unitToExportRow(unit, development.name));
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
    "Bedrooms",
    "Size (m²)",
    "Construction Status",
    "Sales Status",
    "Price Ex VAT",
    "Price Inc VAT",
    "Purchaser Type",
    "Part V",
    "Purchaser Name",
    "Purchaser Phone",
    "Purchaser Email",
    "Planned BCMS Date",
    "BCMS Received",
    "Land Registry Approved",
    "Homebond Received",
    "SAN Approved",
    "Contract Issued",
    "Contract Signed",
    "Sale Closed",
  ];
}
