import ExcelJS from "exceljs";
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
  "Bedrooms": number | string;
  "Size (m²)": number | string;
  "Construction Status": string;
  "Sales Status": string;
  "BCMS Approved": string;
  "Homebond Approved": string;
  "BER Approved": string;
  "FC Compliance": string;
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
  "Planned BCMS": string;
  "Actual BCMS": string;
  "Planned Close": string;
  "Actual Close": string;
  "BCMS Submit Date": string;
  "BCMS Approved Date": string;
  "Homebond Submit Date": string;
  "Homebond Approved Date": string;
  "BER Approved Date": string;
  "FC Compliance Received Date": string;
  "Land Map Submit Date": string;
  "Land Map Received Date": string;
  "SAN Approved Date": string;
  "Contract Issued Date": string;
  "Contract Signed Date": string;
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
    "BCMS Approved": unit.documentation?.bcmsApprovedDate ? "Yes" : "No",
    "Homebond Approved": unit.documentation?.homebondApprovedDate ? "Yes" : "No",
    "BER Approved": unit.documentation?.berApprovedDate ? "Yes" : "No",
    "FC Compliance": unit.documentation?.fcComplianceReceivedDate ? "Yes" : "No",
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
    "Planned BCMS": formatDateDDMMYYYY(unit.keyDates?.plannedBcms),
    "Actual BCMS": formatDateDDMMYYYY(unit.documentation.bcmsApprovedDate),
    "Planned Close": formatDateDDMMYYYY(unit.keyDates?.plannedClose),
    "Actual Close": formatDateDDMMYYYY(unit.documentation.saleClosedDate),
    "BCMS Submit Date": formatDateDDMMYYYY(unit.documentation.bcmsSubmitDate),
    "BCMS Approved Date": formatDateDDMMYYYY(unit.documentation.bcmsApprovedDate),
    "Homebond Submit Date": formatDateDDMMYYYY(unit.documentation.homebondSubmitDate),
    "Homebond Approved Date": formatDateDDMMYYYY(unit.documentation.homebondApprovedDate),
    "BER Approved Date": formatDateDDMMYYYY(unit.documentation.berApprovedDate),
    "FC Compliance Received Date": formatDateDDMMYYYY(unit.documentation.fcComplianceReceivedDate),
    "Land Map Submit Date": formatDateDDMMYYYY(unit.documentation.landMapSubmitDate),
    "Land Map Received Date": formatDateDDMMYYYY(unit.documentation.landMapReceivedDate),
    "SAN Approved Date": formatDateDDMMYYYY(unit.documentation.sanApprovedDate),
    "Contract Issued Date": formatDateDDMMYYYY(unit.documentation.contractIssuedDate),
    "Contract Signed Date": formatDateDDMMYYYY(unit.documentation.contractSignedDate),
    "Sale Closed Date": formatDateDDMMYYYY(unit.documentation.saleClosedDate),
    "Incentive Scheme": unit.appliedIncentive || "",
    "Incentive Status": unit.incentiveStatus || "",
    "Notes Count": notesCount,
  };
}

const COLUMN_DEFINITIONS: Partial<ExcelJS.Column>[] = [
  { header: "Development Name", key: "Development Name", width: 25 },
  { header: "Unit Number", key: "Unit Number", width: 12 },
  { header: "Unit Type", key: "Unit Type", width: 15 },
  { header: "Address", key: "Address", width: 30 },
  { header: "Construction Unit Type", key: "Construction Unit Type", width: 20 },
  { header: "Construction Phase", key: "Construction Phase", width: 18 },
  { header: "Bedrooms", key: "Bedrooms", width: 10 },
  { header: "Size (m²)", key: "Size (m²)", width: 10 },
  { header: "Construction Status", key: "Construction Status", width: 18 },
  { header: "Sales Status", key: "Sales Status", width: 15 },
  { header: "BCMS Approved", key: "BCMS Approved", width: 15 },
  { header: "Homebond Approved", key: "Homebond Approved", width: 18 },
  { header: "BER Approved", key: "BER Approved", width: 14 },
  { header: "FC Compliance", key: "FC Compliance", width: 15 },
  { header: "Developer Company", key: "Developer Company", width: 20 },
  { header: "List Price", key: "List Price", width: 15 },
  { header: "Sold Price", key: "Sold Price", width: 15 },
  { header: "Price Ex VAT", key: "Price Ex VAT", width: 15 },
  { header: "Price Inc VAT", key: "Price Inc VAT", width: 15 },
  { header: "Purchaser Type", key: "Purchaser Type", width: 15 },
  { header: "Part V", key: "Part V", width: 8 },
  { header: "Purchaser Name", key: "Purchaser Name", width: 25 },
  { header: "Purchaser Phone", key: "Purchaser Phone", width: 15 },
  { header: "Purchaser Email", key: "Purchaser Email", width: 25 },
  { header: "Planned BCMS", key: "Planned BCMS", width: 15 },
  { header: "Actual BCMS", key: "Actual BCMS", width: 15 },
  { header: "Planned Close", key: "Planned Close", width: 15 },
  { header: "Actual Close", key: "Actual Close", width: 15 },
  { header: "BCMS Submit Date", key: "BCMS Submit Date", width: 18 },
  { header: "BCMS Approved Date", key: "BCMS Approved Date", width: 18 },
  { header: "Homebond Submit Date", key: "Homebond Submit Date", width: 20 },
  { header: "Homebond Approved Date", key: "Homebond Approved Date", width: 20 },
  { header: "BER Approved Date", key: "BER Approved Date", width: 18 },
  { header: "FC Compliance Received Date", key: "FC Compliance Received Date", width: 25 },
  { header: "Land Map Submit Date", key: "Land Map Submit Date", width: 20 },
  { header: "Land Map Received Date", key: "Land Map Received Date", width: 20 },
  { header: "SAN Approved Date", key: "SAN Approved Date", width: 18 },
  { header: "Contract Issued Date", key: "Contract Issued Date", width: 18 },
  { header: "Contract Signed Date", key: "Contract Signed Date", width: 18 },
  { header: "Sale Closed Date", key: "Sale Closed Date", width: 15 },
  { header: "Incentive Scheme", key: "Incentive Scheme", width: 18 },
  { header: "Incentive Status", key: "Incentive Status", width: 15 },
  { header: "Notes Count", key: "Notes Count", width: 12 },
];

