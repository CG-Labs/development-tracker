import * as XLSX from "xlsx";
import { developments } from "../data/realDevelopments";
import type { Unit, ConstructionStatus, SalesStatus, PurchaserType } from "../types";
import { logChange } from "./auditLogService";
import { getExportColumns } from "./excelExportService";

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

  // If it's already a date object or serial number from Excel
  if (typeof value === "number") {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return new Date(date.y, date.m - 1, date.d).toISOString().split("T")[0];
    }
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
    const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });

    // Get the first sheet (Units sheet)
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      result.errors.push({ row: 0, message: "Excel file is empty or has no sheets" });
      return result;
    }

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    if (jsonData.length === 0) {
      result.errors.push({ row: 0, message: "No data found in the Excel file" });
      return result;
    }

    // Validate required columns
    const requiredColumns = getExportColumns();
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
    jsonData.forEach((rawRow, index) => {
      const row = rawRow as Record<string, unknown>;
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
      const updatedUnit = { ...unit, documentation: { ...unit.documentation } };

      // Check each field for changes
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

      // Bedrooms
      const bedrooms = parseNumber(row["Bedrooms"]);
      if (bedrooms !== undefined && compareValues(unit.bedrooms, bedrooms)) {
        changes.push({ field: "bedrooms", oldValue: unit.bedrooms, newValue: bedrooms });
        updatedUnit.bedrooms = bedrooms;
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

      // Price Ex VAT
      const priceExVat = parseNumber(row["Price Ex VAT"]);
      if (priceExVat !== undefined && compareValues(unit.priceExVat, priceExVat)) {
        // Check for large price change warning
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

      // Documentation fields
      const bcmsReceived = parseYesNo(row["BCMS Received"]);
      if (compareValues(unit.documentation.bcmsReceived, bcmsReceived)) {
        changes.push({ field: "documentation.bcmsReceived", oldValue: unit.documentation.bcmsReceived, newValue: bcmsReceived });
        updatedUnit.documentation.bcmsReceived = bcmsReceived;
      }

      const plannedBcmsDate = parseDate(row["Planned BCMS Date"]);
      if (compareValues(unit.documentation.bcmsReceivedDate, plannedBcmsDate)) {
        changes.push({ field: "documentation.bcmsReceivedDate", oldValue: unit.documentation.bcmsReceivedDate, newValue: plannedBcmsDate });
        updatedUnit.documentation.bcmsReceivedDate = plannedBcmsDate;
      }

      const landRegistryApproved = parseYesNo(row["Land Registry Approved"]);
      if (compareValues(unit.documentation.landRegistryApproved, landRegistryApproved)) {
        changes.push({ field: "documentation.landRegistryApproved", oldValue: unit.documentation.landRegistryApproved, newValue: landRegistryApproved });
        updatedUnit.documentation.landRegistryApproved = landRegistryApproved;
      }

      const homebondReceived = parseYesNo(row["Homebond Received"]);
      if (compareValues(unit.documentation.homebondReceived, homebondReceived)) {
        changes.push({ field: "documentation.homebondReceived", oldValue: unit.documentation.homebondReceived, newValue: homebondReceived });
        updatedUnit.documentation.homebondReceived = homebondReceived;
      }

      const sanApproved = parseYesNo(row["SAN Approved"]);
      if (compareValues(unit.documentation.sanApproved, sanApproved)) {
        changes.push({ field: "documentation.sanApproved", oldValue: unit.documentation.sanApproved, newValue: sanApproved });
        updatedUnit.documentation.sanApproved = sanApproved;
      }

      const contractIssued = parseYesNo(row["Contract Issued"]);
      if (compareValues(unit.documentation.contractIssued, contractIssued)) {
        changes.push({ field: "documentation.contractIssued", oldValue: unit.documentation.contractIssued, newValue: contractIssued });
        updatedUnit.documentation.contractIssued = contractIssued;
      }

      const contractSigned = parseYesNo(row["Contract Signed"]);
      if (compareValues(unit.documentation.contractSigned, contractSigned)) {
        changes.push({ field: "documentation.contractSigned", oldValue: unit.documentation.contractSigned, newValue: contractSigned });
        updatedUnit.documentation.contractSigned = contractSigned;
      }

      const saleClosed = parseYesNo(row["Sale Closed"]);
      if (compareValues(unit.documentation.saleClosed, saleClosed)) {
        changes.push({ field: "documentation.saleClosed", oldValue: unit.documentation.saleClosed, newValue: saleClosed });
        updatedUnit.documentation.saleClosed = saleClosed;
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
    "documentation.bcmsReceived": "BCMS Received",
    "documentation.bcmsReceivedDate": "Planned BCMS Date",
    "documentation.landRegistryApproved": "Land Registry Approved",
    "documentation.homebondReceived": "Homebond Received",
    "documentation.sanApproved": "SAN Approved",
    "documentation.contractIssued": "Contract Issued",
    "documentation.contractSigned": "Contract Signed",
    "documentation.saleClosed": "Sale Closed",
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
