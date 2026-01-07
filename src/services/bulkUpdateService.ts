import { developments } from "../data/realDevelopments";
import type { Unit, ConstructionStatus, SalesStatus, PurchaserType } from "../types";
import { logChange } from "./auditLogService";

const UNIT_OVERRIDES_KEY = "development_tracker_unit_overrides";

export interface BulkUpdateChanges {
  // Status updates
  constructionStatus?: ConstructionStatus;
  salesStatus?: SalesStatus;

  // Purchaser info
  purchaserType?: PurchaserType;
  partV?: boolean;

  // Documentation - completion
  bcmsReceived?: boolean;
  bcmsReceivedDate?: string;
  landRegistryApproved?: boolean;
  landRegistryApprovedDate?: string;
  homebondReceived?: boolean;
  homebondReceivedDate?: string;

  // Documentation - sales
  sanApproved?: boolean;
  sanApprovedDate?: string;
  contractIssued?: boolean;
  contractIssuedDate?: string;
  contractSigned?: boolean;
  contractSignedDate?: string;
  saleClosed?: boolean;
  saleClosedDate?: string;
}

export interface BulkUpdateError {
  unitNumber: string;
  developmentName: string;
  reason: string;
  errorType: 'unit_not_found' | 'invalid_status' | 'invalid_date' | 'storage_error' | 'validation_failed' | 'unknown';
}

export interface BulkUpdateResult {
  success: number;
  failed: number;
  errors: BulkUpdateError[];
  successfulUnits: string[];
}

interface UnitOverride {
  developmentId: string;
  unitNumber: string;
  unit: Unit;
}