function styleWorksheet(worksheet: ExcelJS.Worksheet): void {
  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  // Freeze header row
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
}

export async function exportUnitsToExcel(developmentId?: string): Promise<void> {
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
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Units");

  // Set columns
  worksheet.columns = COLUMN_DEFINITIONS;

  // Add data rows
  exportRows.forEach((row) => {
    worksheet.addRow(row);
  });

  // Style the worksheet
  styleWorksheet(worksheet);

  // Create Instructions sheet
  const instructionsSheet = workbook.addWorksheet("Instructions");
  instructionsSheet.columns = [{ header: "", key: "content", width: 60 }];

  const instructionsData = [
    "Excel Import/Export Instructions",
    "",
    "READ-ONLY COLUMNS (Do not modify):",
    "- Development Name: Used to identify the development",
    "- Unit Number: Used to identify the unit",
    "- Notes Count: For information only",
    "",
    "EDITABLE COLUMNS:",
    "- All other columns can be modified",
    "",
    "STATUS VALUES (must match exactly):",
    "Construction Status: Not Started, In Progress, Complete",
    "Sales Status: Not Released, For Sale, Under Offer, Contracted, Complete",
    "Purchaser Type: Private, Council, AHB, Other",
    "Incentive Status: eligible, applied, claimed, expired",
    "",
    "YES/NO FIELDS:",
    "- Part V: Use 'Yes' or 'No'",
    "- BCMS Approved: Use 'Yes' or 'No' (Yes sets approval date to today, No clears it)",
    "- Homebond Approved: Use 'Yes' or 'No' (Yes sets approval date to today, No clears it)",
    "- BER Approved: Use 'Yes' or 'No' (Yes sets approval date to today, No clears it)",
    "- FC Compliance: Use 'Yes' or 'No' (Yes sets received date to today, No clears it)",
    "",
    "DOCUMENTATION (Date-based):",
    "- Enter dates to mark items as complete (Yes/No is automatic)",
    "- If a date is entered, the item shows as 'Yes'",
    "- If no date, the item shows as 'No'",
    "",
    "KEY DATES:",
    "- Planned BCMS: Target BCMS completion date",
    "- Actual BCMS: Actual BCMS completion date",
    "- Planned Close: Target closing date",
    "- Actual Close: Actual closing date",
    "",
    "DATE FORMAT:",
    "- Use DD/MM/YYYY format",
    "",
    "PRICES:",
    "- Enter as numbers only (no currency symbols)",
    "",
    "TEXT FIELDS:",
    "- Construction Unit Type: Free text (any value allowed)",
    "- Construction Phase: Free text (any value allowed)",
    "- Developer Company: Enter company name",
    "",
    "TO IMPORT:",
    "1. Make your changes in the Units sheet",
    "2. Save the file",
    "3. Use the Import button in the application",
    "4. Review changes before applying",
  ];

  instructionsData.forEach((line) => {
    instructionsSheet.addRow({ content: line });
  });

  // Generate and save file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, filename);
}

// Export all units from provided developments array
export async function exportAllUnitsToExcel(developmentsToExport: Development[]): Promise<void> {
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
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Units");

  // Set columns
  worksheet.columns = COLUMN_DEFINITIONS;

  // Add data rows
  exportRows.forEach((row) => {
    worksheet.addRow(row);
  });

  // Style the worksheet
  styleWorksheet(worksheet);

  // Generate and save file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
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
    "FC Compliance",
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
