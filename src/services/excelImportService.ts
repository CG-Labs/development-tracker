import ExcelJS from "exceljs";
import { developments } from "../data/realDevelopments";
import type { Unit, ConstructionStatus, SalesStatus, PurchaserType, IncentiveStatus, UnitDates } from "../types";
import { logChange } from "./auditLogService";

export interface ImportChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface ImportRow {
  developmentId: string;
  developmentName: string;
  unitNumber: string;
  changes: ImportChange[];
  unit: Unit;
  warnings: string[];
}

export interface ImportError {
  row: number;
  message: string;
}

export interface ImportResult {
  valid: ImportRow[];
  errors: ImportError[];
  summary: {
    total: number;
    changed: number;
    unchanged: number;
    errors: number;
  };
}

export interface ApplyResult {
  success: number;
  failed: number;
  errors: string[];
}

const CONSTRUCTION_STATUSES: ConstructionStatus[] = ["Not Started", "In Progress", "Complete"];
const SALES_STATUSES: SalesStatus[] = ["Not Released", "For Sale", "Under Offer", "Contracted", "Complete"];
const PURCHASER_TYPES: PurchaserType[] = ["Private", "Council", "AHB", "Other"];
const INCENTIVE_STATUSES: IncentiveStatus[] = ["eligible", "applied", "claimed", "expired"];

function parseYesNo(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.toLowerCase() === "yes" || value.toLowerCase() === "true" || value === "1";
  }
  return false;
}

function parseNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const num = Number(value);
  return isNaN(num) ? undefined : num;
}

function parseDate(value: unknown): string | undefined {
  if (!value || value === "") return undefined;

  // If it's a Date object (ExcelJS returns Date for date cells)
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }

  // If it's a number (Excel serial date)
  if (typeof value === "number") {
    // Excel serial date (days since 1899-12-30)
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    return date.toISOString().split("T")[0];
  }

  if (typeof value === "string") {
    // Try to parse DD/MM/YYYY format
    const ddmmyyyy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    // Try ISO format
    const isoMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (isoMatch) {
      return isoMatch[0];
    }

    // Try YYYY/MM/DD format
    const yyyymmdd = value.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (yyyymmdd) {
      const [, year, month, day] = yyyymmdd;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }

  return undefined;
}

function validateConstructionStatus(value: unknown): ConstructionStatus | null {
  const str = String(value).trim();
  if (CONSTRUCTION_STATUSES.includes(str as ConstructionStatus)) {
    return str as ConstructionStatus;
  }
  return null;
}

function validateSalesStatus(value: unknown): SalesStatus | null {
  const str = String(value).trim();
  if (SALES_STATUSES.includes(str as SalesStatus)) {
    return str as SalesStatus;
  }
  return null;
}

function validatePurchaserType(value: unknown): PurchaserType | null {
  const str = String(value).trim();
  if (PURCHASER_TYPES.includes(str as PurchaserType)) {
    return str as PurchaserType;
  }
  return null;
}

function validateIncentiveStatus(value: unknown): IncentiveStatus | null {
  const str = String(value).trim().toLowerCase();
  if (INCENTIVE_STATUSES.includes(str as IncentiveStatus)) {
    return str as IncentiveStatus;
  }
  return null;
}

function compareValues(oldVal: unknown, newVal: unknown): boolean {
  // Normalize undefined/null/"" as equivalent
  const normalizeEmpty = (v: unknown) => {
    if (v === null || v === undefined || v === "") return null;
    return v;
  };

  const old = normalizeEmpty(oldVal);
  const newV = normalizeEmpty(newVal);

  if (old === newV) return false;

  // Handle boolean comparison with Yes/No strings
  if (typeof old === "boolean" && typeof newV === "string") {
    return old !== parseYesNo(newV);
  }
  if (typeof newV === "boolean" && typeof old === "string") {
    return parseYesNo(old) !== newV;
  }

  // Number comparison
  if (typeof old === "number" || typeof newV === "number") {
    return Number(old) !== Number(newV);
  }

  return String(old) !== String(newV);
}

