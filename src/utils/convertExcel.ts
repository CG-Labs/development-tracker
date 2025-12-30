import XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { readFile, utils } = XLSX;

// Types matching our application
type ConstructionStatus = "Not Started" | "In Progress" | "Complete";
type SalesStatus = "Not Released" | "For Sale" | "Under Offer" | "Contracted" | "Complete";
type UnitType = "House-Semi" | "House-Detached" | "House-Terrace" | "Apartment" | "Duplex Apartment" | "Apartment Studio";

interface DocumentationChecklist {
  // Completion Documentation
  bcmsReceived: boolean;
  bcmsReceivedDate?: string;
  landRegistryApproved: boolean;
  landRegistryApprovedDate?: string;
  homebondReceived: boolean;
  homebondReceivedDate?: string;

  // Sales Documentation
  sanApproved: boolean;
  sanApprovedDate?: string;
  contractIssued: boolean;
  contractIssuedDate?: string;
  contractSigned: boolean;
  contractSignedDate?: string;
  saleClosed: boolean;
  saleClosedDate?: string;
}

interface Unit {
  unitNumber: string;
  type: UnitType;
  bedrooms: number;
  constructionStatus: ConstructionStatus;
  salesStatus: SalesStatus;
  startDate?: string;
  completionDate?: string;
  listPrice: number;
  soldPrice?: number;
  snagDate?: string;
  closeDate?: string;
  documentation: DocumentationChecklist;
  // Additional fields from Excel
  partV?: boolean;
  buyerType?: string;
  occupancy?: string;
  size?: number;
  priceExVat?: number;
  priceIncVat?: number;
  desnagDate?: string;
  plannedCloseDate?: string;
}

interface Development {
  id: string;
  name: string;
  projectNumber: string;
  totalUnits: number;
  units: Unit[];
}

// Sheet names to process
const SHEET_NAMES = ["Knockhill Ph 1", "Knockhill Ph2", "Magee", "Newtown Meadows"];

// Column mapping interface
interface ColumnMapping {
  unitNumber: number;
  unitType: number;
  partV: number;
  buyerType: number;
  occupancy: number;
  bedrooms: number;
  size: number;
  constructionStatus: number;
  conveyancyStatus: number;
  contractReturned: number;
  clientSigned: number;
  loanOfferFunds: number;
  priceExVat: number;
  priceIncVat: number;
  snagDate: number;
  desnagDate: number;
  bcmsDate: number;
  plannedCloseDate: number;
  actualCloseDate: number;
}

// Sheet-specific column mappings (0-indexed)
// Knockhill Ph 1 & Magee have "Type" column at G, shifting subsequent columns
const COLUMNS_WITH_TYPE: ColumnMapping = {
  unitNumber: 0,        // A: Unit No.
  unitType: 1,          // B: Unit Type
  partV: 2,             // C: Part V
  buyerType: 3,         // D: Buyer Type
  occupancy: 4,         // E: Occupancy
  bedrooms: 5,          // F: Bedrooms
  // G: Type (skipped)
  size: 7,              // H: Size
  constructionStatus: 8,  // I: Construction Status
  conveyancyStatus: 9,    // J: Conveyacy Status
  // K: Status Notes (skipped)
  contractReturned: 11,   // L: Signed contract returned
  clientSigned: 12,       // M: Client signed
  loanOfferFunds: 13,     // N: Loan Offer Funds?
  priceExVat: 14,         // O: Price Ex Vat
  priceIncVat: 15,        // P: Price inc VAT
  // Q: Extras (skipped)
  snagDate: 17,           // R: Snag date
  desnagDate: 18,         // S: De-snag date
  bcmsDate: 19,           // T: BCMS Submission Date
  plannedCloseDate: 20,   // U: Current Planned Closed
  actualCloseDate: 21,    // V: Actual Closed
};