function saveUnitOverride(developmentId: string, unitNumber: string, unit: Unit): void {
  try {
    const saved = localStorage.getItem(UNIT_OVERRIDES_KEY);
    const overrides: UnitOverride[] = saved ? JSON.parse(saved) : [];

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

function applyChangesToUnit(unit: Unit, changes: BulkUpdateChanges): { updatedUnit: Unit; appliedChanges: { field: string; oldValue: unknown; newValue: unknown }[] } {
  const updatedUnit = { ...unit, documentation: { ...unit.documentation } };
  const appliedChanges: { field: string; oldValue: unknown; newValue: unknown }[] = [];

  // Status updates
  if (changes.constructionStatus !== undefined) {
    appliedChanges.push({ field: "constructionStatus", oldValue: unit.constructionStatus, newValue: changes.constructionStatus });
    updatedUnit.constructionStatus = changes.constructionStatus;
  }

  if (changes.salesStatus !== undefined) {
    appliedChanges.push({ field: "salesStatus", oldValue: unit.salesStatus, newValue: changes.salesStatus });
    updatedUnit.salesStatus = changes.salesStatus;
  }

  // Purchaser info
  if (changes.purchaserType !== undefined) {
    appliedChanges.push({ field: "purchaserType", oldValue: unit.purchaserType, newValue: changes.purchaserType });
    updatedUnit.purchaserType = changes.purchaserType;
  }

  if (changes.partV !== undefined) {
    appliedChanges.push({ field: "partV", oldValue: unit.partV, newValue: changes.partV });
    updatedUnit.partV = changes.partV;
  }

  // Documentation - completion
  if (changes.bcmsReceived !== undefined) {
    appliedChanges.push({ field: "documentation.bcmsReceived", oldValue: unit.documentation.bcmsReceived, newValue: changes.bcmsReceived });
    updatedUnit.documentation.bcmsReceived = changes.bcmsReceived;
  }
  if (changes.bcmsReceivedDate !== undefined) {
    appliedChanges.push({ field: "documentation.bcmsReceivedDate", oldValue: unit.documentation.bcmsReceivedDate, newValue: changes.bcmsReceivedDate });
    updatedUnit.documentation.bcmsReceivedDate = changes.bcmsReceivedDate;
  }

  if (changes.landRegistryApproved !== undefined) {
    appliedChanges.push({ field: "documentation.landRegistryApproved", oldValue: unit.documentation.landRegistryApproved, newValue: changes.landRegistryApproved });
    updatedUnit.documentation.landRegistryApproved = changes.landRegistryApproved;
  }
  if (changes.landRegistryApprovedDate !== undefined) {
    appliedChanges.push({ field: "documentation.landRegistryApprovedDate", oldValue: unit.documentation.landRegistryApprovedDate, newValue: changes.landRegistryApprovedDate });
    updatedUnit.documentation.landRegistryApprovedDate = changes.landRegistryApprovedDate;
  }

  if (changes.homebondReceived !== undefined) {
    appliedChanges.push({ field: "documentation.homebondReceived", oldValue: unit.documentation.homebondReceived, newValue: changes.homebondReceived });
    updatedUnit.documentation.homebondReceived = changes.homebondReceived;
  }
  if (changes.homebondReceivedDate !== undefined) {
    appliedChanges.push({ field: "documentation.homebondReceivedDate", oldValue: unit.documentation.homebondReceivedDate, newValue: changes.homebondReceivedDate });
    updatedUnit.documentation.homebondReceivedDate = changes.homebondReceivedDate;
  }

  // Documentation - sales
  if (changes.sanApproved !== undefined) {
    appliedChanges.push({ field: "documentation.sanApproved", oldValue: unit.documentation.sanApproved, newValue: changes.sanApproved });
    updatedUnit.documentation.sanApproved = changes.sanApproved;
  }
  if (changes.sanApprovedDate !== undefined) {
    appliedChanges.push({ field: "documentation.sanApprovedDate", oldValue: unit.documentation.sanApprovedDate, newValue: changes.sanApprovedDate });
    updatedUnit.documentation.sanApprovedDate = changes.sanApprovedDate;
  }

  if (changes.contractIssued !== undefined) {
    appliedChanges.push({ field: "documentation.contractIssued", oldValue: unit.documentation.contractIssued, newValue: changes.contractIssued });
    updatedUnit.documentation.contractIssued = changes.contractIssued;
  }
  if (changes.contractIssuedDate !== undefined) {
    appliedChanges.push({ field: "documentation.contractIssuedDate", oldValue: unit.documentation.contractIssuedDate, newValue: changes.contractIssuedDate });
    updatedUnit.documentation.contractIssuedDate = changes.contractIssuedDate;
  }

  if (changes.contractSigned !== undefined) {
    appliedChanges.push({ field: "documentation.contractSigned", oldValue: unit.documentation.contractSigned, newValue: changes.contractSigned });
    updatedUnit.documentation.contractSigned = changes.contractSigned;
  }
  if (changes.contractSignedDate !== undefined) {
    appliedChanges.push({ field: "documentation.contractSignedDate", oldValue: unit.documentation.contractSignedDate, newValue: changes.contractSignedDate });
    updatedUnit.documentation.contractSignedDate = changes.contractSignedDate;
  }

  if (changes.saleClosed !== undefined) {
    appliedChanges.push({ field: "documentation.saleClosed", oldValue: unit.documentation.saleClosed, newValue: changes.saleClosed });
    updatedUnit.documentation.saleClosed = changes.saleClosed;
  }
  if (changes.saleClosedDate !== undefined) {
    appliedChanges.push({ field: "documentation.saleClosedDate", oldValue: unit.documentation.saleClosedDate, newValue: changes.saleClosedDate });
    updatedUnit.documentation.saleClosedDate = changes.saleClosedDate;
  }

  return { updatedUnit, appliedChanges };
}

// Validation helpers
function validateConstructionStatus(status: string): boolean {
  return ['Not Started', 'In Progress', 'Complete'].includes(status);
}

function validateSalesStatus(status: string): boolean {
  return ['Not Released', 'For Sale', 'Under Offer', 'Contracted', 'Complete'].includes(status);
}

function validateDateFormat(dateStr: string): boolean {
  if (!dateStr) return true;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function validateChanges(changes: BulkUpdateChanges): { valid: boolean; reason: string; errorType: BulkUpdateError['errorType'] } {
  if (changes.constructionStatus && !validateConstructionStatus(changes.constructionStatus)) {
    return { valid: false, reason: `Invalid construction status: "${changes.constructionStatus}"`, errorType: 'invalid_status' };
  }
  if (changes.salesStatus && !validateSalesStatus(changes.salesStatus)) {
    return { valid: false, reason: `Invalid sales status: "${changes.salesStatus}"`, errorType: 'invalid_status' };
  }

  // Validate all date fields
  const dateFields = [
    { field: 'bcmsReceivedDate', value: changes.bcmsReceivedDate },
    { field: 'landRegistryApprovedDate', value: changes.landRegistryApprovedDate },
    { field: 'homebondReceivedDate', value: changes.homebondReceivedDate },
    { field: 'sanApprovedDate', value: changes.sanApprovedDate },
    { field: 'contractIssuedDate', value: changes.contractIssuedDate },
    { field: 'contractSignedDate', value: changes.contractSignedDate },
    { field: 'saleClosedDate', value: changes.saleClosedDate },
  ];

  for (const { field, value } of dateFields) {
    if (value && !validateDateFormat(value)) {
      return { valid: false, reason: `Invalid date format for ${field}: "${value}"`, errorType: 'invalid_date' };
    }
  }

  return { valid: true, reason: '', errorType: 'unknown' };
}

export async function applyBulkUpdate(
  developmentId: string,
  unitNumbers: string[],
  changes: BulkUpdateChanges,
  userId: string,
  userEmail: string,
  userName?: string
): Promise<BulkUpdateResult> {
  const result: BulkUpdateResult = {
    success: 0,
    failed: 0,
    errors: [],
    successfulUnits: [],
  };

  const development = developments.find((d) => d.id === developmentId);
  if (!development) {
    // Log critical error
    console.error('[BulkUpdate] Development not found:', developmentId);
    result.failed = unitNumbers.length;
    unitNumbers.forEach(unitNumber => {
      result.errors.push({
        unitNumber,
        developmentName: 'Unknown',
        reason: 'Development not found in database',
        errorType: 'unit_not_found',
      });
    });
    return result;
  }

  // Validate changes before applying
  const validation = validateChanges(changes);
  if (!validation.valid) {
    console.error('[BulkUpdate] Validation failed:', validation.reason);
    result.failed = unitNumbers.length;
    unitNumbers.forEach(unitNumber => {
      result.errors.push({
        unitNumber,
        developmentName: development.name,
        reason: validation.reason,
        errorType: validation.errorType,
      });
    });
    return result;
  }

  // Get list of changes being applied for the summary
  const changesList: string[] = [];
  if (changes.constructionStatus) changesList.push(`Construction Status → ${changes.constructionStatus}`);
  if (changes.salesStatus) changesList.push(`Sales Status → ${changes.salesStatus}`);
  if (changes.purchaserType) changesList.push(`Purchaser Type → ${changes.purchaserType}`);
  if (changes.partV !== undefined) changesList.push(`Part V → ${changes.partV ? "Yes" : "No"}`);
  if (changes.bcmsReceived !== undefined) changesList.push(`BCMS Received → ${changes.bcmsReceived ? "Yes" : "No"}`);
  if (changes.landRegistryApproved !== undefined) changesList.push(`Land Registry Approved → ${changes.landRegistryApproved ? "Yes" : "No"}`);
  if (changes.homebondReceived !== undefined) changesList.push(`Homebond Received → ${changes.homebondReceived ? "Yes" : "No"}`);
  if (changes.sanApproved !== undefined) changesList.push(`SAN Approved → ${changes.sanApproved ? "Yes" : "No"}`);
  if (changes.contractIssued !== undefined) changesList.push(`Contract Issued → ${changes.contractIssued ? "Yes" : "No"}`);
  if (changes.contractSigned !== undefined) changesList.push(`Contract Signed → ${changes.contractSigned ? "Yes" : "No"}`);
  if (changes.saleClosed !== undefined) changesList.push(`Sale Closed → ${changes.saleClosed ? "Yes" : "No"}`);

  // Log bulk update summary
  try {
    await logChange({
      userId,
      userEmail,
      userName: userName || "",
      action: "bulk_update",
      entityType: "unit",
      entityId: "bulk_update",
      changes: [{
        field: "summary",
        oldValue: null,
        newValue: `Bulk update: ${unitNumbers.length} units. Changes: ${changesList.join(", ")}`,
      }],
      developmentId,
      developmentName: development.name,
    });
  } catch (error) {
    console.error("Failed to log bulk update summary:", error);
  }

  // Apply changes to each unit
  for (const unitNumber of unitNumbers) {
    try {
      const unitIndex = development.units.findIndex((u) => u.unitNumber === unitNumber);
      if (unitIndex === -1) {
        result.failed++;
        const error: BulkUpdateError = {
          unitNumber,
          developmentName: development.name,
          reason: `Unit "${unitNumber}" not found in ${development.name}`,
          errorType: 'unit_not_found',
        };
        result.errors.push(error);
        console.warn('[BulkUpdate] Unit not found:', { unitNumber, developmentId, developmentName: development.name });
        continue;
      }

      const unit = development.units[unitIndex];
      const { updatedUnit, appliedChanges } = applyChangesToUnit(unit, changes);

      // Apply changes in memory
      development.units[unitIndex] = updatedUnit;

      // Save to localStorage for persistence
      try {
        saveUnitOverride(developmentId, unitNumber, updatedUnit);
      } catch (storageError) {
        result.failed++;
        const error: BulkUpdateError = {
          unitNumber,
          developmentName: development.name,
          reason: `Storage error: Failed to save changes to local storage`,
          errorType: 'storage_error',
        };
        result.errors.push(error);
        console.error('[BulkUpdate] Storage error:', { unitNumber, error: storageError });
        continue;
      }

      // Log individual unit changes
      if (appliedChanges.length > 0) {
        await logChange({
          userId,
          userEmail,
          userName: userName || "",
          action: "update",
          entityType: "unit",
          entityId: unitNumber,
          changes: appliedChanges.map((c) => ({
            field: `${c.field} (via bulk update)`,
            oldValue: c.oldValue,
            newValue: c.newValue,
          })),
          developmentId,
          developmentName: development.name,
          unitNumber,
        });
      }

      result.success++;
      result.successfulUnits.push(unitNumber);
    } catch (error) {
      result.failed++;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const bulkError: BulkUpdateError = {
        unitNumber,
        developmentName: development.name,
        reason: `Update failed: ${errorMessage}`,
        errorType: 'unknown',
      };
      result.errors.push(bulkError);
      console.error('[BulkUpdate] Failed to update unit:', { unitNumber, error: errorMessage });
    }
  }

  // Update the audit log summary to include success/failure counts
  try {
    await logChange({
      userId,
      userEmail,
      userName: userName || "",
      action: "bulk_update",
      entityType: "unit",
      entityId: "bulk_update_summary",
      changes: [{
        field: "result",
        oldValue: null,
        newValue: `Bulk update completed: ${result.success} succeeded, ${result.failed} failed. Changes: ${changesList.join(", ")}`,
      }],
      developmentId,
      developmentName: development.name,
    });
  } catch (logError) {
    console.error('[BulkUpdate] Failed to log summary:', logError);
  }

  return result;
}

export function getChangeDescription(changes: BulkUpdateChanges): string[] {
  const descriptions: string[] = [];

  if (changes.constructionStatus) {
    descriptions.push(`Set Construction Status to "${changes.constructionStatus}"`);
  }
  if (changes.salesStatus) {
    descriptions.push(`Set Sales Status to "${changes.salesStatus}"`);
  }
  if (changes.purchaserType) {
    descriptions.push(`Set Purchaser Type to "${changes.purchaserType}"`);
  }
  if (changes.partV !== undefined) {
    descriptions.push(`Set Part V to "${changes.partV ? "Yes" : "No"}"`);
  }
  if (changes.bcmsReceived !== undefined) {
    descriptions.push(`Set BCMS Received to "${changes.bcmsReceived ? "Yes" : "No"}"`);
  }
  if (changes.landRegistryApproved !== undefined) {
    descriptions.push(`Set Land Registry Approved to "${changes.landRegistryApproved ? "Yes" : "No"}"`);
  }
  if (changes.homebondReceived !== undefined) {
    descriptions.push(`Set Homebond Received to "${changes.homebondReceived ? "Yes" : "No"}"`);
  }
  if (changes.sanApproved !== undefined) {
    descriptions.push(`Set SAN Approved to "${changes.sanApproved ? "Yes" : "No"}"`);
  }
  if (changes.contractIssued !== undefined) {
    descriptions.push(`Set Contract Issued to "${changes.contractIssued ? "Yes" : "No"}"`);
  }
  if (changes.contractSigned !== undefined) {
    descriptions.push(`Set Contract Signed to "${changes.contractSigned ? "Yes" : "No"}"`);
  }
  if (changes.saleClosed !== undefined) {
    descriptions.push(`Set Sale Closed to "${changes.saleClosed ? "Yes" : "No"}"`);
  }

  return descriptions;
}

export function hasAnyChanges(changes: BulkUpdateChanges): boolean {
  return Object.values(changes).some((v) => v !== undefined);
}

export function isSensitiveChange(changes: BulkUpdateChanges, unitCount: number): boolean {
  // Sensitive if changing sales status to Complete
  if (changes.salesStatus === "Complete") return true;

  // Sensitive if affecting more than 10 units
  if (unitCount > 10) return true;

  return false;
}

export function exportErrorsToCsv(errors: BulkUpdateError[]): void {
  if (errors.length === 0) return;

  const headers = ['Unit Number', 'Development', 'Error Type', 'Reason'];
  const rows = errors.map(e => [
    e.unitNumber,
    e.developmentName,
    e.errorType.replace(/_/g, ' '),
    `"${e.reason.replace(/"/g, '""')}"`, // Escape quotes in CSV
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `bulk-update-errors-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getErrorTypeLabel(errorType: BulkUpdateError['errorType']): string {
  const labels: Record<BulkUpdateError['errorType'], string> = {
    'unit_not_found': 'Unit Not Found',
    'invalid_status': 'Invalid Status',
    'invalid_date': 'Invalid Date',
    'storage_error': 'Storage Error',
    'validation_failed': 'Validation Failed',
    'unknown': 'Unknown Error',
  };
  return labels[errorType] || 'Unknown';
}