// Helper to get cell value, handling ExcelJS cell value types
function getCellValue(row: ExcelJS.Row, colIndex: number): unknown {
  const cell = row.getCell(colIndex);
  if (!cell || cell.value === null || cell.value === undefined) {
    return "";
  }
  // Handle rich text
  if (typeof cell.value === "object" && "richText" in cell.value) {
    return (cell.value.richText as { text: string }[]).map((r) => r.text).join("");
  }
  // Handle formula results
  if (typeof cell.value === "object" && "result" in cell.value) {
    return cell.value.result;
  }
  return cell.value;
}

// Convert worksheet to JSON-like array of objects
function worksheetToJson(worksheet: ExcelJS.Worksheet): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];

  // Get headers from first row
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = String(cell.value || "");
  });

  // Process data rows (starting from row 2)
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header row

    const rowData: Record<string, unknown> = {};
    row.eachCell({ includeEmpty: true }, (_cell, colNumber) => {
      const header = headers[colNumber];
      if (header) {
        rowData[header] = getCellValue(row, colNumber);
      }
    });

    // Only add row if it has meaningful data
    if (Object.keys(rowData).length > 0) {
      rows.push(rowData);
    }
  });

  return rows;
}

export async function importUnitsFromExcel(file: File): Promise<ImportResult> {
  const result: ImportResult = {
    valid: [],
    errors: [],
    summary: {
      total: 0,
      changed: 0,
      unchanged: 0,
      errors: 0,
    },
  };

  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // Get the first sheet (Units sheet)
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      result.errors.push({ row: 0, message: "Excel file is empty or has no sheets" });
      return result;
    }

    const jsonData = worksheetToJson(worksheet);

    if (jsonData.length === 0) {
      result.errors.push({ row: 0, message: "No data found in the Excel file" });
      return result;
    }

    // Validate required columns (only the essential ones)
    const requiredColumns = ["Development Name", "Unit Number"];
    const firstRow = jsonData[0] as Record<string, unknown>;
    const missingColumns = requiredColumns.filter((col) => !(col in firstRow));

    if (missingColumns.length > 0) {
      result.errors.push({
        row: 0,
        message: `Missing required columns: ${missingColumns.join(", ")}`,
      });
      return result;
    }

    result.summary.total = jsonData.length;

    // Process each row
    jsonData.forEach((row, index) => {
      const rowNum = index + 2; // +2 because Excel is 1-indexed and row 1 is header

      const developmentName = String(row["Development Name"] || "").trim();
      const unitNumber = String(row["Unit Number"] || "").trim();

      // Find the development and unit
      const development = developments.find((d) => d.name === developmentName);
      if (!development) {
        result.errors.push({
          row: rowNum,
          message: `Development "${developmentName}" not found`,
        });
        result.summary.errors++;
        return;
      }

      const unit = development.units.find((u) => u.unitNumber === unitNumber);
      if (!unit) {
        result.errors.push({
          row: rowNum,
          message: `Unit "${unitNumber}" not found in development "${developmentName}"`,
        });
        result.summary.errors++;
        return;
      }

      const changes: ImportChange[] = [];
      const warnings: string[] = [];
      const updatedUnit: Unit = {
        ...unit,
        documentation: { ...unit.documentation },
        keyDates: { ...unit.keyDates },
      };

      // Unit Type
      const unitType = String(row["Unit Type"] || "").trim();
      if (unitType && compareValues(unit.type, unitType)) {
        changes.push({ field: "type", oldValue: unit.type, newValue: unitType });
        updatedUnit.type = unitType as Unit["type"];
      }

      // Address
      const address = String(row["Address"] || "").trim();
      if (compareValues(unit.address, address)) {
        changes.push({ field: "address", oldValue: unit.address, newValue: address });
        updatedUnit.address = address || undefined;
      }

      // Construction Unit Type (free text)
      if ("Construction Unit Type" in row) {
        const constructionUnitType = String(row["Construction Unit Type"] || "").trim();
        if (compareValues(unit.constructionUnitType, constructionUnitType)) {
          changes.push({ field: "constructionUnitType", oldValue: unit.constructionUnitType, newValue: constructionUnitType || undefined });
          updatedUnit.constructionUnitType = constructionUnitType || undefined;
        }
      }

      // Construction Phase (free text)
      if ("Construction Phase" in row) {
        const constructionPhase = String(row["Construction Phase"] || "").trim();
        if (compareValues(unit.constructionPhase, constructionPhase)) {
          changes.push({ field: "constructionPhase", oldValue: unit.constructionPhase, newValue: constructionPhase || undefined });
          updatedUnit.constructionPhase = constructionPhase || undefined;
        }
      }

      // Developer Company
      if ("Developer Company" in row) {
        const developerCompany = String(row["Developer Company"] || "").trim();
        if (compareValues(unit.developerCompanyId, developerCompany)) {
          changes.push({ field: "developerCompanyId", oldValue: unit.developerCompanyId, newValue: developerCompany || undefined });
          updatedUnit.developerCompanyId = developerCompany || undefined;
        }
      }

      // Bedrooms (can be number or string like "Studio", "1 Bed", etc.)
      if ("Bedrooms" in row && row["Bedrooms"] !== undefined && row["Bedrooms"] !== "") {
        const bedroomsRaw = row["Bedrooms"];
        let bedroomsValue: number | string;
        if (typeof bedroomsRaw === "number") {
          bedroomsValue = bedroomsRaw;
        } else {
          const strVal = String(bedroomsRaw).trim();
          const numVal = parseNumber(strVal);
          bedroomsValue = numVal !== undefined ? numVal : strVal;
        }
        if (compareValues(unit.bedrooms, bedroomsValue)) {
          changes.push({ field: "bedrooms", oldValue: unit.bedrooms, newValue: bedroomsValue });
          updatedUnit.bedrooms = bedroomsValue;
        }
      }

      // Size
      const size = parseNumber(row["Size (m²)"]);
      if (size !== undefined && compareValues(unit.size, size)) {
        changes.push({ field: "size", oldValue: unit.size, newValue: size });
        updatedUnit.size = size;
      }

      // Construction Status
      const constructionStatus = validateConstructionStatus(row["Construction Status"]);
      if (constructionStatus === null && row["Construction Status"]) {
        result.errors.push({
          row: rowNum,
          message: `Invalid Construction Status: "${row["Construction Status"]}". Must be one of: ${CONSTRUCTION_STATUSES.join(", ")}`,
        });
        result.summary.errors++;
        return;
      }
      if (constructionStatus && compareValues(unit.constructionStatus, constructionStatus)) {
        changes.push({ field: "constructionStatus", oldValue: unit.constructionStatus, newValue: constructionStatus });
        updatedUnit.constructionStatus = constructionStatus;
      }

      // Sales Status
      const salesStatus = validateSalesStatus(row["Sales Status"]);
      if (salesStatus === null && row["Sales Status"]) {
        result.errors.push({
          row: rowNum,
          message: `Invalid Sales Status: "${row["Sales Status"]}". Must be one of: ${SALES_STATUSES.join(", ")}`,
        });
        result.summary.errors++;
        return;
      }
      if (salesStatus && compareValues(unit.salesStatus, salesStatus)) {
        changes.push({ field: "salesStatus", oldValue: unit.salesStatus, newValue: salesStatus });
        updatedUnit.salesStatus = salesStatus;
      }

      // BCMS Approved (Yes/No) - derives from bcmsApprovedDate
      if ("BCMS Approved" in row) {
        const bcmsApprovedValue = parseYesNo(row["BCMS Approved"]);
        const currentlyApproved = !!unit.documentation?.bcmsApprovedDate;

        if (bcmsApprovedValue && !currentlyApproved) {
          // Setting to Yes - set bcmsApprovedDate to today if not already set
          const today = new Date().toISOString().split("T")[0];
          changes.push({ field: "documentation.bcmsApprovedDate", oldValue: unit.documentation?.bcmsApprovedDate, newValue: today });
          updatedUnit.documentation.bcmsApprovedDate = today;
        } else if (!bcmsApprovedValue && currentlyApproved) {
          // Setting to No - clear bcmsApprovedDate
          changes.push({ field: "documentation.bcmsApprovedDate", oldValue: unit.documentation?.bcmsApprovedDate, newValue: undefined });
          updatedUnit.documentation.bcmsApprovedDate = undefined;
        }
      }

      // Homebond Approved (Yes/No) - derives from homebondApprovedDate
      if ("Homebond Approved" in row) {
        const homebondApprovedValue = parseYesNo(row["Homebond Approved"]);
        const currentlyApproved = !!unit.documentation?.homebondApprovedDate;

        if (homebondApprovedValue && !currentlyApproved) {
          // Setting to Yes - set homebondApprovedDate to today if not already set
          const today = new Date().toISOString().split("T")[0];
          changes.push({ field: "documentation.homebondApprovedDate", oldValue: unit.documentation?.homebondApprovedDate, newValue: today });
          updatedUnit.documentation.homebondApprovedDate = today;
        } else if (!homebondApprovedValue && currentlyApproved) {
          // Setting to No - clear homebondApprovedDate
          changes.push({ field: "documentation.homebondApprovedDate", oldValue: unit.documentation?.homebondApprovedDate, newValue: undefined });
          updatedUnit.documentation.homebondApprovedDate = undefined;
        }
      }

      // BER Approved (Yes/No) - derives from berApprovedDate
      if ("BER Approved" in row) {
        const berApprovedValue = parseYesNo(row["BER Approved"]);
        const currentlyApproved = !!unit.documentation?.berApprovedDate;

        if (berApprovedValue && !currentlyApproved) {
          // Setting to Yes - set berApprovedDate to today if not already set
          const today = new Date().toISOString().split("T")[0];
          changes.push({ field: "documentation.berApprovedDate", oldValue: unit.documentation?.berApprovedDate, newValue: today });
          updatedUnit.documentation.berApprovedDate = today;
        } else if (!berApprovedValue && currentlyApproved) {
          // Setting to No - clear berApprovedDate
          changes.push({ field: "documentation.berApprovedDate", oldValue: unit.documentation?.berApprovedDate, newValue: undefined });
          updatedUnit.documentation.berApprovedDate = undefined;
        }
      }

      // FC Compliance (Yes/No) - derives from fcComplianceReceivedDate
      if ("FC Compliance" in row) {
        const fcComplianceValue = parseYesNo(row["FC Compliance"]);
        const currentlyReceived = !!unit.documentation?.fcComplianceReceivedDate;

        if (fcComplianceValue && !currentlyReceived) {
          // Setting to Yes - set fcComplianceReceivedDate to today if not already set
          const today = new Date().toISOString().split("T")[0];
          changes.push({ field: "documentation.fcComplianceReceivedDate", oldValue: unit.documentation?.fcComplianceReceivedDate, newValue: today });
          updatedUnit.documentation.fcComplianceReceivedDate = today;
        } else if (!fcComplianceValue && currentlyReceived) {
          // Setting to No - clear fcComplianceReceivedDate
          changes.push({ field: "documentation.fcComplianceReceivedDate", oldValue: unit.documentation?.fcComplianceReceivedDate, newValue: undefined });
          updatedUnit.documentation.fcComplianceReceivedDate = undefined;
        }
      }

      // Price Ex VAT
      const priceExVat = parseNumber(row["Price Ex VAT"]);
      if (priceExVat !== undefined && compareValues(unit.priceExVat, priceExVat)) {
        if (unit.priceExVat && Math.abs(priceExVat - unit.priceExVat) / unit.priceExVat > 0.2) {
          warnings.push(`Price Ex VAT change >20%: ${unit.priceExVat} → ${priceExVat}`);
        }
        changes.push({ field: "priceExVat", oldValue: unit.priceExVat, newValue: priceExVat });
        updatedUnit.priceExVat = priceExVat;
      }

      // Price Inc VAT
      const priceIncVat = parseNumber(row["Price Inc VAT"]);
      if (priceIncVat !== undefined && compareValues(unit.priceIncVat || unit.listPrice, priceIncVat)) {
        const oldPrice = unit.priceIncVat || unit.listPrice;
        if (oldPrice && Math.abs(priceIncVat - oldPrice) / oldPrice > 0.2) {
          warnings.push(`Price Inc VAT change >20%: ${oldPrice} → ${priceIncVat}`);
        }
        changes.push({ field: "priceIncVat", oldValue: oldPrice, newValue: priceIncVat });
        updatedUnit.priceIncVat = priceIncVat;
        updatedUnit.listPrice = priceIncVat;
      }

      // List Price
      if ("List Price" in row) {
        const listPrice = parseNumber(row["List Price"]);
        if (listPrice !== undefined && compareValues(unit.listPrice, listPrice)) {
          if (unit.listPrice && Math.abs(listPrice - unit.listPrice) / unit.listPrice > 0.2) {
            warnings.push(`List Price change >20%: ${unit.listPrice} → ${listPrice}`);
          }
          changes.push({ field: "listPrice", oldValue: unit.listPrice, newValue: listPrice });
          updatedUnit.listPrice = listPrice;
        }
      }

      // Sold Price
      if ("Sold Price" in row) {
        const soldPrice = parseNumber(row["Sold Price"]);
        if (compareValues(unit.soldPrice, soldPrice)) {
          changes.push({ field: "soldPrice", oldValue: unit.soldPrice, newValue: soldPrice });
          updatedUnit.soldPrice = soldPrice;
        }
      }

      // Purchaser Type
      const purchaserType = validatePurchaserType(row["Purchaser Type"]);
      if (purchaserType === null && row["Purchaser Type"] && String(row["Purchaser Type"]).trim()) {
        result.errors.push({
          row: rowNum,
          message: `Invalid Purchaser Type: "${row["Purchaser Type"]}". Must be one of: ${PURCHASER_TYPES.join(", ")}`,
        });
        result.summary.errors++;
        return;
      }
      if (purchaserType && compareValues(unit.purchaserType, purchaserType)) {
        changes.push({ field: "purchaserType", oldValue: unit.purchaserType, newValue: purchaserType });
        updatedUnit.purchaserType = purchaserType;
      }

      // Part V
      const partV = parseYesNo(row["Part V"]);
      if (compareValues(unit.partV, partV)) {
        changes.push({ field: "partV", oldValue: unit.partV, newValue: partV });
        updatedUnit.partV = partV;
      }

      // Purchaser Name
      const purchaserName = String(row["Purchaser Name"] || "").trim();
      if (compareValues(unit.purchaserName, purchaserName)) {
        changes.push({ field: "purchaserName", oldValue: unit.purchaserName, newValue: purchaserName || undefined });
        updatedUnit.purchaserName = purchaserName || undefined;
      }

      // Purchaser Phone
      const purchaserPhone = String(row["Purchaser Phone"] || "").trim();
      if (compareValues(unit.purchaserPhone, purchaserPhone)) {
        changes.push({ field: "purchaserPhone", oldValue: unit.purchaserPhone, newValue: purchaserPhone || undefined });
        updatedUnit.purchaserPhone = purchaserPhone || undefined;
      }

      // Purchaser Email
      const purchaserEmail = String(row["Purchaser Email"] || "").trim();
      if (compareValues(unit.purchaserEmail, purchaserEmail)) {
        changes.push({ field: "purchaserEmail", oldValue: unit.purchaserEmail, newValue: purchaserEmail || undefined });
        updatedUnit.purchaserEmail = purchaserEmail || undefined;
      }

      // Key Dates (4 new simplified dates)
      if ("Planned BCMS" in row) {
        const plannedBcms = parseDate(row["Planned BCMS"]);
        if (compareValues(unit.keyDates?.plannedBcms, plannedBcms)) {
          changes.push({ field: "keyDates.plannedBcms", oldValue: unit.keyDates?.plannedBcms, newValue: plannedBcms });
          updatedUnit.keyDates = { ...updatedUnit.keyDates, plannedBcms } as UnitDates;
        }
      }

      if ("Actual BCMS" in row) {
        const actualBcms = parseDate(row["Actual BCMS"]);
        if (compareValues(unit.keyDates?.actualBcms, actualBcms)) {
          changes.push({ field: "keyDates.actualBcms", oldValue: unit.keyDates?.actualBcms, newValue: actualBcms });
          updatedUnit.keyDates = { ...updatedUnit.keyDates, actualBcms } as UnitDates;
        }
      }

      if ("Planned Close" in row) {
        const plannedClose = parseDate(row["Planned Close"]);
        if (compareValues(unit.keyDates?.plannedClose, plannedClose)) {
          changes.push({ field: "keyDates.plannedClose", oldValue: unit.keyDates?.plannedClose, newValue: plannedClose });
          updatedUnit.keyDates = { ...updatedUnit.keyDates, plannedClose } as UnitDates;
        }
      }

      if ("Actual Close" in row) {
        const actualClose = parseDate(row["Actual Close"]);
        if (compareValues(unit.keyDates?.actualClose, actualClose)) {
          changes.push({ field: "keyDates.actualClose", oldValue: unit.keyDates?.actualClose, newValue: actualClose });
          updatedUnit.keyDates = { ...updatedUnit.keyDates, actualClose } as UnitDates;
        }
      }

      // Completion Documentation (6 new date-only fields)
      if ("BCMS Submit Date" in row) {
        const bcmsSubmitDate = parseDate(row["BCMS Submit Date"]);
        if (compareValues(unit.documentation.bcmsSubmitDate, bcmsSubmitDate)) {
          changes.push({ field: "documentation.bcmsSubmitDate", oldValue: unit.documentation.bcmsSubmitDate, newValue: bcmsSubmitDate });
          updatedUnit.documentation.bcmsSubmitDate = bcmsSubmitDate;
        }
      }

      if ("BCMS Approved Date" in row) {
        const bcmsApprovedDate = parseDate(row["BCMS Approved Date"]);
        if (compareValues(unit.documentation.bcmsApprovedDate, bcmsApprovedDate)) {
          changes.push({ field: "documentation.bcmsApprovedDate", oldValue: unit.documentation.bcmsApprovedDate, newValue: bcmsApprovedDate });
          updatedUnit.documentation.bcmsApprovedDate = bcmsApprovedDate;
        }
      }

      if ("Homebond Submit Date" in row) {
        const homebondSubmitDate = parseDate(row["Homebond Submit Date"]);
        if (compareValues(unit.documentation.homebondSubmitDate, homebondSubmitDate)) {
          changes.push({ field: "documentation.homebondSubmitDate", oldValue: unit.documentation.homebondSubmitDate, newValue: homebondSubmitDate });
          updatedUnit.documentation.homebondSubmitDate = homebondSubmitDate;
        }
      }

      if ("Homebond Approved Date" in row) {
        const homebondApprovedDate = parseDate(row["Homebond Approved Date"]);
        if (compareValues(unit.documentation.homebondApprovedDate, homebondApprovedDate)) {
          changes.push({ field: "documentation.homebondApprovedDate", oldValue: unit.documentation.homebondApprovedDate, newValue: homebondApprovedDate });
          updatedUnit.documentation.homebondApprovedDate = homebondApprovedDate;
        }
      }

      if ("BER Approved Date" in row) {
        const berApprovedDate = parseDate(row["BER Approved Date"]);
        if (compareValues(unit.documentation.berApprovedDate, berApprovedDate)) {
          changes.push({ field: "documentation.berApprovedDate", oldValue: unit.documentation.berApprovedDate, newValue: berApprovedDate });
          updatedUnit.documentation.berApprovedDate = berApprovedDate;
        }
      }

      if ("FC Compliance Received Date" in row) {
        const fcComplianceReceivedDate = parseDate(row["FC Compliance Received Date"]);
        if (compareValues(unit.documentation.fcComplianceReceivedDate, fcComplianceReceivedDate)) {
          changes.push({ field: "documentation.fcComplianceReceivedDate", oldValue: unit.documentation.fcComplianceReceivedDate, newValue: fcComplianceReceivedDate });
          updatedUnit.documentation.fcComplianceReceivedDate = fcComplianceReceivedDate;
        }
      }

      if ("Land Map Submit Date" in row) {
        const landMapSubmitDate = parseDate(row["Land Map Submit Date"]);
        if (compareValues(unit.documentation.landMapSubmitDate, landMapSubmitDate)) {
          changes.push({ field: "documentation.landMapSubmitDate", oldValue: unit.documentation.landMapSubmitDate, newValue: landMapSubmitDate });
          updatedUnit.documentation.landMapSubmitDate = landMapSubmitDate;
        }
      }

      if ("Land Map Received Date" in row) {
        const landMapReceivedDate = parseDate(row["Land Map Received Date"]);
        if (compareValues(unit.documentation.landMapReceivedDate, landMapReceivedDate)) {
          changes.push({ field: "documentation.landMapReceivedDate", oldValue: unit.documentation.landMapReceivedDate, newValue: landMapReceivedDate });
          updatedUnit.documentation.landMapReceivedDate = landMapReceivedDate;
        }
      }

      // Sales Documentation (4 date-only fields)
      if ("SAN Approved Date" in row) {
        const sanApprovedDate = parseDate(row["SAN Approved Date"]);
        if (compareValues(unit.documentation.sanApprovedDate, sanApprovedDate)) {
          changes.push({ field: "documentation.sanApprovedDate", oldValue: unit.documentation.sanApprovedDate, newValue: sanApprovedDate });
          updatedUnit.documentation.sanApprovedDate = sanApprovedDate;
        }
      }

      if ("Contract Issued Date" in row) {
        const contractIssuedDate = parseDate(row["Contract Issued Date"]);
        if (compareValues(unit.documentation.contractIssuedDate, contractIssuedDate)) {
          changes.push({ field: "documentation.contractIssuedDate", oldValue: unit.documentation.contractIssuedDate, newValue: contractIssuedDate });
          updatedUnit.documentation.contractIssuedDate = contractIssuedDate;
        }
      }

      if ("Contract Signed Date" in row) {
        const contractSignedDate = parseDate(row["Contract Signed Date"]);
        if (compareValues(unit.documentation.contractSignedDate, contractSignedDate)) {
          changes.push({ field: "documentation.contractSignedDate", oldValue: unit.documentation.contractSignedDate, newValue: contractSignedDate });
          updatedUnit.documentation.contractSignedDate = contractSignedDate;
        }
      }

      if ("Sale Closed Date" in row) {
        const saleClosedDate = parseDate(row["Sale Closed Date"]);
        if (compareValues(unit.documentation.saleClosedDate, saleClosedDate)) {
          changes.push({ field: "documentation.saleClosedDate", oldValue: unit.documentation.saleClosedDate, newValue: saleClosedDate });
          updatedUnit.documentation.saleClosedDate = saleClosedDate;
        }
      }

      // Incentive fields
      if ("Incentive Scheme" in row) {
        const incentiveScheme = String(row["Incentive Scheme"] || "").trim();
        if (compareValues(unit.appliedIncentive, incentiveScheme)) {
          changes.push({ field: "appliedIncentive", oldValue: unit.appliedIncentive, newValue: incentiveScheme || undefined });
          updatedUnit.appliedIncentive = incentiveScheme || undefined;
        }
      }

      if ("Incentive Status" in row) {
        const incentiveStatus = validateIncentiveStatus(row["Incentive Status"]);
        if (incentiveStatus !== null && compareValues(unit.incentiveStatus, incentiveStatus)) {
          changes.push({ field: "incentiveStatus", oldValue: unit.incentiveStatus, newValue: incentiveStatus });
          updatedUnit.incentiveStatus = incentiveStatus;
        }
      }

      // Add to valid rows
      if (changes.length > 0) {
        result.valid.push({
          developmentId: development.id,
          developmentName: development.name,
          unitNumber: unit.unitNumber,
          changes,
          unit: updatedUnit,
          warnings,
        });
        result.summary.changed++;
      } else {
        result.summary.unchanged++;
      }
    });

  } catch (error) {
    result.errors.push({
      row: 0,
      message: `Failed to read Excel file: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }

  return result;
}

const UNIT_OVERRIDES_KEY = "development_tracker_unit_overrides";

interface UnitOverride {
  developmentId: string;
  unitNumber: string;
  unit: Unit;
}

// Load and apply any saved unit overrides from localStorage
export function loadUnitOverrides(): void {
  try {
    const saved = localStorage.getItem(UNIT_OVERRIDES_KEY);
    if (!saved) return;

    const overrides: UnitOverride[] = JSON.parse(saved);
    overrides.forEach((override) => {
      const development = developments.find((d) => d.id === override.developmentId);
      if (!development) return;

      const unitIndex = development.units.findIndex((u) => u.unitNumber === override.unitNumber);
      if (unitIndex === -1) return;

      development.units[unitIndex] = override.unit;
    });
  } catch (error) {
    console.error("Failed to load unit overrides:", error);
  }
}

// Save unit override to localStorage
function saveUnitOverride(developmentId: string, unitNumber: string, unit: Unit): void {
  try {
    const saved = localStorage.getItem(UNIT_OVERRIDES_KEY);
    const overrides: UnitOverride[] = saved ? JSON.parse(saved) : [];

    // Find existing override or add new one
    const existingIndex = overrides.findIndex(
      (o) => o.developmentId === developmentId && o.unitNumber === unitNumber
    );

    if (existingIndex >= 0) {
      overrides[existingIndex].unit = unit;
    } else {
      overrides.push({ developmentId, unitNumber, unit });
    }

    localStorage.setItem(UNIT_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch (error) {
    console.error("Failed to save unit override:", error);
  }
}

export async function applyImportChanges(
  changes: ImportRow[],
  userId: string,
  userEmail: string,
  userName?: string
): Promise<ApplyResult> {
  const result: ApplyResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  // Log bulk import summary
  try {
    await logChange({
      userId,
      userEmail,
      userName: userName || "",
      action: "bulk_update",
      entityType: "unit",
      entityId: "bulk_import",
      changes: [{
        field: "summary",
        oldValue: null,
        newValue: `Bulk import: ${changes.length} units updated via Excel import`,
      }],
    });
  } catch (error) {
    console.error("Failed to log bulk import summary:", error);
  }

  // Apply changes to each unit
  for (const change of changes) {
    try {
      // Find the development and unit in the data
      const development = developments.find((d) => d.id === change.developmentId);
      if (!development) {
        result.failed++;
        result.errors.push(`Development ${change.developmentName} not found`);
        continue;
      }

      const unitIndex = development.units.findIndex((u) => u.unitNumber === change.unitNumber);
      if (unitIndex === -1) {
        result.failed++;
        result.errors.push(`Unit ${change.unitNumber} not found in ${change.developmentName}`);
        continue;
      }

      // Apply the changes to the unit (in-memory update)
      development.units[unitIndex] = change.unit;

      // Save to localStorage for persistence
      saveUnitOverride(change.developmentId, change.unitNumber, change.unit);

      // Log individual unit changes
      await logChange({
        userId,
        userEmail,
        userName: userName || "",
        action: "update",
        entityType: "unit",
        entityId: change.unitNumber,
        changes: change.changes.map((c) => ({
          field: `${c.field} (via Excel import)`,
          oldValue: c.oldValue,
          newValue: c.newValue,
        })),
        developmentId: change.developmentId,
        developmentName: change.developmentName,
        unitNumber: change.unitNumber,
      });

      result.success++;
    } catch (error) {
      result.failed++;
      result.errors.push(
        `Failed to update ${change.unitNumber}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return result;
}

export function formatFieldName(field: string): string {
  const fieldNames: Record<string, string> = {
    type: "Unit Type",
    address: "Address",
    constructionUnitType: "Construction Unit Type",
    constructionPhase: "Construction Phase",
    developerCompanyId: "Developer Company",
    bedrooms: "Bedrooms",
    size: "Size (m²)",
    constructionStatus: "Construction Status",
    salesStatus: "Sales Status",
    priceExVat: "Price Ex VAT",
    priceIncVat: "Price Inc VAT",
    purchaserType: "Purchaser Type",
    partV: "Part V",
    purchaserName: "Purchaser Name",
    purchaserPhone: "Purchaser Phone",
    purchaserEmail: "Purchaser Email",
    appliedIncentive: "Incentive Scheme",
    incentiveStatus: "Incentive Status",
    // Key Dates
    "keyDates.plannedBcms": "Planned BCMS",
    "keyDates.actualBcms": "Actual BCMS",
    "keyDates.plannedClose": "Planned Close",
    "keyDates.actualClose": "Actual Close",
    // Completion Documentation
    "documentation.bcmsSubmitDate": "BCMS Submit Date",
    "documentation.bcmsApprovedDate": "BCMS Approved Date",
    "documentation.homebondSubmitDate": "Homebond Submit Date",
    "documentation.homebondApprovedDate": "Homebond Approved Date",
    "documentation.berApprovedDate": "BER Approved Date",
    "documentation.fcComplianceReceivedDate": "FC Compliance Received Date",
    // Sales Documentation
    "documentation.sanApprovedDate": "SAN Approved Date",
    "documentation.contractIssuedDate": "Contract Issued Date",
    "documentation.contractSignedDate": "Contract Signed Date",
    "documentation.saleClosedDate": "Sale Closed Date",
  };
  return fieldNames[field] || field;
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    // Format as currency if it looks like a price
    if (value > 1000) {
      return new Intl.NumberFormat("en-IE", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 0,
      }).format(value);
    }
    return String(value);
  }
  return String(value);
}