// Knockhill Ph2 has NO "Type" column - columns shift left by 1 after Bedrooms
const COLUMNS_WITHOUT_TYPE: ColumnMapping = {
  unitNumber: 0,        // A: Unit No.
  unitType: 1,          // B: Unit Type
  partV: 2,             // C: Part V
  buyerType: 3,         // D: Buyer Type
  occupancy: 4,         // E: Occupancy
  bedrooms: 5,          // F: Bedrooms
  size: 6,              // G: Size (no Type column!)
  constructionStatus: 7,  // H: Construction Status
  conveyancyStatus: 8,    // I: Conveyacy Status
  // J: Status Notes (skipped)
  contractReturned: 10,   // K: Signed contract returned
  clientSigned: 11,       // L: Client signed
  loanOfferFunds: 12,     // M: Loan Offer Funds?
  priceExVat: 13,         // N: Price Ex Vat
  priceIncVat: 14,        // O: Price inc VAT
  // P: Extras (skipped)
  snagDate: 16,           // Q: Snag date
  desnagDate: 17,         // R: De-snag date
  bcmsDate: 18,           // S: BCMS Submission Date
  plannedCloseDate: 19,   // T: Current Planned Closed
  actualCloseDate: 20,    // U: Actual Closed
};

// Newtown Meadows has empty column at E and different structure
const COLUMNS_NEWTOWN: ColumnMapping = {
  unitNumber: 0,        // A: Unit No.
  unitType: 1,          // B: Unit Type
  partV: 2,             // C: Part V
  buyerType: 3,         // D: Buyer Type
  // E: <empty>
  occupancy: 5,         // F: Occupancy
  bedrooms: 6,          // G: Bedrooms
  // H: Type (skipped)
  size: 8,              // I: Size
  constructionStatus: 9,  // J: Construction Status
  conveyancyStatus: 10,   // K: Conveyacy Status
  // L: Status Notes (skipped)
  contractReturned: 12,   // M: Signed contract returned
  clientSigned: 13,       // N: Client signed
  loanOfferFunds: 14,     // O: Loan Offer Funds?
  priceExVat: 15,         // P: Price Ex Vat
  priceIncVat: 16,        // Q: Price inc VAT
  // R: Extras (skipped)
  snagDate: 18,           // S: Snag date
  desnagDate: 19,         // T: De-snag date
  bcmsDate: 20,           // U: BCMS Submission Date
  plannedCloseDate: 21,   // V: Current Planned Closed
  // W: BCMS Status (skipped)
  actualCloseDate: 23,    // X: Actual Closed
};

// Map sheet names to their column mappings
const SHEET_COLUMN_MAPPINGS: Record<string, ColumnMapping> = {
  "Knockhill Ph 1": COLUMNS_WITH_TYPE,
  "Knockhill Ph2": COLUMNS_WITHOUT_TYPE,
  "Magee": COLUMNS_WITH_TYPE,
  "Newtown Meadows": COLUMNS_NEWTOWN,
};

// Map unit type from Excel to our type
function mapUnitType(excelType: string): UnitType {
  const typeMap: Record<string, UnitType> = {
    // House types
    "Detached": "House-Detached",
    "Semi-Detached": "House-Semi",
    "Semi Detached": "House-Semi",
    "Semi": "House-Semi",
    "Terraced": "House-Terrace",
    "Terrace": "House-Terrace",
    "House": "House-Semi",
    // Apartment types
    "Apartment": "Apartment",
    "Apt": "Apartment",
    "Flat": "Apartment",
    "Studio": "Apartment Studio",
    // Duplex types
    "Duplex GF": "Duplex Apartment",
    "Duplex FF": "Duplex Apartment",
    "Duplex": "Duplex Apartment",
  };
  return typeMap[excelType] || "House-Semi";
}

// Map construction status from Excel
function mapConstructionStatus(status: string): ConstructionStatus {
  const statusMap: Record<string, ConstructionStatus> = {
    // Exact matches from Excel
    "Not Started": "Not Started",
    "Ongoing": "In Progress",
    "Construction Completed": "Complete",
    "Desnagged": "Complete",
    // Additional possible values
    "In Progress": "In Progress",
    "Complete": "Complete",
    "Completed": "Complete",
    "Done": "Complete",
    "Started": "In Progress",
    "Under Construction": "In Progress",
    "": "Not Started",
  };
  return statusMap[status] || "Not Started";
}

// Map sales/conveyancy status from Excel
function mapSalesStatus(status: string): SalesStatus {
  const statusMap: Record<string, SalesStatus> = {
    // Exact matches from Excel (keep as-is where possible)
    "Complete": "Complete",
    "For Sale": "For Sale",
    "Under Offer": "Under Offer",
    "Contracted": "Contracted",
    "Not Released": "Not Released",
    // Map old terminology to new
    "Available": "For Sale",
    "Reserved": "Under Offer",
    "Sale Agreed": "Contracted",
    "Sold": "Complete",
    "Closed": "Complete",
    "Completed": "Complete",
    "Deposit Paid": "Contracted",
    "": "For Sale",
  };
  return statusMap[status] || "For Sale";
}

// Convert Excel date serial to ISO string
function excelDateToISO(excelDate: number | string | undefined): string | undefined {
  if (excelDate === undefined || excelDate === null || excelDate === "") {
    return undefined;
  }

  if (typeof excelDate === "string") {
    // Try to parse as date string
    const date = new Date(excelDate);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
    return undefined;
  }

  if (typeof excelDate === "number") {
    // Excel date serial number (days since 1899-12-30)
    // Excel incorrectly treats 1900 as a leap year, so we subtract 1 for dates after Feb 28, 1900
    const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
    const date = new Date(excelEpoch.getTime() + excelDate * 24 * 60 * 60 * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return undefined;
}

// Parse price value
function parsePrice(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    return 0;
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    // Remove currency symbols and commas
    const cleaned = value.replace(/[€£$,]/g, "").trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

// Convert sheet name to development ID
function sheetNameToId(sheetName: string): string {
  return sheetName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

// Convert sheet name to project number
function sheetNameToProjectNumber(sheetName: string): string {
  const prefixes: Record<string, string> = {
    "Knockhill Ph 1": "KH-001",
    "Knockhill Ph2": "KH-002",
    "Magee": "MG-001",
    "Newtown Meadows": "NM-001",
  };
  return prefixes[sheetName] || "XX-000";
}

function processSheet(workbook: XLSX.WorkBook, sheetName: string): Development | null {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    console.log(`Sheet "${sheetName}" not found`);
    return null;
  }

  // Get the column mapping for this sheet
  const COLUMNS = SHEET_COLUMN_MAPPINGS[sheetName];
  if (!COLUMNS) {
    console.log(`No column mapping defined for sheet "${sheetName}"`);
    return null;
  }

  // Convert to array of arrays
  const data: unknown[][] = utils.sheet_to_json(sheet, { header: 1 });

  console.log(`\nProcessing sheet: ${sheetName}`);
  console.log(`Total rows: ${data.length}`);

  // Log header row (row 11, index 10)
  if (data[10]) {
    console.log("Header row (11):", data[10]);
  }

  const units: Unit[] = [];

  // Track unique status values for debugging
  const constructionStatusValues = new Set<string>();
  const salesStatusValues = new Set<string>();

  // Start from row 12 (index 11)
  for (let i = 11; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const unitNumber = row[COLUMNS.unitNumber];
    if (!unitNumber || unitNumber === "") continue;

    // Check if contract was signed
    const contractReturned = row[COLUMNS.contractReturned];
    const clientSigned = row[COLUMNS.clientSigned];
    const loanOfferFunds = row[COLUMNS.loanOfferFunds];

    // Get raw status values for debugging
    const rawConstructionStatus = String(row[COLUMNS.constructionStatus] || "");
    const rawSalesStatus = String(row[COLUMNS.conveyancyStatus] || "");

    constructionStatusValues.add(rawConstructionStatus);
    salesStatusValues.add(rawSalesStatus);

    // Get dates for documentation
    const bcmsDateValue = excelDateToISO(row[COLUMNS.bcmsDate] as number | string);
    const contractReturnedDate = excelDateToISO(contractReturned as number | string);
    const clientSignedDate = excelDateToISO(clientSigned as number | string);
    const actualCloseDate = excelDateToISO(row[COLUMNS.actualCloseDate] as number | string);

    // Determine if sale is complete
    const salesStatus = mapSalesStatus(rawSalesStatus);
    const isSaleComplete = salesStatus === "Complete";
    const isContracted = salesStatus === "Contracted" || isSaleComplete;
    const hasContract = !!contractReturned || !!clientSigned || isContracted;

    const unit: Unit = {
      unitNumber: String(unitNumber),
      type: mapUnitType(String(row[COLUMNS.unitType] || "")),
      bedrooms: Number(row[COLUMNS.bedrooms]) || 0,
      constructionStatus: mapConstructionStatus(rawConstructionStatus),
      salesStatus: salesStatus,
      listPrice: parsePrice(row[COLUMNS.priceIncVat]) || parsePrice(row[COLUMNS.priceExVat]),
      snagDate: excelDateToISO(row[COLUMNS.snagDate] as number | string),
      closeDate: actualCloseDate,
      documentation: {
        // Completion Documentation
        bcmsReceived: !!bcmsDateValue,
        bcmsReceivedDate: bcmsDateValue,
        landRegistryApproved: false, // Not available in Excel
        landRegistryApprovedDate: undefined,
        homebondReceived: false, // Not available in Excel
        homebondReceivedDate: undefined,

        // Sales Documentation
        sanApproved: hasContract, // Infer from contract status
        sanApprovedDate: undefined, // Not directly available
        contractIssued: hasContract,
        contractIssuedDate: contractReturnedDate || clientSignedDate,
        contractSigned: !!clientSigned || isContracted,
        contractSignedDate: clientSignedDate,
        saleClosed: isSaleComplete,
        saleClosedDate: isSaleComplete ? actualCloseDate : undefined,
      },
      // Additional fields
      partV: row[COLUMNS.partV] === "Yes" || row[COLUMNS.partV] === true,
      buyerType: row[COLUMNS.buyerType] ? String(row[COLUMNS.buyerType]) : undefined,
      occupancy: row[COLUMNS.occupancy] ? String(row[COLUMNS.occupancy]) : undefined,
      size: row[COLUMNS.size] ? Number(row[COLUMNS.size]) : undefined,
      priceExVat: parsePrice(row[COLUMNS.priceExVat]) || undefined,
      priceIncVat: parsePrice(row[COLUMNS.priceIncVat]) || undefined,
      desnagDate: excelDateToISO(row[COLUMNS.desnagDate] as number | string),
      plannedCloseDate: excelDateToISO(row[COLUMNS.plannedCloseDate] as number | string),
    };

    // Set soldPrice if complete (sold)
    if (unit.salesStatus === "Complete" && unit.listPrice > 0) {
      unit.soldPrice = unit.listPrice;
    }

    units.push(unit);
  }

  console.log(`Units found: ${units.length}`);
  console.log(`Unique Construction Status values:`, Array.from(constructionStatusValues));
  console.log(`Unique Sales Status values:`, Array.from(salesStatusValues));

  return {
    id: sheetNameToId(sheetName),
    name: sheetName,
    projectNumber: sheetNameToProjectNumber(sheetName),
    totalUnits: units.length,
    units,
  };
}

function main() {
  const excelPath = path.resolve(__dirname, "../../Sales Tracker Quick Reference.xlsx");

  console.log("Reading Excel file:", excelPath);

  if (!fs.existsSync(excelPath)) {
    console.error("Excel file not found:", excelPath);
    process.exit(1);
  }

  const workbook = readFile(excelPath);

  console.log("Available sheets:", workbook.SheetNames);

  const developments: Development[] = [];

  for (const sheetName of SHEET_NAMES) {
    const development = processSheet(workbook, sheetName);
    if (development && development.units.length > 0) {
      developments.push(development);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("CONVERSION RESULTS");
  console.log("=".repeat(60));

  // Log summary
  for (const dev of developments) {
    console.log(`\n${dev.name} (${dev.projectNumber})`);
    console.log(`  Total Units: ${dev.totalUnits}`);

    const statusCounts = {
      Available: 0,
      Reserved: 0,
      "Sale Agreed": 0,
      Sold: 0,
    };

    for (const unit of dev.units) {
      statusCounts[unit.salesStatus]++;
    }

    console.log(`  Available: ${statusCounts.Available}`);
    console.log(`  Reserved: ${statusCounts.Reserved}`);
    console.log(`  Sale Agreed: ${statusCounts["Sale Agreed"]}`);
    console.log(`  Sold: ${statusCounts.Sold}`);
  }

  // Log full data
  console.log("\n" + "=".repeat(60));
  console.log("FULL DATA (JSON)");
  console.log("=".repeat(60));
  console.log(JSON.stringify(developments, null, 2));

  // Generate TypeScript file content
  const tsContent = `import type { Development } from "../types";

// Auto-generated from Sales Tracker Quick Reference.xlsx
// Generated on: ${new Date().toISOString()}

export const developments: Development[] = ${JSON.stringify(developments, null, 2)};
`;

  // Save to file
  const outputPath = path.resolve(__dirname, "../data/realDevelopments.ts");
  fs.writeFileSync(outputPath, tsContent, "utf-8");

  console.log("\n" + "=".repeat(60));
  console.log(`TypeScript file saved to: ${outputPath}`);
  console.log("=".repeat(60));
}

main();
